import 'react-native-gesture-handler';
import React, {Component, useState} from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Text,
    Image,
    View,
    TextInput,
    ScrollView,
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
                <Stack.Screen name="login" component={login}/>
                <Stack.Screen name="home" component={home}/>
                <Stack.Screen name="track" component={track}/>
                <Stack.Screen name="playlist" component={playlist}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}


function login({navigation}) {
    const CLIENT_ID = '34ca0492a0054c57a053f785f812aeb5';
    const [userInfo, setUserInfo] = useState(null);
    const [didError, setDidError] = useState(false);
    const [token, setToken] = useState("");

    const handleSpotifyLogin = async () => {
        let redirectUrl = AuthSession.getRedirectUrl();
        let results = await AuthSession.startAsync({
            authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=user-read-email&response_type=token`
        });
        if (results.type !== 'success') {
            console.log(results.type);
            setDidError(true);
        } else {
            setToken(results.params.access_token);
            const userInfo = await axios.get(`https://api.spotify.com/v1/me`, {
                headers: {
                    "Authorization": `Bearer ${results.params.access_token}`
                }
            });
            setUserInfo(userInfo.data);
            console.log(results.params.access_token);
        }
    };
    const displayError = () => {
        return (
            <View style={styles.userInfo}>
                <Text style={styles.errorText}>
                    There was an error, please try again. Fucm rhsbgsdlfgnrld
                </Text>
            </View>
        );
    };

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
                        Login to Spotify to see user data.
                    </Text>
                </View>
            )
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.button}
                onPress={userInfo ? () => {
                    navigation.navigate("home", {token})
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

function home({route, navigation}) {
    const token = 'BQCDW1_6LpNoC7zpHebq_rY8eKqJgtTyFRHCwV4A8YwmjfBFT_ITlX15bDjijFqaQ_sAkMHW4N8P19p3gJh3vNZoyOmQbUUUDtOwelC1vwqbTJPGN-oRsbP-dLvGbjL6cDq-jYS01wB0ZtC9gJC9L7b0u35XxvWAJekM';
    const [value, setValue] = useState("");
    let [search, setSearch] = useState([]);


    async function startSearch(text) {
        const fetch = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(text)}&type=track&limit=1`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (fetch.data !== undefined) {
            let searchData = [];
            const {items} = fetch.data.tracks;
            for (let i = 0; i < 1; i++) {
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

    return (
        <View>
            <TextInput
                style={{height: 40, borderColor: 'gray', borderWidth: 1}}
                onChangeText={text => {
                    setValue(text);
                    if (text !== "") {
                        startSearch(text).then(() => {
                            console.log(search);
                        })
                    }
                }}
                value={value}/>
            <ScrollView style={styles.container2}>
                <FlatList
                    data={search}
                    extraData={value}
                    renderItem={({item}) =>
                        <TouchableOpacity
                            style={styles.list}
                            onPress={() => navigation.navigate("track", {item, token})}>
                            < Text> {item.name}</Text>
                        </TouchableOpacity>}
                    keyExtractor={item => item.name}
                />
            </ScrollView>
        </View>
    )
}

function track({route, navigation}) {
    const {item} = route.params;
    const {token} = route.params;
    const [player, setPlayer] = useState(new Audio.Sound());

    const [playing, pressed] = useState(false);

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

    return (
        <View>
            <Text>Image goes here</Text>
            <Image style={{width: 300, height: 300}} source={{
                uri: item.image.url
            }}/>
            <Text>item.name</Text>
            <Text>item.artist</Text>
            <Text>item.album</Text>
            <Icon reverse name={playing ? "pause" : "play-arrow"}
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
            <Icon reverse name="add"
                  onPress={() => {
                      navigation.navigate("playlist", {token:token, song:item})
                  }}/>


        </View>
    );

}

function playlist({route, navigation}) {
    const {song} = route.params;
    const {token} = route.params;
    const [playlist, setPlaylist] = useState([]);
    let [tracks, setTracks] = useState([]);
    let [more, setMore] = useState([]);


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

    async function getPlayListItems(id, index) {
        for (let j=0; j<playlist.length; j++) {
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
                data.push(fetch.data.items[i].track.name)
            }
            setTracks(data);
        }


    }

    async function addItemToPlaylist(index){

        try {
            const fetch = await axios.post(`https://api.spotify.com/v1/playlists/${playlist[index].id}/tracks?uris=${song.ID}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": `application/json`
                },

            });
        }
        catch(e){
            console.log(e);
        }
        await getPlayListItems(playlist[index].id,index);
    }

    React.useEffect(() => {
        getPlaylist().then();
    }, []);
    return (
        <View>
            <FlatList data={playlist}
                      extraData={tracks}
                      renderItem={({item, index}) => (<TouchableOpacity
                      onPress={()=>{addItemToPlaylist(index).then()}}><View>
                          <Text>{item.name}<Icon
                              name='add'
                              onPress={() => {
                                  getPlayListItems(item.id, index).then();
                              }}/>
                          </Text></View>
                          <FlatList data={tracks} renderItem={({item}) =>{
                              // if(more[index]){return(<View><Text>{item}</Text>></View>)}
                              {return(<View><Text>u</Text></View>);}
                          } }
                                    keyExtractor={item => item}/>

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
