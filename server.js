const express = require('express');
const http = require('http');
const path = require('path');
const createBareServer = require('@mercuryworkshop/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/bare/');

// Serve static frontend files from project root
app.use(express.static(__dirname));

// Serve Ultraviolet library scripts under /uv/
app.use('/uv/', express.static(uvPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route requests to Bare Server
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

// Route WebSocket upgrades (required for Roblox, live messaging, and streaming)
server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});
