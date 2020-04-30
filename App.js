import 'react-native-gesture-handler';
import React, {useState} from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Text,
    Image,
    View,
    TextInput,
    FlatList
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import {NavigationContainer} from "@react-navigation/native";
import {createStackNavigator} from "@react-navigation/stack";
import axios from 'axios';
import {Icon} from 'react-native-elements'
import {Audio} from 'expo-av';


const Stack = createStackNavigator();
export default function App() {

    console.log("app rendered");
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Musick" component={login}/>
                <Stack.Screen name="home" component={home}/>
                <Stack.Screen name="track" component={track}/>
                <Stack.Screen name="playlist" component={playlist}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}


//This function logs in to the spotify app. The type of authentication used here is implicit grant, since I did not use any severs to go along with this app, this made the most sense to
//use without harcoding the client secret into the app.
//It authenticates using spotify, get the access token and if it fails displays a fail message and if successful displays a welcome message for the user
function login({navigation}) {
    const CLIENT_ID = '34ca0492a0054c57a053f785f812aeb5';
    const [userInfo, setUserInfo] = useState(null);
    const [didError, setDidError] = useState(false);
    const [token, setToken] = useState("");

    //scopes are user-read-email, playlist-modify-private/pubic and playlist-read-private
    const handleSpotifyLogin = async () => {
        let scopes = 'user-read-email playlist-modify-private playlist-modify-public playlist-read-private';
        let redirectUrl = AuthSession.getRedirectUrl();
        let results = await AuthSession.startAsync({
            authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scopes)}&response_type=token`
        });
        if (results.type !== 'success') {
            setDidError(true);
        } else {
            setToken(results.params.access_token);
            console.log(results);
            const userInfo = await axios.get(`https://api.spotify.com/v1/me`, {
                headers: {
                    "Authorization": `Bearer ${results.params.access_token}`
                }
            });
            setUserInfo(userInfo.data);
        }
    };

    console.log(userInfo);
    //displays error to prompts to try again
    const displayError = () => {
        return (
            <View style={styles.userInfo}>
                <Text style={styles.errorText}>
                    There was an error, please try again.
                </Text>
            </View>
        );
    };
    //displays results grabbed from the userInfo data fetched and prompts to go to app
    const displayResults = () => {
        {
            return userInfo ? (
                <View style={styles.userInfo}>
                    <Text style={styles.userInfoText}>
                        Welcome {userInfo.display_name}
                    </Text>
                </View>
            ) : (
                <View style={styles.userInfo}>
                    <Text style={styles.userInfoText}>
                        Login to Spotify
                    </Text>
                </View>
            )
        }
    };
    //returns a button and the welcome/error message
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.button}
                onPress={userInfo ? () => {
                    navigation.navigate("home", {token: token, user: userInfo.id})
                } : handleSpotifyLogin}>
                <Text style={styles.buttonText}>
                    {userInfo ? "Go to App" : "Login with Spotify"}
                </Text>
            </TouchableOpacity>
            {didError ?
                displayError() :
                displayResults()
            }
        </View>
    );
}
//this is the home screen, which displays a search bar for the user to search for a track, the program on change of text on the search bar displays the top 10
//tracks that matched the keywords fetched from spotify's API.
function home({route, navigation}) {
    const {user} = route.params;
    const {token} = route.params;
    const [value, setValue] = useState("");
    let [search, setSearch] = useState([]);

    //fetching from spotify's API the search result
    async function startSearch(text) {
        const fetch = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(text)}&type=track&limit=10`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        //pushing, the name, album, image, and other details of the tracks to a array
        if (fetch.data !== undefined) {
            let searchData = [];
            const {items} = fetch.data.tracks;
            for (let i = 0; i < 10; i++) {
                searchData.push({
                    name: items[i].name,
                    album: items[i].album.name,
                    artist: items[i].artists[0].name,
                    image: items[i].album.images[0],
                    play: items[i].preview_url,
                    ID: items[i].uri
                });
            }
            setSearch(searchData);
        }
    }
    //changing the header bar
    navigation.setOptions({
        headerTitle: "Search for Tracks"
    });
    //returns a list of the array loaded in form the API
    return (
        <View style={{flex: 1, backgroundColor: 'black'}}>
            <TextInput
                placeholder="Search for tracks here"
                style={{height: 40, borderColor: 'gray', borderWidth: 1, color: 'white', padding: 10, margin: 3}}
                onChangeText={text => {
                    setValue(text);
                    if (text !== "") {
                        startSearch(text).then(() => {
                            console.log(search);
                        })
                    }
                }}
                value={value}/>

            <FlatList
                data={search}
                extraData={value}
                renderItem={({item}) =>
                    <TouchableOpacity
                        style={styles.list}
                        onPress={() => navigation.navigate("track", {item, token, user})}>
                        < Text> {item.name}</Text>
                    </TouchableOpacity>}
                keyExtractor={item => item.ID}
            />

        </View>
    )
}
// this function displays the track information and the image of the album. If there ia a preview available to the track, there is a playable audio button. if there is none,
//it displays an alert that there is no playable audio
function track({route, navigation}) {
    const {user} = route.params;
    const {item} = route.params;
    const {token} = route.params;
    const [player, setPlayer] = useState(new Audio.Sound());
    const [playing, pressed] = useState(false);

    //loads the song into the sound object when the screen loads to prepare for the play button
    async function load() {
        console.log(item.play);
        if (item.play !== null) {
            await player.loadAsync(
                {uri: item.play}
            );
        }
    }

    React.useEffect(() => {
        load().then(console.log("Song loaded"))
    }, []);

    //Overriding the back button so that the audio stops playing when clicked on the back button.
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <Icon
                    iconStyle={{marginLeft: 8}}
                    name='arrow-back'
                    onPress={async () => {
                        if (item.play !== null) {
                            await player.stopAsync()
                        }
                        navigation.goBack();
                    }}/>
            ),
        });
    }, [navigation]);

    navigation.setOptions({
        headerTitle: "Track"
    });

    //returns image of the album, the name, artist, album and the play/pause
    return (
        <View style={{backgroundColor: 'black', flex: 1, alignItems: 'center', padding: 4}}>
            <Image style={{width: 300, height: 300}} source={{
                uri: item.image.url
            }}/>
            <Icon raised
                  name={playing ? "pause" : "play-arrow"}
                  onPress={async () => {
                      if (item.play !== null) {
                          if (playing) {
                              await player.pauseAsync();
                              pressed(!playing);
                          } else {
                              await player.playAsync();
                              pressed(!playing);
                          }
                      } else {
                          alert("No playable audio found for this track")
                      }
                  }}/>
            <Text style={{color: 'white'}}>{item.name}</Text>
            <Text style={{color: 'white'}}>Artist: {item.artist}</Text>
            <Text style={{color: 'white'}}>Album: {item.album}</Text>

            <View style={{right: 10, bottom: 10, position: 'absolute', display: 'flex', alignItems: 'center'}}><Text
                style={{color: 'white'}}>Add to playlist</Text>
                <Icon raised name="add"
                      onPress={() => {
                          navigation.navigate("playlist", {
                              token: token,
                              song: item,
                              user
                          })
                      }}/></View>


        </View>
    );

}
//This function displays a screen of playlists that the user has created or is following. when clicked on the drop down arrow it displays the tracks the playlist contains.
//the up arrow closes the drop down, clicking on the playlist will add to the playlist. This is done by using a list inside of a list
function playlist({route, navigation}) {
    const {user} = route.params;
    const {song} = route.params;
    const {token} = route.params;
    const [playlist, setPlaylist] = useState([]);
    let [tracks, setTracks] = useState([]);
    let [more, setMore] = useState([]);
    const [down, direction] = useState(false);

    //gets playlists form the user
    async function getPlaylist() {
        const fetch = await axios.get(`https://api.spotify.com/v1/me/playlists`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        let fetchedPlayList = [];
        if (fetch.data !== null) {
            for (let i = 0; i < fetch.data.items.length; i++) {
                fetchedPlayList.push({name: fetch.data.items[i].name, id: fetch.data.items[i].id, tracks: []});
            }
            setPlaylist(fetchedPlayList);
        }

    }
    //gets tracks for the specific playlist
    async function getPlayListItems(id, index) {
        for (let j = 0; j < playlist.length; j++) {
            more[j] = j === index;
        }
        const fetch = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (fetch.data !== null) {
            let data = [];
            for (let i = 0; i < fetch.data.items.length; i++) {
                data.push({name: fetch.data.items[i].track.name, id: i})
            }
            setTracks(data);
        }
    }
    //post request to add item to the specific playlist
    async function addItemToPlaylist(index) {
        try {
            await fetch(`https://api.spotify.com/v1/playlists/${playlist[index].id}/tracks?uris=${song.ID}`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": `application/json`
                },
                body: {
                    "uris": `[${song.ID}]`
                }
            });
        } catch (e) {
            console.log(e);
        }
    }
    //called once to get the playlists on the start of the screen load
    React.useEffect(() => {
        getPlaylist().then();
    }, []);

    navigation.setOptions({
        headerTitle: "Select playlist to add"
    });

    //returns flatlist inside of a flatlist. the nested flatlist only visible on the click of the button
    return (
        <View style={{backgroundColor: 'black', flex: 1}}>
            <FlatList data={playlist}
                      extraData={[tracks, down]}
                      renderItem={({item, index}) => (
                          <TouchableOpacity
                              style={{
                                  display: 'flex',
                                  flexDirection: "column",
                                  marginTop: 3,
                                  padding: 5,
                                  backgroundColor: "white"
                              }}
                              onPress={() => {
                                  addItemToPlaylist(index).then()
                              }}><View style={{display: 'flex', flexDirection: 'row'}}><Icon
                              size={50}
                              name={down && more[index] ? 'arrow-drop-up' : 'arrow-drop-down'}
                              onPress={() => {
                                  direction(!down);
                                  getPlayListItems(item.id, index).then();
                                  if (!down) {
                                      setTracks([]);
                                  }
                              }}/>
                              <Text style={{marginTop: 20,marginLeft:4, marginRight:4, color: 'black', fontWeight: 'bold'}}>{item.name}</Text></View>
                              <FlatList data={tracks} renderItem={({item}) => {
                                  if (more[index] && down) {
                                      return (<View><Text style={{marginLeft:5}}>{item.name}</Text></View>)
                                  } else {
                                      return null;
                                  }
                              }}
                                        keyExtractor={item => JSON.stringify(item.id)}/>

                          </TouchableOpacity>)}
                      keyExtractor={item => item.name}/>

        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        backgroundColor: '#000',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    button: {
        backgroundColor: '#2FD566',
        padding: 20
    },
    buttonText: {
        color: '#000',
        fontSize: 20
    },
    userInfo: {
        height: 250,
        width: 200,
        alignItems: 'center',
    },
    userInfoText: {
        color: '#fff',
        fontSize: 18
    },
    errorText: {
        color: '#fff',
        fontSize: 18
    },
    profileImage: {
        height: 64,
        width: 64,
        marginBottom: 32
    },
    container2: {
        backgroundColor: "red"
    },
    list: {
        flexDirection: "row",
        marginTop: 3,
        padding: 10,
        height: 44,
        backgroundColor: "white"

    }
});
