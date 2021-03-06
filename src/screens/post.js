import React, { Component } from 'react';
import Dimensions from 'Dimensions';
import {
	StyleSheet, TextInput, View, TouchableOpacity, Text, ImageBackground, Image, ListView,
	Platform,	PermissionsAndroid, ToastAndroid, BackHandler
} from 'react-native';
import { connect } from "react-redux";
import { NavigationActions } 		from 'react-navigation';
import {AudioRecorder, AudioUtils} 	from 'react-native-audio';
import Sound 			from 'react-native-sound';
import ImagePicker 		from 'react-native-image-picker';
import Spinner 			from 'react-native-loading-spinner-overlay';
import OneSignal 		from 'react-native-onesignal';
import RNFetchBlob 		from 'react-native-fetch-blob';
import ImageResizer 	from 'react-native-image-resizer';

import { firebaseApp } 		from '../firebase';
import srcLoginBackground 	from '../images/postbackground.png';
import store 				from '../store';
import TitlePlayer			from './titlePlayer';

class Post extends Component {
	constructor(props) {
		super(props);
		
		this.state = {
			shoutTitle: null,
			userName: '',
			isUploading: false,
			isPlaying: false,
			originImage: '',
			thumbnail: null,
			width: null,
			height: null,
		};
	}

	static navigationOptions = {
		header: null
	};

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.onBackPress.bind(this));
	}

	componentDidMount() {
		BackHandler.addEventListener('hardwareBackPress', this.onBackPress.bind(this));
		this.setState({
			userName: store.getState().getUserInfo.fullName,
		})
	}

	onBackPress() {
		if(currentSound != null) {
			currentSound.stop();
		}
	}
	addZero = (i) =>{
		if(i < 10){
			i = '0' + i;
		}
		return i;
	}

	postShout () {
		var date = new Date();
		var uploadName = 'post' + 
			date.getUTCFullYear().toString() + '_' +
			this.addZero(date.getUTCMonth()) +	 '_' +
			this.addZero(date.getUTCDate()) + '_' +
			this.addZero(date.getUTCHours()) + '_' +
			this.addZero(date.getUTCMinutes()) + '_' +
			this.addZero(date.getUTCSeconds()) + '_' +
			this.addZero(date.getUTCMilliseconds());
		var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
			"July", "Aug", "Sep", "Oct", "Nov", "Dec"
		];
		var postDate = date.getDate().toString() + 'th of ' + monthNames[date.getMonth()];

		new Promise((resolve, reject) => {
			if(this.state.thumbnail == null) {
				resolve(null);
			}
			const image = Platform.OS === 'ios' ? this.state.thumbnail.replace('file://', '') : this.state.thumbnail;
			const Blob = RNFetchBlob.polyfill.Blob
			const fs = RNFetchBlob.fs
			window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
			window.Blob = Blob
		
			let uploadBlob = null
			const imageRef = firebaseApp.storage().ref('images').child(uploadName + '.jpg')
			let mime = 'image/jpg'
			fs.readFile(image, 'base64')
				.then((data) => {
				return Blob.build(data, { type: `${mime};BASE64` })
			})
			.then((blob) => {
				uploadBlob = blob
				return imageRef.put(blob, { contentType: mime })
				})
			.then(() => {
				uploadBlob.close()
				return imageRef.getDownloadURL();
			})
			.then((url) => {
				resolve(url);
			})
			.catch((error) => {
			})
		})
		.then((url) => {
			var email = firebaseApp.auth().currentUser.email;
			var userId = firebaseApp.auth().currentUser.uid;
			var date = new Date();
			var lastModified = date.getUTCFullYear().toString() + '_' +
			this.addZero(date.getUTCMonth()) +	 '_' +
			this.addZero(date.getUTCDate()) + '_' +
			this.addZero(date.getUTCHours()) + '_' +
			this.addZero(date.getUTCMinutes()) + '_' +
			this.addZero(date.getUTCSeconds()) + '_' +
			this.addZero(date.getUTCMilliseconds());

			firebaseApp.database().ref('posts/').child(this.props.navigation.state.params.groupName).child(uploadName).set({
				filename: uploadName + '.jpg',
				downloadUrl: url,
				userName: this.state.userName,
				shoutTitle: this.state.shoutTitle,
				comments: 0,
				likes: 0,
				date: postDate,
				playerIds: this.props.playerIds,
				userId: userId,
				email: email,
				lastModified: lastModified,
			})
			.then(() => {
				if(Platform.OS === 'android')
					ToastAndroid.show('Your shout has been posted successfully', ToastAndroid.LONG);
				this.setState({
					isUploading: false,
				})
			})
			firebaseApp.database().ref('groups').child(this.props.navigation.state.params.groupKey).update({
				thumbLink : url,
				lastModified: lastModified,
			})
			firebaseApp.database().ref('users').child(userId).child('shouts').once('value', (snap) => {
				var shouts = snap.val();
				shouts ++;
				firebaseApp.database().ref('users').child(userId).update({
					shouts,
					lastActivity: date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear(),
				})
			})
			
			var voiceTitle = undefined;

			new Promise((resolve, reject) => {
				const recordName = uploadName + '.aac';
				const image = this.props.titleRecordPath;
				const Blob = RNFetchBlob.polyfill.Blob
				const fs = RNFetchBlob.fs
				window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
				window.Blob = Blob
			
				let uploadBlob = null
				const imageRef = firebaseApp.storage().ref('records').child(recordName)
				let mime = 'audio/aac'
				fs.readFile(image, 'base64')
					.then((data) => {
					return Blob.build(data, { type: `${mime};BASE64` })
				})
				.then((blob) => {
					uploadBlob = blob
					return imageRef.put(blob, { contentType: mime })
					})
				.then((snapshot) => {
					uploadBlob.close()
					return imageRef.getDownloadURL();
				})
				.then((url) => {
					firebaseApp.database().ref('posts/').child(this.props.navigation.state.params.groupName).child(uploadName).update({
						voiceTitle: url,
					})
					resolve(url);
				})
				.catch((error) => {
					reject(error);
				})
			}).
			then((url) => {
				voiceTitle = url;
			})

			var allowedUsers = [];
			var promises = [];
			firebaseApp.database().ref().child('groups').child(this.props.navigation.state.params.groupKey).child('privacy').on('value', (snap) => {
				snap.forEach((child) => {
					promises.push(new Promise((resolve, reject) => {
						firebaseApp.database().ref().child('users').child(child.val().userId).child('playerIds').on('value', (snap) => {
							allowedUsers.push(snap.val());
							resolve();
						})
					}));
				})
				
				Promise.all(promises).then(() => {
					if(allowedUsers.length == 0) {
						fetch('https://onesignal.com/api/v1/notifications', {  
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								"Authorization": "Basic NzliM2FkMzItYmViNy00ZmFkLTg1MTUtNjk1MTllNGFjNGQ2"
							},
							body: JSON.stringify({
								app_id: "1198e53e-f4a9-4d2d-abe2-fec727b94e11",
								included_segments: ["All"],
								data: {
									'nfType': 'nf_gotoPost',
									"groupKey": this.props.navigation.state.params.groupKey, 
									"groupName": this.props.navigation.state.params.groupName,
									"groupCreator": this.props.navigation.state.params.groupCreator,
									'postName':  uploadName,
									'downloadUrl': url, 
									'shoutTitle': this.state.shoutTitle, 
									'userName': this.state.userName, 
									'date': postDate, 
									'voiceTitle': voiceTitle, 
								},
								headings:{"en": "New Post"},
								contents: {"en": this.state.userName + ' just shouted!'},
							})
						})
					}
					if(allowedUsers.length > 0) {
						fetch('https://onesignal.com/api/v1/notifications', {  
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								"Authorization": "Basic NzliM2FkMzItYmViNy00ZmFkLTg1MTUtNjk1MTllNGFjNGQ2"
							},
							body: JSON.stringify({
								app_id: "1198e53e-f4a9-4d2d-abe2-fec727b94e11",
								include_player_ids: allowedUsers,
								data: {
									'nfType': 'nf_gotoPost',
									"groupKey": this.props.navigation.state.params.groupKey, 
									"groupName": this.props.navigation.state.params.groupName,
									"groupCreator": this.props.navigation.state.params.groupCreator,
									'postName':  uploadName,
									'downloadUrl': url, 
									'shoutTitle': this.state.shoutTitle, 
									'userName': this.state.userName, 
									'date': postDate, 
									'voiceTitle': voiceTitle, 
								},
								headings:{"en": "New Post"},
								contents: {"en": this.state.userName + ' just shouted!'},
							})
						})
					}
					this.props.navigation.goBack();
				}) 
			})
			
		})
	}

	render() {
		const { navigate } = this.props.navigation;
		const options = {
			title: '',
			storageOptions: {
			  skipBackup: true,
			  path: 'images'
			}
		};
		return (
			<View style={styles.container} >
				<Spinner visible={this.state.isUploading} textContent={"Uploading..."} textStyle={{color: '#FFF'}} />
			
				<View style={{height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginTop: 5, marginHorizontal: 20}} >
					
					<TouchableOpacity
						style={{height: 40, width: 40, alignItems: 'center', justifyContent: 'center'}}
						onPress = {() => {
							if(currentSound != null)
							{
								currentSound.stop();
							}
							this.props.navigation.goBack();
						}}>
						<Image source={require('../images/backbtn.png')} style={{height: 20, width: 20}}/>	
					</TouchableOpacity>
					<Text style = {{fontSize: 32, backgroundColor: 'transparent', color: 'black',}}>Shout Now</Text>
				</View>
				<View style={{flex: 3, paddingHorizontal: 10}}>
					<TouchableOpacity 
						style={[this.state.thumbnail == null ? styles.button : null, style={backgroundColor: 'black',flex: 4}]}
						onPress = {() => {
							ImagePicker.showImagePicker(options, (response) => {
								console.log('Response = ', response);
								
								if (response.didCancel) {
									console.log('User cancelled image picker');
								}
								else if (response.error) {
									console.log('ImagePicker Error: ', response.error);
								}
								else if (response.customButton) {
									console.log('User tapped custom button: ', response.customButton);
								}
								else {
									let rotation = 0;
									if ( response.originalRotation === 90 && response.uri.indexOf('com.socialcommunityapp.provider') > 0) {
										rotation = 90
									}
									ImageResizer.createResizedImage(response.uri, 1024, 1024, 'JPEG', 100, rotation)
									.then(({uri}) => {
											this.setState({
											thumbnail: uri
										})
									}).catch((err) => {
										this.setState({
												thumbnail: null,
										})
									});
									this.setState({
										originImage: response.uri,
									})
								}
							});	
						}}>
						{
						this.state.thumbnail == null ?
							<Image source={require('../images/addimage.png')} style={{height: 60, width: 60}}/>
							:
							<Image source={{uri: this.state.originImage}} style={{flex: 1,borderWidth: 3, borderColor: 'black'}}/>
						}
					</TouchableOpacity>
					<View style={{backgroundColor: 'whitesmoke', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent:'center', }}>
						<TextInput //source={usernameImg}
							style={styles.input}
							placeholder='Write your shout title here...'
							autoCapitalize={'none'}
							returnKeyType={'done'}
							autoCorrect={false}
							placeholderTextColor='black'
							underlineColorAndroid='transparent'
							maxLength = {30}
							onChangeText={(text) => this.setState({ shoutTitle: text })}/>
					</View>
				</View>
				<View style={{flex: 2, justifyContent: 'center', paddingHorizontal: 20}}>
					<View style = {{flex: 1}}>
						<Text style = {{fontSize: 14, backgroundColor: 'transparent', color: 'black',}}>Shout out louder with your voice</Text>
					</View>
					<View style = {{flex: 3, alignItems: 'center'}}>
						<TitlePlayer />
					</View>
					<View style={{flexDirection: 'row', flex: 3, alignItems: 'center', justifyContent: 'center'}}>
						<TouchableOpacity 
							onPress = {() => {
								if(this.props.titleRecordPath == '')
									return;
								if(currentSound != null)
								{
									currentSound.stop();
									currentSound.release();
									currentSound = null;
									this.setState({
										isPlaying: false,
									})
									return;
								}
								
								this.setState({
									isPlaying: true,
								})
								const sound = new Sound(this.props.titleRecordPath, '', error => callback(error, sound));
							
								const callback = (error, sound) => {
									if (error) {
										return;
									}
									currentSound = sound;
									sound.play(() => {

										this.setState({
											isPlaying: false,
										})
										currentSound = null;
										sound.release();
									});
								};
							}}>
							{
								this.state.isPlaying == false ?
									<Image source={require('../images/play-button.png')} style={{width: 24, height: 24, }}/>
									:
									<Image source={require('../images/stop-button.png')} style={{width: 24, height: 24, }}/>
							}
						</TouchableOpacity>
						<View style={{height: 1, flex: 1, marginHorizontal: 20, backgroundColor: 'black'}}></View>
						<TouchableOpacity 
							style={{}}
							onPress = {() => {
								
							}}>
							<Image source={require('../images/multiply.png')} style={{width: 24, height: 24, }}/>
						</TouchableOpacity>
					</View>
					<View style={{flexDirection: 'row', flex: 2, justifyContent: 'space-between',}}>
						<TouchableOpacity 
							style={[styles.button, {marginTop: 5,}]}
							onPress = {() => {
								this.props.navigation.goBack();
							}}>
							<Image source={require('../images/multiply.png')} style={{width: 24, height: 24,}}/>
							<Text style = {{fontSize: 18, backgroundColor: 'transparent', color: 'black',}}>CANCEL</Text>
						</TouchableOpacity>
						<TouchableOpacity 
							style={[styles.button, {marginTop: 5,}]}
							onPress = {() => {
								if( this.state.shoutTitle == null )
								{
									alert("Fill required fields.");
									return;
								}
								this.setState({
									isUploading: true,
								})
								this.postShout();
								
								setTimeout(() => {
									this.setState({
										isUploading: false,
									})
								}, 10000);
								
							}}>
							<Image source={require('../images/megaphone.png')} style={{width: 32, height: 32, }}/>
							<Text style = {{fontSize: 18, backgroundColor: 'transparent', color: 'black',}}>SHOUT!</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}
}

const currentSound = null;
const DEVICE_WIDTH = Dimensions.get('window').width;
const DEVICE_HEIGHT = Dimensions.get('window').height;
const MARGIN = 40;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'aliceblue',
	},
	input: {
		padding: 0,
		paddingLeft:20,
		fontSize: 18,
		color: 'black',
		borderRadius: 20,
		width: 250,
		height: 40,
	},
	button: {
		flexDirection: 'row',
		justifyContent:'center',
		alignItems: 'center',
	},
	text: {
		color: 'black',
		backgroundColor: 'transparent',
		fontSize: 32,
		fontWeight: 'normal'
	},
});

function mapStateToProps(state) {
	return {
	  playerIds: state.getUserInfo.playerIds,
	  titleRecordPath: state.getAppInfo.titleRecordPath,
	};
}

export default connect(mapStateToProps)(Post)