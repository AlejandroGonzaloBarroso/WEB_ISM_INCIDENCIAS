const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const expressApp = express();
const port = 3000;

// Start Express Server
function startServer() {
  expressApp.use(express.static(path.join(__dirname, 'www')));
  
  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www/index.html'));
  });

  expressApp.listen(port, '0.0.0.0', () => {
    console.log(`Live Server started on port ${port}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "ISM Incident Management",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load via the local server to avoid ES Module issues with file:// protocol
  win.loadURL(`http://localhost:${port}`);
  
  // Clean up the UI
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  // Check for updates after a short delay
  setTimeout(() => {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
      console.error("AutoUpdater error:", err);
    }
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
