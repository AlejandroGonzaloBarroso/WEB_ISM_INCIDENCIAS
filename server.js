const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the www directory
app.use(express.static(path.join(__dirname, 'www')));

// Routes for the HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`
🚀 ISM Live Server is running!
----------------------------------
Local access:    http://localhost:${port}
Network access:  http://[YOUR-IP-ADDRESS]:${port}

Prueba a abrirlo desde tu móvil usando la IP de tu PC para interactuar con la red.
----------------------------------
`);
});
