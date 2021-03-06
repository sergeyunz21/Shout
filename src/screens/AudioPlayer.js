import React, {Component} from 'react';

import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Platform,
    PermissionsAndroid,
    Image,
    Vibration,
    Alert,
    PanResponder,
    ToastAndroid,
    AlertIOS,
    Dimensions,
} from 'react-native';
import { connect } from "react-redux";
import {AudioRecorder, AudioUtils} from 'react-native-audio';

import RNFetchBlob 			    from 'react-native-fetch-blob'
import { firebaseApp } 		    from '../firebase';
import { getRecordingStatus }   from '../actions'
import OneSignal 			from 'react-native-onesignal';

class AudioPlayer extends Component {
    state = {
      currentTime: 0.0,
      recording: false,
      stoppedRecording: false,
      finished: false,
      audioPath: AudioUtils.DocumentDirectoryPath + '/shoutRecord.aac',
      hasPermission: undefined,
      isPressed: -1,
      comment: '',
      rightOffset: 0,
      viewSize:  52,
      imageSize: 36,
    };

    prepareRecordingPath(audioPath){
        AudioRecorder.prepareRecordingAtPath(audioPath, {
            SampleRate: 22050,
            Channels: 1,
            AudioQuality: "Low",
            AudioEncoding: "aac",
            AudioEncodingBitRate: 32000
        });
    }

