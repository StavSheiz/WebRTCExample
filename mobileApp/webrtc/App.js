/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Dimensions,
  TouchableOpacity
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals
} from 'react-native-webrtc'

import io from 'socket.io-client'

const dimensions = Dimensions.get('window')

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      localStream: null,
      remoteStream: null
    }

    this.sdp
    this.socket = null
    this.candidates = []
  }

  componentDidMount() {
    //const pc_config = null;

    this.socket = io(
      'https://fa832281.ngrok.io/webrtcPeer',
      {
        path: '/webrtc', query: {}
      }
    )

    this.socket.on('connection-success', success => {
      console.log('connected', success)
    })

    this.socket.on('offerOrAnswer', sdp => {
      this.sdp = JSON.stringify(sdp)
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))

    })

    this.socket.on('candidate', candidate => {
      this.pc.addIceCandidate(new RTCIceCandidate(candidate)) // TODO: Check if the right candidate?
    })

    const pc_config = //null
    {
      'iceServers': [
        //   {
        //     urls: 'stun:[STUN-IP]:[PORT]',
        //     'credential': '[YOUR_CREDENTIAL]',
        //     'username': '[USERNAME]'
        //   }
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    }

    this.pc = new RTCPeerConnection(pc_config)

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('candidate', e.candidate)
        this.sendToPeer('candidate', e.candidate) // TODO: Add target peer
      }
    }

    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    this.pc.onaddstream = (e) => {
      this.setState({ remoteStream: e.stream })
    }

    // getting access to webcam
    // mediaDevices
    //   .getUserMedia({ video: true })
    //   .then(stream => {
    //     this.setState({ localStream: stream })
    //     this.pc.addStream(stream)
    //   })
    //   .catch(console.log);

    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      mediaDevices.getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        }
      })
        .then(stream => {
          this.setState({ localStream: stream })
          this.pc.addStream(stream)
        })
        .catch(error => {
          console.log
        });
    });
  }

  createOffer = () => {
    console.log('offer')
    this.pc.createOffer({ offerToRecieveVideo: 1 }).then(sdp => {
      this.pc.setLocalDescription(sdp)
      this.sendToPeer('offerOrAnswer', sdp) // TODO: Add target peer
    }, e => { })
  }
  createAnswer = () => {
    console.log('answer')
    this.pc.createAnswer({ offerToRecieveVideo: 1 }).then(sdp => {
      this.pc.setLocalDescription(sdp)
      this.sendToPeer('offerOrAnswer', sdp) // TODO: Add target peer
    })
  }

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload
    })
  }



  render() {
    const {
      localStream,
      remoteStream
    } = this.state

    const remoteVideo = remoteStream ?
      (<RTCView
        key={2}
        mirror={true}
        style={styles.rtcViewRemote}
        streamURL={remoteStream && remoteStream.toURL()}
      />) :
      (
        <View style={{ padding: 15 }}>
          <Text style={{ fontSize: 22, textAlign: 'center', color: 'white' }}>No Video available</Text>
        </View>
      )

    console.log('webrtc-debug: ', localStream)
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.buttonsContainer}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={this.createOffer}>
                <View style={styles.button}>
                  <Text style={styles.textContent}>Call</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={this.createAnswer}>
                <View style={styles.button}>
                  <Text style={styles.textContent}>Answer</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.videoContainer}>
            <ScrollView style={styles.remoteVideoScroll}>
              <View style={{
                flex: 1,
                width: '100%',
                backgroundColor: 'black',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {remoteVideo}
              </View>
            </ScrollView>
            <View style={{
              position: 'absolute',
              backgroundColor: 'black',
              width: 100,
              height: 200,
              bottom: 10,
              right: 10,
              zIndex: 1
            }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => { }}>
                  <View>
                    <RTCView
                      key={1}
                      zOrder={0}
                      objectFit='cover'
                      style={styles.rtcView}
                      streamURL={localStream && localStream.toURL()} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  buttonsContainer: {
    flexDirection: 'row'
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center'
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  rtcView: {
    width: 100,
    height: 200,
    backgroundColor: 'black'
  },
  rtcViewRemote: {
    width: dimensions.width - 30,
    height: 200,
    backgroundColor: 'black'
  },
  remoteVideoScroll: {
    flex: 1,
    backgroundColor: 'teal',
    padding: 15,
  }
});

export default App;
