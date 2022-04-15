// remember that we have to negate some of the calculations because of the way the coordinate system is set up
// in browsers which means moving up means subtracting from the y coordinate and moving down means adding to the
// y coordinate.
import { io } from "socket.io-client";
import Peer from "simple-peer";
import type { Instance as PeerType } from "simple-peer";

// Declarations
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
		this.ctx.moveTo(x_loc + globalOffset[0], y_loc + globalOffset[1]);
		this.ctx.fillText(`${Math.floor(x_loc)} ${Math.floor(y_loc)}`, x_loc + globalOffset[0], y_loc + globalOffset[1] - 20);
		this.ctx.lineTo(
			x_loc + -50 * Math.cos(this.facing_angle + Math.PI / 2 + 75 * Math.PI / 180) + globalOffset[0], 
			y_loc + -50 * Math.sin(this.facing_angle + Math.PI / 2 + 75 * Math.PI / 180) + globalOffset[1]
		);
		this.ctx.lineTo(
			x_loc + -50 * Math.cos(this.facing_angle + Math.PI / 2 + 75 * Math.PI / 180 + Math.PI / 6) + globalOffset[0], 
			y_loc + -50 * Math.sin(this.facing_angle + Math.PI / 2 + 75 * Math.PI / 180 + Math.PI / 6) + globalOffset[1]
		);
		this.ctx.lineTo(
			x_loc + globalOffset[0],
			y_loc + globalOffset[1]
		);
		this.ctx.fill();
		this.ctx.stroke();
	}
}


let socket = io("https://tcas-signaling-server.herokuapp.com/");
// let socket = io("http://192.168.1.252:3001");

let peerConnections: Map<string, {connected: boolean, peer: PeerType}> = new Map();
let otherPeerLocations: Map<string, {x: number, y: number, facing_angle: number}> = new Map();
let canvas: HTMLElement | HTMLCanvasElement | null = document.getElementById("canvas");
let radar: HTMLElement | HTMLCanvasElement | null = document.getElementById("radar");
let mapSize: [number, number] = [1500, 1500];
let ctx = (canvas as HTMLCanvasElement).getContext("2d");
let radarCtx = (radar as HTMLCanvasElement).getContext("2d");
let prevDate: number = Date.now();
let distanceToEdge = 50;
let tri: Triangle = new Triangle(
	ctx, 
	[
		Math.floor(Math.random() * mapSize[0] - mapSize[0] / 2), 
		Math.floor(Math.random() * mapSize[1] - mapSize[1] / 2)
	]
);
let keysPressed: Set<string> = new Set();
let globalOffset: [number, number] = [
	(canvas as HTMLCanvasElement).width - tri.location[0], 
	(canvas as HTMLCanvasElement).height - tri.location[1]
];
// console.log(tri.location);
// console.log(globalOffset);

// Socket and Peer things
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
	peer.on("close", () => {
		otherPeerLocations.delete(peerConnectionID);
		peerConnections.delete(peerConnectionID);
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
		peer.on("close", () => {
			otherPeerLocations.delete(peerConnectionID);
			peerConnections.delete(peerConnectionID);
		});
		peer.on('error', err => console.log('error', err))
		peerConnections.set(peerConnectionID, {connected: false, peer: peer});
	}
});

// Canvas Rendering Part
(canvas as HTMLCanvasElement).width = window.innerWidth;
(canvas as HTMLCanvasElement).height = window.innerHeight;

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

function sendInfo() {
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
		ctx.moveTo(x + globalOffset[0], y + globalOffset[1]);
		ctx.fillText(`${Math.floor(x)} ${Math.floor(y)}`, x + globalOffset[0], y + globalOffset[1] - 20);
		ctx.lineTo(
			x + -50 * Math.cos(facing_angle + Math.PI / 2 + 75 * Math.PI / 180) + globalOffset[0],
			y + -50 * Math.sin(facing_angle + Math.PI / 2 + 75 * Math.PI / 180) + globalOffset[1]
		);
		ctx.lineTo(
			x + -50 * Math.cos(facing_angle + Math.PI / 2 + 75 * Math.PI / 180 + Math.PI / 6) + globalOffset[0],
			y + -50 * Math.sin(facing_angle + Math.PI / 2 + 75 * Math.PI / 180 + Math.PI / 6) + globalOffset[1]
		);
		ctx.lineTo(
			x + globalOffset[0],
			y + globalOffset[1]
		);
	}
	ctx.stroke();
}

