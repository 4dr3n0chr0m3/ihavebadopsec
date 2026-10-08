const express = require('express');
const Unblocker = require('unblocker');
const path = require('path');
const app = express();

// Instantiate the proxy engine properly using the constructor class
const unblocker = new Unblocker({ prefix: '/proxy/' });

// The proxy engine must handle requests before serving static assets
app.use(unblocker);

// Serve your frontend index.html website file 
app.use(express.static(__dirname));

const port = process.env.PORT || 8080;

// Binding the server allows unblocker to securely track complex streaming sessions
const server = app.listen(port, () => {
  console.log(`Proxy server actively running on port ${port}`);
});

// Attaches the WebSocket upgrade handler
server.on('upgrade', unblocker.onUpgrade);
