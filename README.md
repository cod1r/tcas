# Traffic Collision Avoidance System

This is a simulation of the Traffic Collision Avoidance System (TCAS) for the class, Real Time Systems at the University of Houston.
This isn't a good implementation of how the TCAS system works relative to the actual TCAS implementation that is currently used in some aircrafts but it does provide a good enough visual representation of what is happening and expresses the basic ideas of how aircrafts can avoid colliding with other aircrafts. - Jason Ho 15-4-2022 2:33 AM

This project utilizes WebRTC (I use simple-peer to simplify the webrtc browser details) and WebSockets (the websocket server is written in the repository, 'tcas-signaling-server' under my github account) in order to connect peers. Peers are then given a random point, an x and a y coordinate, within a fixed area (1500x1500). That point and a facing angle (default is PI / 2), is then used to create an acute triangle using trigonometry.

Once the triangle is created and the peers are connected, I draw it onto the HTMLCanvasElement in the browser. Every time 'requestAnimationFrame' is called, every peer goes through their connections and sends out their coordinates (their coordinate and their facing angle) using the WebRTC data channels.

Every user has a global offset that is applied to every point so that the current user's triangle does not go off screen.

The radar that is used is just a scaled down version of what is happening on the bigger canvas relative to the current user (the center dot in the radar). A delay is also added to mimic the behaviors of radars in practical use.

The current user is also notified of how close other peers are by a string notifier right under their triangle that can be "CHILL", "WOAH", and "DANGER" depending on the distance of the closest peer.
