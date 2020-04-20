import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import io from 'socket.io-client'

class App extends Component {
  constructor(props) {
    super(props);
    this.localVideo = React.createRef()
    this.remoteVideo = React.createRef()

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
      this.textref.value = JSON.stringify(sdp)
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('candidate', candidate => {
      //this.candidates = [...this.candidates, candidate]
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
      this.remoteVideo.current.srcObject = e.stream;
    }

    // getting access to webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(stream => {
        this.localVideo.current.srcObject = stream
        this.pc.addStream(stream)
      })
      .catch(console.log);
    // navigator.getUserMedia({ video: true }, (stream) => {
    //   this.localVideo.current.srcObject = stream
    //   this.pc.addStream(stream)
    // }, (e) => { console.log('error') })
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
  setRemoteDescription = () => {
    const desc = JSON.parse(this.textref.value)
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }
  addCandidate = () => {
    this.candidates.forEach(candidate => {
      console.log('candidate:', JSON.stringify(candidate))
      this.pc.addIceCandidate(new RTCIceCandidate(candidate)) // TODO: Check if the right candidate?
    })
  }
  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload
    })
  }

  render() {
    return (
      <div>
        <video
          style={{ width: 240, height: 240, margin: 5, backgroundColor: 'pink' }}
          ref={this.localVideo}
          autoPlay>
        </video>
        <video
          style={{ width: 240, height: 240, margin: 5, backgroundColor: 'pink' }}
          ref={this.remoteVideo}
          autoPlay>
        </video>
        <button onClick={this.createOffer}>Offer</button>
        <button onClick={this.createAnswer}>Answer</button>
        <br />
        <textarea ref={ref => { this.textref = ref }} />
        <br />
      </div>
    )
  }
}

export default App;
