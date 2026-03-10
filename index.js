const express = require('express');
const path    = require('path');

const app = express();

// serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// example API route
app.get('/api/hello', (req, res) => {
  res.json({ msg: 'Hello from HCI project!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}/`);
});