	componentWillMount() {
        this._panResponder = PanResponder.create({
            // Ask to be the responder:
            onStartShouldSetPanResponder: (evt, gestureState) => true,
            onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
      
            onPanResponderGrant: (evt, gestureState) => {
              // The gesture has started. Show visual feedback so the user knows
              // what is happening!
      
              // gestureState.d{x,y} will be set to zero now
              this._record()
                    this.props.dispatch(getRecordingStatus(true));
                    Vibration.vibrate(100);
                    
                    this.setState({
                        isPressed: 1,
                    });
                    this.setState({
                        comment: this.props.comment,
                        viewSize: 58,
                        imageSize: 42,
                    })
                    setTimeout(() => {
                        this.setState({
                            isPressed: 0,
                        })
                    }, 500);
            },
            onPanResponderMove: (evt, gestureState) => {
                if(gestureState.dx < -30){
                    this.setState({
                        isPressed: -1,
                        rightOffset: 0,
                        viewSize: 52,
                        imageSize: 36,
                    })
                    this.props.recordingVoice(this.state.comment);
                    this.props.onChangeWidth(widthOfComment);
                }
                if(this.state.isPressed == 0) {
                    this.setState({
                        rightOffset: - gestureState.dx
                    })
                    this.props.recordingVoice(this.state.currentTime);
                    this.props.onChangeWidth(widthOfComment + gestureState.dx);
                }
            },
            onPanResponderTerminationRequest: (evt, gestureState) => true,
            onPanResponderRelease: (evt, gestureState) => {
                this.setState({
                    rightOffset: 0,
                    viewSize: 52,
                    imageSize: 36,
                })
                var commentType = -1;
                this.props.onChangeWidth(widthOfComment);

                if(this.state.isPressed == -1) {
                    commentType = -1;
                }
                if(this.state.isPressed == 1) {
                    commentType = 1;
                }
                if(this.state.isPressed == 0) {
                    commentType = 2;
                }
                this.setState({isPressed: -1})
                if(commentType != -1) {
                    this.props.onUpload();
                }
                setTimeout(() => {

                    this.props.dispatch(getRecordingStatus(false));
                    this._stop();
                    if(commentType == -1) {
                        return;
                    }
                    if(this.state.comment == '' && commentType == 1) {
                        this.props.onComment();
                        return;
                    }
                    var date = new Date();
                    var uploadName = 'comment' + 
                        date.getUTCFullYear().toString() + '_' +
                        this.addZero(date.getUTCMonth()) +	 '_' +
                        this.addZero(date.getUTCDate()) + '_' +
                        this.addZero(date.getUTCHours()) + '_' +
                        this.addZero(date.getUTCMinutes()) + '_' +
                        this.addZero(date.getUTCSeconds()) + '_' +
                        this.addZero(date.getUTCMilliseconds());
                    new Promise((resolve, reject) => {
                        if(this.props.thumbnail == null) {
                            resolve(null);
                        }
                        let thumbnail = this.props.thumbnail;
                        const image = Platform.OS === 'ios' ? thumbnail.replace('file://', '') : thumbnail;
                        const Blob = RNFetchBlob.polyfill.Blob
                        const fs = RNFetchBlob.fs
                        window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
                        window.Blob = Blob
                    
                        let uploadBlob = null
                        const imageRef = firebaseApp.storage().ref('comment').child(uploadName + '.jpg')
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
                        var commentPhoto = url;
                        var recordName = null;
                        new Promise((resolve, reject) => {
                            if(commentType == 2) {
                                recordName = 'record' + 
                                date.getUTCFullYear().toString() + '_' +
                                this.addZero(date.getUTCMonth()) +	 '_' +
                                this.addZero(date.getUTCDate()) + '_' +
                                this.addZero(date.getUTCHours()) + '_' +
                                this.addZero(date.getUTCMinutes()) + '_' +
                                this.addZero(date.getUTCSeconds()) + '_' +
                                this.addZero(date.getUTCMilliseconds()) + '.aac';

                                const image = this.state.audioPath
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
                                    resolve(url);
                                })
                                .catch((error) => {
                                    reject(error);
                                })
                            } else {
                                resolve(this.state.comment);
                            }
                        })
                        .then((url) =>{
                            this.props.onComment();
                            var userId = firebaseApp.auth().currentUser.uid;
                            var d = new Date();
                            firebaseApp.database().ref('users').child(userId).update({
                                lastActivity: d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(),
                            })
                            var commentTime = d.toLocaleTimeString() + ' at '+ d.toDateString();
                            firebaseApp.database().ref('/posts/').child(this.props.groupName).child(this.props.postName).child('commentUsers').push({
                                userId: userId,
                                FullName: this.props.fullName,
                                comment: url,
                                commentTitle: (commentType == 2 && this.state.comment != '') ? this.state.comment : null,
                                commentTime: commentTime,
                                recordName: recordName,
                                commentPhoto: commentPhoto,
                                commentFile: uploadName + '.jpg'
                            })
                            .then(() => {
                                ToastAndroid.show('You have commented on this Shout!', ToastAndroid.SHORT);
                            })
                            .catch((error) => {
                            })
                            
                            firebaseApp.database().ref('/posts/').child(this.props.groupName).child(this.props.postName).child('comments').once('value', (snap) => {
                                var comments;
                                comments = snap.val();
                                comments ++;

                                var date = new Date();
                                var lastModified = date.getUTCFullYear().toString() + '_' +
                                this.addZero(date.getUTCMonth()) +	 '_' +
                                this.addZero(date.getUTCDate()) + '_' +
                                this.addZero(date.getUTCHours()) + '_' +
                                this.addZero(date.getUTCMinutes()) + '_' +
                                this.addZero(date.getUTCSeconds()) + '_' +
                                this.addZero(date.getUTCMilliseconds());
                                if(this.props.downloadUrl != undefined) {
                                    firebaseApp.database().ref('/groups/').child(this.props.groupKey).update({
                                            thumbLink: this.props.downloadUrl
                                    })
                                } 
                                firebaseApp.database().ref('/posts/').child(this.props.groupName).child(this.props.postName).update({
                                    comments: comments,
                                    lastModified: lastModified,
                                })
                                .then(() => {
                                    firebaseApp.database().ref('groups').child(this.props.groupKey).update({
                                        lastModified: lastModified
                                    });
                                    
                                    if(this.props.fullName == this.props.userName)
                                        return;
                                    firebaseApp.database().ref().child('playerIds').on('value', (snap) => {
                                        snap.forEach((child) => {
                                            if(child.val().fullName == this.props.userName) {
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
                                                            'nfType': 'nf_gotoPost',
                                                            'postName':  this.props.postName, 
                                                            'downloadUrl': this.props.downloadUrl, 
                                                            'shoutTitle': this.props.shoutTitle, 
                                                            'userName': this.props.userName, 
                                                            'date': this.props.date, 
                                                            'voiceTitle': this.props.voiceTitle, 
                                                            'groupName': this.props.groupName,
                                                            'groupKey': this.props.groupKey,
                                                            'groupCreator': this.props.groupCreator,
                                                        },
                                                        headings:{"en": "Comment"},
                                                        contents: {'en':  this.state.comment != '' ? this.props.myName + ': ' + this.state.comment : this.props.myName + ': ' + 'said something'},
                                                    })
                                                })
                                            }
                                        });
                                    });
                                })
                            })
                            .catch((error) => {
                            })
                        })
                    })
                    
                }, 150);
            },
            onPanResponderTerminate: (evt, gestureState) => {
              // Another component has become the responder, so this gesture
              // should be cancelled
            },
            onShouldBlockNativeResponder: (evt, gestureState) => {
              // Returns whether this component should block native components from becoming the JS
              // responder. Returns true by default. Is currently only supported on android.
              return true;
            },
        });
    }
    
    componentDidMount() {
        this._checkPermission().then((hasPermission) => {
            this.setState({ hasPermission });

            if (!hasPermission) return;

            this.prepareRecordingPath(this.state.audioPath);

            AudioRecorder.onProgress = (data) => {
                this.setState({currentTime: Math.floor(data.currentTime)});
            };

            AudioRecorder.onFinished = (data) => {
            // Android callback comes in the form of a promise instead.
                if (Platform.OS === 'ios') {
                    this._finishRecording(data.status === "OK", data.audioFileURL);
                }
            };
        });
    }

    _checkPermission() {
        if (Platform.OS !== 'android') {
            return Promise.resolve(true);
        }

        const rationale = {
            'title': 'Microphone Permission',
            'message': 'AudioExample needs access to your microphone so you can record audio.'
        };

        return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, rationale)
        .then((result) => {
            console.log('Permission result:', result);
            return (result === true || result === PermissionsAndroid.RESULTS.GRANTED);
        });
    }

    async _pause() {
      if (!this.state.recording) {
        console.warn('Can\'t pause, not recording!');
        return;
      }

      this.setState({stoppedRecording: true, recording: false});

      try {
        const filePath = await AudioRecorder.pauseRecording();

        // Pause is currently equivalent to stop on Android.
        if (Platform.OS === 'android') {
          this._finishRecording(true, filePath);
        }
      } catch (error) {
        console.error(error);
      }
    }

    async _stop() {
      if (!this.state.recording) {
        console.warn('Can\'t stop, not recording!');
        return;
      }

      this.setState({stoppedRecording: true, recording: false});

      try {
        const filePath = await AudioRecorder.stopRecording();

        if (Platform.OS === 'android') {
          this._finishRecording(true, filePath);
        }
        return filePath;
      } catch (error) {
        console.error(error);
      }
    }
    async _record() {
      if (this.state.recording) {
        console.warn('Already recording!');
        return;
      }

      if (!this.state.hasPermission) {
        console.warn('Can\'t record, no permission granted!');
        return;
      }

      if(this.state.stoppedRecording){
        this.prepareRecordingPath(this.state.audioPath);
      }

      this.setState({recording: true});

      try {
        const filePath = await AudioRecorder.startRecording();
      } catch (error) {
        console.error(error);
      }
    }

    _finishRecording(didSucceed, filePath) {
      this.setState({ finished: didSucceed });
      console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
    }

    addZero = (i) => {
		if(i < 10){
			i = '0' + i;
		}
		return i;
    }
    
    render() {
        return (
            <View
                style = {{backgroundColor:'royalblue',width: this.state.viewSize, height: this.state.viewSize, borderRadius: this.state.viewSize / 2, justifyContent: 'center', alignItems:'center', marginRight: this.state.rightOffset, zIndex: 20}} 
                {...this._panResponder.panHandlers}>
            <Image source={require('../images/recordshout.png')} style={{ height: this.state.imageSize, width: this.state.imageSize,}}/>
            </View>
        );
    }
}

const DEVICE_WIDTH = Dimensions.get('window').width;
const DEVICE_HEIGHT = Dimensions.get('window').height;
const widthOfComment = DEVICE_WIDTH - 150;

function mapStateToProps(state) {
	return {
      fullName: state.getUserInfo.fullName,
      playerIds: state.getUserInfo.playerIds,
	};
}

export default connect(mapStateToProps)(AudioPlayer);