function drawRadar() {
	radarCtx.clearRect(0, 0, (radar as HTMLCanvasElement).width, (radar as HTMLCanvasElement).height);
	radarCtx.beginPath();
	radarCtx.arc(
		(radar as HTMLCanvasElement).width / 2, 
		(radar as HTMLCanvasElement).height / 2, 
		2, 
		0, 
		2*Math.PI
	);
	radarCtx.fill();
	for (const [peerConnectionID, {x, y, facing_angle}] of otherPeerLocations) {
		if (Math.sqrt((x - tri.location[0])**2 + (y - tri.location[1])**2) <= 1000) {
			radarCtx.beginPath();
			radarCtx.arc(
				(radar as HTMLCanvasElement).width / 2 + (x - tri.location[0]) * 250 / 1500, 
				(radar as HTMLCanvasElement).height / 2 + (y - tri.location[1]) * 250 / 1500, 
				2, 
				0, 
				2*Math.PI
			);
			radarCtx.fill();
			radarCtx.stroke();
		}
	}
	radarCtx.stroke();
}

function drawCHILLWOAHDANGER() {
	ctx.beginPath();
	let msg = "CHILL";
	ctx.font = "20px sans-serif";
	ctx.fillStyle = "green";
	for (const [peerConnectionID, {x, y, facing_angle}] of otherPeerLocations) {
		let distance = Math.sqrt((x - tri.location[0])**2 + (y - tri.location[1])**2);
		if (distance <= 400 && distance > 100) {
			ctx.fillStyle = "orange";
			msg = "WOAH";
		}
		else if (distance <= 100) {
			ctx.fillStyle = "red";
			msg = "DANGER";
		}
	}
	ctx.fillText(
		`${msg}`, 
		tri.location[0] + globalOffset[0], 
		tri.location[1] + globalOffset[1] + 20
	);
	ctx.stroke();
	ctx.font = "10px sans-serif";
	ctx.fillStyle = "black";
}

function drawWorldBorder() {
	ctx.beginPath();
	ctx.strokeRect(-mapSize[0] / 2 + globalOffset[0], -mapSize[1] / 2 + globalOffset[1], mapSize[0], mapSize[1]);
	ctx.stroke();
}

function render() {
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	if (
		keysPressed.has("ArrowUp") && 
		tri.location[0] + -5 * Math.cos(tri.facing_angle) <= mapSize[0] / 2 &&
		tri.location[1] + -5 * Math.sin(tri.facing_angle) <= mapSize[1] / 2 &&
		tri.location[0] + -5 * Math.cos(tri.facing_angle) >= -mapSize[0] / 2 &&
		tri.location[1] + -5 * Math.sin(tri.facing_angle) >= -mapSize[1] / 2
	) {
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

	if (tri.location[0] + globalOffset[0] <= distanceToEdge) {
		globalOffset[0] = distanceToEdge - tri.location[0];
	}
	else if ((canvas as HTMLCanvasElement).width - distanceToEdge <= tri.location[0] + globalOffset[0]) {
		globalOffset[0] = ((canvas as HTMLCanvasElement).width - distanceToEdge) - tri.location[0];
	}

	if (tri.location[1] + globalOffset[1] <= distanceToEdge) {
		globalOffset[1] = distanceToEdge - tri.location[1];
	}
	else if ((canvas as HTMLCanvasElement).height - distanceToEdge <= tri.location[1] + globalOffset[1]) {
		globalOffset[1] = ((canvas as HTMLCanvasElement).height - distanceToEdge) - tri.location[1];
	}

	sendInfo();
	drawWorldBorder();
	tri.draw();
	drawCHILLWOAHDANGER();
	drawOtherPeers();
	if (Date.now() - prevDate >= 1000) {
		drawRadar();
		prevDate = Date.now();
	}
	requestAnimationFrame(render);
}

render();

