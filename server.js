const express = require('express');
const unblocker = require('unblocker');
const path = require('path');
const app = express();

// This initializes the proxy routing engine
app.use(unblocker({ prefix: '/proxy/' }));

// This makes your index.html and images load as the website front page
app.use(express.static(__dirname));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server actively running on port ${port}`);
});
