import React, { Component } from 'react';
import Dimensions from 'Dimensions';
import {
	StyleSheet, TextInput, View,TouchableOpacity, Text, ImageBackground, ListView, Image,
	Platform, PermissionsAndroid, ToastAndroid,Alert, Keyboard,DeviceEventEmitter,
} from 'react-native';
import { NavigationActions } from 'react-navigation';
import {
	AudioRecorder, AudioUtils
} from 'react-native-audio';
import ImageView 			from 'react-native-image-view';
import ImageResizer 		from 'react-native-image-resizer';
import RNAudioStreamer 		from 'react-native-audio-streamer';
import OneSignal 			from 'react-native-onesignal';

import RNFetchBlob 			from 'react-native-fetch-blob'
import { firebaseApp } 		from '../firebase';
import srcLoginBackground 	from '../images/postbackground.png';
import srcAddPost 			from '../images/addpost.png';
import AudioPlayer 			from './audioPlayer';
import { connect } 			from "react-redux";


class Comment extends Component {
	constructor(props) {
		super(props);
		const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

		this.state = {
			likeAvaialbe: true,
			comment: '',
			dataSource: ds.cloneWithRows(['row 1', 'row 2']),

			isPlaying: false,
			playingRow: undefined,
			isVisible: false,
			imageWidth: 0,
			imageHeight: 0,
		}
		this.renderRow = this.renderRow.bind(this);
		this.onImageClose = this.onImageClose.bind(this);
		this.subscription = DeviceEventEmitter.addListener('RNAudioStreamerStatusChanged',this._statusChanged.bind(this));
	}

	static navigationOptions = {
		header: null
	};

	_statusChanged(status) {
		if(status == 'FINISHED') {
			this.setState({
				playingRow: undefined,
				isPlaying: false,
			})
		}

	}

