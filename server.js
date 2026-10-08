const express = require('express');
const http = require('http');
const path = require('path');
const rammerhead = require('@rubynetwork/rammerhead');

const app = express();
const server = http.createServer(app);

// Use the correct factory initialization instead of a "new" constructor
const rammerheadMiddleware = rammerhead.createExpressMiddleware({
    prefix: '/rammer/',
    reverseProxy: true
});

// Attach Rammerhead to its folder routes
app.use(rammerheadMiddleware);

// Serve your local files (index.html) from the root folder
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Bind WebSockets directly into Rammerhead's upgrade handler
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/rammer/')) {
        rammerheadMiddleware.upgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});
