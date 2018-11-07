function Whiteboard(canvas, type, socket) {
	let penSize = 10,
		eraserSize = 50

	let ctx = canvas.getContext('2d'),
		color = "#000",
		tool = "pen",
		clicked = false,
		lastX = undefined,
		lastY = undefined
		self = this;


	// Resize canvas to fill screen
	function resize() {
		// canvas.width = $(window).width();
		// canvas.height = $(window).height();
		canvas.width = 3000;
		canvas.height = 3000;

		ctx.fillStyle = "#fff"
		ctx.fillRect(0, 0, 3000, 3000)
	}
	// $(window).on('resize', resize);
	
	// Initialize everything
	resize();
	if (type == "admin") {
		$(`[data-tool="${tool}"]`).addClass('selected')
		$(`[data-color="${color}"] `).addClass('selected')

		$("#tools > div").on('click', function() {
			$(this).addClass('selected').siblings().removeClass('selected')
			tool = $(this).attr('data-tool')
		});

		$("#colors > div").on('click', function() {
			$(this).addClass('selected').siblings().removeClass('selected')
			color = $(this).attr('data-color')
		});
	} else {
		$("#tools, #colors").remove()
	}

	// Mouse events
	$(window).on('mousedown', mouseDown)
	$(window).on('mouseup', mouseUp)
	$(canvas).on('mouseout', mouseOut)
	$(window).on('mousemove', mouseMove)
	$(window).on('mousewheel DOMMouseScroll', scroll)

	function scroll(event) {
		// console.log(event)
		let _size
		if (event.altKey) {
			event.preventDefault()
			let delta = event.originalEvent.deltaY / 25
			if (tool == "pen") {
				penSize += delta
				if (penSize < 5) penSize = 5
				_size = penSize
			} else {
				eraserSize += delta
				if (eraserSize < 5) eraserSize = 5
				_size = eraserSize
			}
		}

		$("#crosshair").offset({
			left: event.pageX - _size/2,
			top: event.pageY - _size/2
		});
		$("#crosshair").css({
			width: _size,
			height: _size
		})
	}
	function mouseOut() {
		$("#crosshair").hide();
	}
	function mouseDown(event) {
		event.preventDefault();
		clicked = true
		lastX = event.pageX
		lastY = event.pageY
	}
	function mouseUp(event) {
		event.preventDefault();
		clicked = false
		lastX = lastY = undefined
	}
	function mouseMove(event) {
		let x = event.pageX,
			y = event.pageY;

		// send update packet


		let _color = color,
			_size = penSize; 

		if (tool == "eraser") {
			_color = "white"
			_size = eraserSize
			$("#crosshair").css({
				border: '1px dotted rgba(0,0,0,0.5)'
			});
		} else {
			$("#crosshair").css({
				border: '0px solid #000'
			});
		}

		socket.emit('mousemove', { 
			lastX, lastY,
			x, y,
			tool, clicked,
			size: _size,
			color: _color
		});

		$("#crosshair").offset({
			left: x - _size/2,
			top: y - _size/2
		}).show();
		$("#crosshair").css({
			background: _color,
			width: _size,
			height: _size,
		})

		if (!clicked) return;

		ctx.strokeStyle = ctx.fillStyle = _color;

		ctx.beginPath();
		ctx.arc(x, y, _size / 2, 0, Math.PI * 2, false);
		ctx.fill();

		ctx.beginPath();
		ctx.lineCap = "round";
		ctx.lineWidth = _size;
		ctx.moveTo(lastX, lastY);	
		ctx.lineTo(x, y);
		ctx.stroke();

		
		lastX = x
		lastY = y
	}

	// Socket events
	socket.on('create-dump', createDump)
	socket.on('load-dump', loadDump)
	socket.on('admin-disconnected', adminDisconnected)
	socket.on('admin-mousemove', adminMouseMove)

	function createDump(callback) {
		// Work in progress
		let board = canvas.toDataURL();
		callback(board)
	}
	function loadDump(dump) {
		// Work in progress
		var image = new Image();
		image.onload = function() {
			ctx.drawImage(image, 0, 0);
		}
		image.src = dump
	}
	function adminDisconnected() {
		alert(`The room creator has disconnected. You can stay here and look around for as long as you like.`)
	}

	function adminMouseMove({lastX, lastY, x, y, tool, clicked, size, color}) {
		if (tool == "eraser") {
			$("#crosshair").css({
				border: '1px dotted rgba(0,0,0,0.5)'
			});
		} else {
			$("#crosshair").css({
				border: '0px solid #000'
			});
		}

		$("#crosshair").offset({
			left: x - size/2,
			top: y - size/2
		}).show();

		$("#crosshair").css({
			background: color,
			width: size,
			height: size,
		})

		if (!clicked) return;

		ctx.strokeStyle = ctx.fillStyle = color;

		ctx.beginPath();
		ctx.arc(x, y, size / 2, 0, Math.PI * 2, false);
		ctx.fill();

		ctx.beginPath();
		ctx.lineCap = "round";
		ctx.lineWidth = size;
		ctx.moveTo(lastX, lastY);	
		ctx.lineTo(x, y);
		ctx.stroke();
	}
}

$(window).on('hashchange', function() {
	window.location.reload()
})

const socket = io.connect();

if (window.location.hash)
	socket.emit('room', window.location.hash)
else
	window.location.hash = Date.now()

// Wait for type before initializing the whiteboard
socket.on('type', function(type) {
	console.log(type)
	const whiteboard = new Whiteboard($("#whiteboard")[0], type, socket)
});

