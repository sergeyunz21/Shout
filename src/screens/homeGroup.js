import React, { Component } from 'react';
import {
	StyleSheet, View,TouchableOpacity, Text, TextInput, Image, ListView
} from 'react-native';
import { NavigationActions } from 'react-navigation';
import OneSignal 	from 'react-native-onesignal';

import { connect } from "react-redux";
import { firebaseApp } 		from '../firebase'
import store from '../store'

const group = store.getState().getUserInfo.group;
const groupCount = store.getState().getUserInfo.group.length;

class HomeGroup extends Component {
	constructor(props) {
        super(props);
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        
        this.state = {
            dataSource: ds.cloneWithRows(['row 1', 'row 2']),
            
            groups: [],
            groupImage: [],
        }
        this.renderRow = this.renderRow.bind(this);
	}

	static navigationOptions = {
		header: null
    };
    
	componentWillMount() {
        var userId = firebaseApp.auth().currentUser.uid;
		firebaseApp.database().ref('playerIds/').child(this.props.playerIds).set({
            fullName: this.props.fullName,
            userId: userId,
        })
        
		firebaseApp.database().ref('users/').child(userId).update({
            playerIds: this.props.playerIds,
        })
            firebaseApp.database().ref().child('groups').on('value', (snap) => {
                var groups = [];
                snap.forEach((child) => {
                    let isGroup = false;
                    
                    firebaseApp.database().ref().child('groups').child(child.key).child('privacy').on('value', (snap) => {
                        snap.forEach((child) => {
                            if(child.val().userId == userId)
                            {
                                isGroup = true;
                            }
                        })
                    })
                    if(child.val().privacy == undefined || isGroup == true) {
                        groups.push({
                            lastModified: child.val().lastModified,
                            groupKey: child.key,
                            groupName: child.val().groupName,
                            thumbLink: child.val().thumbLink,
                            groupCreator: child.val().groupCreator,
                        });
                    }
                })
                
                groups.sort(function(a, b){
                    if(a.lastModified != undefined && b.lastModified == undefined) return -1;
                    if(a.lastModified == undefined && b.lastModified != undefined) return 1;
                    if(a.lastModified == undefined && b.lastModified == undefined) return 0;
                    if(a.lastModified < b.lastModified) return 1;
                    if(a.lastModified > b.lastModified) return -1;
                    return 0;
                });
                
                groups.push({
                    groupName: 'lastOneGroup',
                })
                console.log(groups);
                this.setState({
                    dataSource: this.state.dataSource.cloneWithRows(groups)
                });
        })
    }
    renderRow(item, sectionId, rowId){
        return(
            <View style={{marginBottom : 30, alignItems: 'center'}}>
            {
                item.groupName != 'lastOneGroup' ?
                    <TouchableOpacity style={{backgroundColor: 'black', justifyContent:'center', alignItems:'center', width: 200, height: 100}}
                        onPress = {() => {
                            if(item.groupName != undefined && item.groupKey != undefined)
                                this.props.navigation.navigate('home', {groupName: item.groupName, groupKey: item.groupKey, groupCreator: item.groupCreator});
                        }}>
                        {
                            item.thumbLink != undefined ?
                                <Image source={{uri: item.thumbLink}} style={{height: 100, width: 200, justifyContent:'center', alignItems:'center'}}>
                                    <Text style = {{fontSize: 22, backgroundColor: 'transparent', color: 'white', marginLeft: 10}}>{item.groupName}</Text>
                                </Image>
                                :
                                <Text style = {{fontSize: 22, backgroundColor: 'transparent', color: 'white', marginLeft: 10,}}>{item.groupName}</Text>
                        }
                    </TouchableOpacity>
                    :
                    <TouchableOpacity 
                        onPress = {() => {
                        this.props.navigation.navigate('newGroup', {title: 'Adding New Group', groupName: undefined, privacy: 'public', isEdit: false,});

                    }}>
                        <Image source={require('../images/addgroup.png')} style={{height: 100, width: 200, }}/>
                    </TouchableOpacity>
            }
        </View>
        );
    }
	render() {
        const { navigate } = this.props.navigation;
        
		return (
			<View style={[styles.container, style = {marginHorizontal: 5,}]}>
				<View style={{height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginTop: 5, marginHorizontal: 20}} >
					<TouchableOpacity
						onPress = {() => {
							navigate('DrawerOpen');
						}}>
						<Image source={require('../images/menu.png')} style={{height: 40, width: 40}}/>	
					</TouchableOpacity>
					<Text style = {{fontSize: 32, backgroundColor: 'transparent', color: 'black',}}>Shout Groups</Text>
				</View>
                {
                    /*
                <View style={{flexDirection: 'row', marginTop: 20, marginHorizontal: 20, alignItems: 'center'}}>
                    <TextInput
                        style={styles.input}
                        placeholder='Search for groups...'
                        autoCapitalize={'none'}
                        returnKeyType={'done'}
                        autoCorrect={false}
                        placeholderTextColor='grey'
                        underlineColorAndroid='transparent'
                        onChangeText={(text) => this.setState({ shoutTitle: text })}>
                    </TextInput>
                    <Image source={require('../images/search.png')} style={{width: 24, height: 24, marginLeft: -32, marginRight: 8}}/>
                </View>
                */
                }
                <Text style = {styles.text}>Shout Groups</Text>
                <View style={{flex: 1, marginTop: 50, }}>
                    <ListView
                        dataSource={this.state.dataSource}
                        renderRow={this.renderRow}
                        enableEmptySections={true}
                    />
                </View>
			</View>
		);
	}
}



const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'aliceblue',
	},
	input: {
        flex: 1,
        padding: 0,
        paddingVertical: 5,
        paddingLeft: 10,
        paddingRight: 40,
		fontSize: 18,
		color: 'black',
        borderRadius: 5,
        borderColor: 'black',
        borderWidth: 1,
    },
    text: {
        fontSize: 24, 
        backgroundColor: 'transparent', 
        color: 'black',
        marginTop: 20,
        marginHorizontal: 20,
        borderBottomWidth: 1,
    }
});


function mapStateToProps(state) {
	return {
	    playerIds: state.getUserInfo.playerIds,
        fullName: state.getUserInfo.fullName,
	};
}

export default connect(mapStateToProps)(HomeGroup);