	componentDidMount() {
		
		firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('likeUsers').on('value', (snap) => {
            snap.forEach((child) => {
				if(child.val().userId == firebaseApp.auth().currentUser.uid) {

					this.setState({
						likeAvaialbe: false,
						isPlaying: false,
					})
				}
            });
		});

		firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('commentUsers').on('value', (snap) => {
            var workshops = [];
            snap.forEach((child) => {
				workshops.push({
					comment: child.val().comment,
					commentTime: child.val().commentTime,
					FullName: child.val().FullName,
					recordName: child.val().recordName,
				});
            });
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(workshops)
            });
		});
	}

	onImageClose() {
		this.setState({
			isVisible: false,
		})
	}
	renderRow(item, sectionId, rowId){
        return(
			<View style={{backgroundColor: 'whitesmoke', marginLeft: 10, marginBottom: 10}}>
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<Text style={{fontSize: 14, color: 'black'}}>{item.FullName}</Text>
					<Text style={{fontSize: 10, color: 'grey', marginLeft: 10}}>{item.commentTime}</Text>
				</View>
				{
					item.recordName ?
						<View style={{flexDirection: 'row', justifyContent: 'center', alignItems:'center',marginBottom: 5}}>
							{
								rowId == this.state.playingRow ?
									<Text style={{fontSize: 16, color: 'black',}}>{(this.state.isPlaying == true) ? 'Stop' : 'Play'}</Text>
									:
									<Text style={{fontSize: 16, color: 'black',}}>Play</Text>
							}
							<TouchableOpacity style={{marginLeft: 10}} 
								onPress = {() => {
									if(rowId == this.state.playingRow && this.state.isPlaying == true)
									{
										RNAudioStreamer.pause();
										this.setState({
											isPlaying: false,
										})
										return;
									}

									RNAudioStreamer.setUrl(item.comment);
									RNAudioStreamer.play()
									
									this.setState({
										playingRow: rowId,
										isPlaying: true,
									})
							}}>
							
								<ImageBackground source={ (rowId == this.state.playingRow && this.state.isPlaying == true) ? require('../images/stop-button.png') : require('../images/play-button.png')} style={{height: 22, width: 22}}/>	
							</TouchableOpacity>
						</View>
					:
					<Text style={{fontSize: 12, color: 'black', marginLeft: 10}}>"{item.comment}"</Text>
				}
			</View>
			
        );
	}
	addZero = (i) =>{
		if(i < 10){
			i = '0' + i;
		}
		return i;
	}
	render() {
        const { navigate } = this.props.navigation;
        const { state } = this.props.navigation;
        const backAction = NavigationActions.back({
			key: null
		})
		return (
			<View style={[styles.container, style = {marginHorizontal: 5,}]}>
				<View style={{height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginHorizontal: 20}} >
					<TouchableOpacity
						onPress = {() => {

							RNAudioStreamer.pause();
							this.props.navigation.dispatch(backAction);
					}}>
						<ImageBackground source={require('../images/backbtn.png')} style={{height: 40, width: 40}}/>	
					</TouchableOpacity>
					<Text style = {{fontSize: 32, backgroundColor: 'transparent', color: 'black', }}>Shout!</Text>
				</View>
				<View style = {{flex: 2,}}>
					<View style = {{flex: 4, }}>
						<View style={{backgroundColor: 'black', flex: 4, }}>
							<TouchableOpacity
								activeOpacity={1}
								style={{flex: 1,}}
								onPress = {() => {
									Image.getSize(state.params.downloadUrl, (width, height) => {
										this.setState({
											isVisible: true,
											imageWidth: 250,
											imageHeight: 250 * height / width,
										})
									  }, (error) => {
										this.setState({
											isVisible: true,
											imageWidth: 250,
											imageHeight: 250
										})
									  });
								}}>
								<ImageBackground source={{uri: state.params.downloadUrl}} style={{flex: 1}}/>
							</TouchableOpacity>
						</View>
						<View style={{backgroundColor: 'whitesmoke',flex: 0.8, alignItems: 'center',}}>
							<Text numberOfLines={1} style={{fontSize: 18}}>{state.params.shoutTitle}</Text>
							<View style = {{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
								<Text style={{fontSize: 12, color: 'darkgray', }}>{state.params.userName}, {state.params.date}</Text>
								<TouchableOpacity style={{marginLeft: 20, }} disabled = {!this.state.likeAvaialbe}
									onPress = {() => {
										var userId = firebaseApp.auth().currentUser.uid;
										firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('likeUsers').push({
											userId,
										})
										var likes;
										firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('likes').once('value')
										.then((snapshot) => {
											likes = snapshot.val();
											likes ++;
											firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).update({
												likes: likes,
											})
											ToastAndroid.show('You have liked this Shout!', ToastAndroid.SHORT);
										})
										.catch((error) => {
										})
									}}>
									{
									this.state.likeAvaialbe ?
										<ImageBackground source={require('../images/heart.png')} style={{height: 30, width: 30}}/>
										:
										<ImageBackground source={require('../images/heartdisabled.png')} style={{height: 30, width: 30}}/>
									}
								</TouchableOpacity>
								{this.props.navigation.state.params.voiceTitle != undefined ?
								<TouchableOpacity style={{marginLeft: 10}} 
									onPress = {() => {

										if(this.state.playingRow == undefined && this.state.isPlaying == true)
										{
											RNAudioStreamer.pause();
											this.setState({
												isPlaying: false,
											})
											return;
										}

										RNAudioStreamer.setUrl(this.props.navigation.state.params.voiceTitle);
										RNAudioStreamer.play()
										
										this.setState({
											playingRow: undefined,
											isPlaying: true,
										})
								}}>
								<ImageBackground source={(this.state.isPlaying == true && this.state.playingRow == undefined) ? require('../images/stop-button.png') : require('../images/play-button.png')} style={{height: 22, width: 22}}/>
								</TouchableOpacity>
								:
								null
							}
							</View>
						</View>
					</View>
					<View style = {{flex: 3, }}>
						<View style = {{flex: 3.5, marginTop: 10}}>
							<ListView
								dataSource={this.state.dataSource}
								renderRow={this.renderRow}
								enableEmptySections={true}
							/>
						</View>	
						<View style={{flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent:'center', marginVertical: 5}}>
							<TextInput //source={usernameImg}
								style={styles.input}
								placeholder={this.props.recording}
								placeholderTextColor='grey'
								autoCapitalize={'none'}
								returnKeyType={'done'}
								autoCorrect={false}
								underlineColorAndroid='transparent'
								onChangeText={(text) => this.setState({ comment: text })}
								value={this.state.comment}
							/>
							{
							this.state.comment == '' ?
								<AudioPlayer postName = {this.props.navigation.state.params.postName} groupName = {this.props.navigation.state.params.groupName} postUserName = {this.props.navigation.state.params.userName} myName = {this.props.fullName}/>
								:
								<TouchableOpacity
									onPress = {() => {
										var userId = firebaseApp.auth().currentUser.uid;
										var d = new Date();
										var commentTime = d.toLocaleTimeString() + ' at '+ d.toDateString();
										firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('commentUsers').push({
											userId: userId,
											FullName: this.props.fullName,
											comment: this.state.comment,
											commentTime: commentTime,
										})
										ToastAndroid.show('You have commented on this Shout!', ToastAndroid.SHORT);
										this.setState({ comment: '' })
										Keyboard.dismiss();
										var comments;
										firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).child('comments').once('value')
										.then((snapshot) => {
											comments = snapshot.val();
											comments ++;
											firebaseApp.database().ref('/posts/').child(this.props.navigation.state.params.groupName).child(this.props.navigation.state.params.postName).update({
												comments: comments,
											})
											.then(() => {
												firebaseApp.database().ref().child('playerIds').on('value', (snap) => {
													snap.forEach((child) => {
														if(child.val().fullName == this.props.navigation.state.params.userName) {
															fetch('https://onesignal.com/api/v1/notifications', {  
																method: 'POST',
																headers: {
																	'Content-Type': 'application/json',
																	"Authorization": "Basic NzliM2FkMzItYmViNy00ZmFkLTg1MTUtNjk1MTllNGFjNGQ2"
																},
																body: JSON.stringify({
																	app_id: "1198e53e-f4a9-4d2d-abe2-fec727b94e11",
																	include_player_ids: [child.key],
																	data: {
																		'nfType': 'nf_comment',
																		'postName':  this.props.navigation.state.params.postName, 
																		'downloadUrl': this.props.navigation.state.params.downloadUrl, 
																		'shoutTitle': this.props.navigation.state.params.shoutTitle, 
																		'userName': this.props.navigation.state.params.userName, 
																		'date': this.props.navigation.state.params.date, 
																		'voiceTitle': this.props.navigation.state.params.voiceTitle, 
																		'groupName': this.props.navigation.state.params.groupName,
																		'groupKey': this.props.navigation.state.params.groupKey,
																	},
																	headings:{"en": "A new comment on your shout"},
																	contents: {'en': this.props.fullName + ' commented'},
																})
															})
														}
													});
												});
											})
										})
										.catch((error) => {
										})
									}}>
									<ImageBackground source={require('../images/postshout.png')} style={{ height: 50, width: 50}}/>
								</TouchableOpacity>
							}
						</View>
					</View>
				</View>
				
				<ImageView
					source={{uri: state.params.downloadUrl}}
					imageWidth={this.state.imageWidth}
					imageHeight={this.state.imageHeight}
					isVisible={this.state.isVisible}
					onClose={this.onImageClose}
				/>
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
		backgroundColor: 'silver',
		padding: 0,
		paddingLeft:20,
		fontSize: 16,
		color: 'black',
		width: 220,
		height: 40,
		borderRadius: 20,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 40,
		width: 40,
	},
});

function mapStateToProps(state) {
	return {
	  recording: state.getAppInfo.recording,
	  fullName: state.getUserInfo.fullName,
	};
}

export default connect(mapStateToProps)(Comment)