// remember that we have to negate some of the calculations because of the way the coordinate system is set up
// in browsers which means moving up means subtracting from the y coordinate and moving down means adding to the
// y coordinate.
import { io } from "socket.io-client";
import * as Peer from "simple-peer";
import type { Instance as PeerType } from "simple-peer";

let socket = io("https://gregarious-meerkat-069dbb.netlify.app");
// let socket = io("http://localhost:3001");

let peerConnections: Map<string, PeerType> = new Map();

socket.on("pjoin", (...args) => {
	let peer: PeerType = new Peer({ initiator: true });
	let peerConnectionID = Date.now();
	peer.on("signal", data => {
		let socketidOther = args[0];
		socket.emit("signal", socketidOther, peerConnectionID, data);
	});
	peer.on("connect", () => {
		console.log(String(peerConnectionID) + " has connected");
	});
	peerConnections.set(String(peerConnectionID), peer);
});

socket.on("preply", (...args) => {
	let peerConnectionID = args[1];
	let reply = args[2];
	let socketidOther = args[0];
	if (peerConnections.has(peerConnectionID)) {
		peerConnections.get(peerConnectionID).signal(reply);
	}
	else {
		let peer = new Peer();
		peer.signal(reply);
		peer.on("signal", data => {
			socket.emit("signal", socketidOther, peerConnectionID, data);
		});
		peerConnections.set(peerConnectionID, peer);
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

function render() {
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	if (keysPressed.has("ArrowUp")) {
		tri.updateLocation([
			tri.location[0] + -5 * Math.cos(tri.facing_angle), 
			tri.location[1] + -5 *Math.sin(tri.facing_angle)
		]);
	}
	if (keysPressed.has("ArrowLeft")) {
		tri.updateFacingAngle(tri.facing_angle - 1 / (2 * Math.PI));
	}
	if (keysPressed.has("ArrowRight")) {
		tri.updateFacingAngle(tri.facing_angle + 1 / (2 * Math.PI));
	}
	tri.draw();
	requestAnimationFrame(render);
}

render();

