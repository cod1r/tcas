// remember that we have to negate some of the calculations because of the way the coordinate system is set up
// in browsers which means moving up means subtracting from the y coordinate and moving down means adding to the
// y coordinate.
import { io } from "socket.io-client";
import Peer from "simple-peer";
import type { Instance as PeerType } from "simple-peer";

let socket = io("https://tcas-signaling-server.herokuapp.com/");
// let socket = io("http://192.168.1.252:3001");

let peerConnections: Map<string, {connected: boolean, peer: PeerType}> = new Map();
let otherPeerLocations: Map<string, {x: number, y: number, facing_angle: number}> = new Map();

socket.on("pjoin", (...args) => {
	// console.log("somebody joined");
	let peer: PeerType = new Peer({ initiator: true, trickle: false });
	let peerConnectionID: string = String(Date.now());
	peer.on("signal", data => {
		let socketidOther = args[0];
		socket.emit("signal", socketidOther, peerConnectionID, data);
	});
	peer.on("connect", () => {
		//console.log(peerConnectionID + " has connected");
		peerConnections.get(peerConnectionID).connected = true;
	});
	peer.on("data", data => {
		//console.log("data received", data.toString());
		otherPeerLocations.set(peerConnectionID, JSON.parse(data.toString()));
	});
	peer.on('error', err => console.log('error', err))
	peerConnections.set(peerConnectionID, {connected: false, peer: peer});
});

socket.on("preply", (...args) => {
	let peerConnectionID = args[1];
	let reply = args[2];
	let socketidOther = args[0];
	if (peerConnections.has(peerConnectionID)) {
		peerConnections.get(peerConnectionID).peer.signal(reply);
	}
	else {
		let peer: PeerType = new Peer({ trickle: false });
		peer.signal(reply);
		peer.on("signal", data => {
			socket.emit("signal", socketidOther, peerConnectionID, data);
		});
		peer.on("connect", () => {
			//console.log(peerConnectionID + " has connected");
			peerConnections.get(peerConnectionID).connected = true;
		});
		peer.on("data", data => {
			//console.log("data received", data.toString());
			otherPeerLocations.set(peerConnectionID, JSON.parse(data.toString()));
		});
		peer.on('error', err => console.log('error', err))
		peerConnections.set(peerConnectionID, {connected: false, peer: peer});
	}
});

// Canvas Rendering Part
let canvas: HTMLElement | HTMLCanvasElement | null = document.getElementById("canvas");
let ctx = (canvas as HTMLCanvasElement).getContext("2d");

(canvas as HTMLCanvasElement).width = window.innerWidth;
(canvas as HTMLCanvasElement).height = window.innerHeight;

class Triangle {
	ctx: CanvasRenderingContext2D = null;
	location: [number, number] = null;
	facing_angle: number = null;
	constructor(ctx: CanvasRenderingContext2D, location: [number, number]) {
		this.ctx = ctx;
		this.location = location;
		this.facing_angle = Math.PI / 2;
	}
	updateLocation = function(newLocation: [number, number]) {
		this.location = newLocation;
	}
	updateFacingAngle = function(facing_angle: number) {
		this.facing_angle = facing_angle;
	}
	draw = function() {
		let x_loc = this.location[0];
		let y_loc = this.location[1];
		this.ctx.beginPath();
		this.ctx.moveTo(x_loc, y_loc);
		this.ctx.lineTo(
			x_loc + -50 * Math.cos(this.facing_angle + Math.PI / 2 + Math.PI / 3), 
			y_loc + -50 * Math.sin(this.facing_angle + Math.PI / 2 + Math.PI / 3)
		);
		this.ctx.lineTo(
			x_loc + -50 * Math.cos(this.facing_angle + Math.PI / 2 + Math.PI / 3 + Math.PI / 3), 
			y_loc + -50 * Math.sin(this.facing_angle + Math.PI / 2 + Math.PI / 3 + Math.PI / 3)
		);
		this.ctx.lineTo(
			x_loc,
			y_loc
		);
		this.ctx.stroke();
	}
}

let tri: Triangle = new Triangle(ctx, [100, 100]);
let keysPressed: Set<string> = new Set();

window.onkeydown = function (e) {
	switch (e.key) {
		case "ArrowUp":
			keysPressed.add("ArrowUp");
			break;
		case "ArrowLeft":
			keysPressed.add("ArrowLeft");
			break;
		case "ArrowRight":
			keysPressed.add("ArrowRight");
			break;
		default:
			break;
	}
}

window.onkeyup = function (e) {
	switch (e.key) {
		case "ArrowUp":
			keysPressed.delete("ArrowUp");
			break;
		case "ArrowLeft":
			keysPressed.delete("ArrowLeft");
			break;
		case "ArrowRight":
			keysPressed.delete("ArrowRight");
			break;
		default:
			break;
	}
}

async function sendInfo() {
	for (const [peerConnectionID, { connected, peer }] of peerConnections) {
		if (connected) {
			peer.send(JSON.stringify({
				x: tri.location[0],
				y: tri.location[1],
				facing_angle: tri.facing_angle
			}));
		}
	}
}

function drawOtherPeers() {
	ctx.beginPath();
	for (const [peerConnectionID, {x, y, facing_angle}] of otherPeerLocations) {
		ctx.moveTo(x, y);
		ctx.lineTo(
			x + -50 * Math.cos(facing_angle + Math.PI / 2 + Math.PI / 3),
			y + -50 * Math.sin(facing_angle + Math.PI / 2 + Math.PI / 3)
		);
		ctx.lineTo(
			x + -50 * Math.cos(facing_angle + Math.PI / 2 + Math.PI / 3 + Math.PI / 3),
			y + -50 * Math.sin(facing_angle + Math.PI / 2 + Math.PI / 3 + Math.PI / 3)
		);
		ctx.lineTo(
			x,
			y
		);
	}
	ctx.stroke();
}

function render() {
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	if (keysPressed.has("ArrowUp")) {
		tri.updateLocation([
			tri.location[0] + -5 * Math.cos(tri.facing_angle), 
			tri.location[1] + -5 * Math.sin(tri.facing_angle)
		]);
	}
	if (keysPressed.has("ArrowLeft")) {
		tri.updateFacingAngle(tri.facing_angle - 1 / (2 * Math.PI));
	}
	if (keysPressed.has("ArrowRight")) {
		tri.updateFacingAngle(tri.facing_angle + 1 / (2 * Math.PI));
	}
	sendInfo();
	tri.draw();
	drawOtherPeers();
	requestAnimationFrame(render);
}

render();

