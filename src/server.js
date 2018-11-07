const config = require('./config.js');

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

// Start the server.
server.listen(config.port, () => console.log(`Express and Socket.io running on port ${config.port}!`));

// Initialize the routes.
require('./routes.js')(app);

// Setup socket.io relay
var whiteboards = {}


io.on('connection', function(socket) {
	socket.on('room', function(roomId) {
		if (whiteboards[roomId]) {
			// Room already exists, make viewer
			let room = whiteboards[roomId]
			room.viewers.push(socket)

			socket.whiteboardData = { type: "viewer", room: roomId }
			socket.emit('type', 'viewer')

			// Request dump from admin and send to new viewer
			room.admin.emit('create-dump', function(dump) {
				socket.emit('load-dump', dump)
			})
		} else {
			// Room doesn't exist, make admin
			whiteboards[roomId] = {
				admin: socket,
				viewers: []
			}
			
			socket.whiteboardData = { type: "admin", room: roomId }
			socket.emit('type', 'admin')
		}
		console.log(whiteboards)
	})

	socket.on('disconnect', function() {
		if (!socket.whiteboardData) {
			// A socket from last start of server, ignore
			return
		}
		let room = whiteboards[socket.whiteboardData.room]
		if (socket.whiteboardData.type == "admin") {
			room.viewers.forEach(v => v.emit('admin-disconnected'))
			delete whiteboards[socket.whiteboardData.room]
		} else {
			room.viewers = room.viewers.filter(v => v != socket)
		}
		console.log(whiteboards)
	})

	socket.on('mousemove', function(data) {
		if (!socket.whiteboardData) return;

		let { room, type } = socket.whiteboardData
		room = whiteboards[room]

		if (!room) return;

		if (type == "admin") {
			room.viewers.forEach(s => s.emit('admin-mousemove', data))
		} else {

			room.viewers.forEach(s => s.emit('viewer-mousemove', data))
			room.admin.emit('viewer-mousemove', data)
		}
	})
})
