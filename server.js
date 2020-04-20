const express = require('express')

var io = require('socket.io')
    ({
        path: '/webrtc'
    })

const app = express()
const port = 8080;

app.use(express.static(__dirname + '/build'))
app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/build/index.html')
})
//app.get('/', (req, res) => res.send('Hello'))

const server = app.listen(port, () => console.log('Example'))

io.listen(server)

const peers = io.of('/webrtcPeer')

let connectedPeers = new Map()

peers.on('connection', socket => {
    console.log('connected!', socket.id)
    socket.emit('connection-success', { success: socket.id })

    connectedPeers.set(socket.id, socket)

    socket.on('disconnect', () => {
        console.log('disconnected!')
        connectedPeers.delete(socket.id)
    })

    socket.on('offerOrAnswer', (data) => {
        for (const [socketID, socket] of connectedPeers.entries()) {
            if (socketID !== data.socketID) { // TODO: replace to find correct peer for chat
                console.log('offerOrAnswer', socketID, 'from', data.socketID, data.payload.type)
                socket.emit('offerOrAnswer', data.payload)
            }
        }
    })

    socket.on('candidate', (data) => {
        for (const [socketID, socket] of connectedPeers.entries()) {
            if (socketID !== data.socketID) { // TODO: replace to find correct peer for chat
                console.log('candidate', socketID, 'from', data.socketID, data.payload.type)
                socket.emit('candidate', data.payload)
            }
        }
    })
})