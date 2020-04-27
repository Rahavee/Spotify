import 'react-native-gesture-handler';
import React, {Component, useState} from 'react';
import {TouchableOpacity, StyleSheet, Text, View, TextInput, ScrollView, FlatList} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import {NavigationContainer} from "@react-navigation/native";
import {createStackNavigator} from "@react-navigation/stack";
import axios from 'axios';


const Stack = createStackNavigator();

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
            setToken(results);
            const userInfo = await axios.get(`https://api.spotify.com/v1/me`, {
                headers: {
                    "Authorization": `Bearer ${results.params.access_token}`
                }
            });
            setUserInfo(userInfo.data);
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
                } : handleSpotifyLogin}
            >
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
    const {token} = route.params;
    const [value, setValue] = useState("");
    let [search, setSearch] = useState([]);

    async function startSearch(text) {
        const fetch = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(text)}&type=track&limit=5`, {
            headers: {
                "Authorization": `Bearer ${token.params.access_token}`
            }
        });
        if (fetch.data !== undefined) {
            for (let i = 0; i < 5; i++) {
                search[i]=(fetch.data.tracks.items[i].name);
            }
        }
    }
    console.log("this is new mwe");

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
                    renderItem={({item}) =>
                        <TouchableOpacity
                            style={styles.list}
                            onPress={() => navigation.navigate("track")}>
                            < Text> {item}</Text>
                        </TouchableOpacity>}
                    keyExtractor={item => item.id}
                />
            </ScrollView>
        </View>
    )
}

function track({route, navigation}) {
    return(
        <View>

        </View>
    );

}

export default function App() {

    console.log("app rendered");
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="login" component={login}/>
                <Stack.Screen name="home" component={home}/>
                <Stack.Screen name="track" component={track}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
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
