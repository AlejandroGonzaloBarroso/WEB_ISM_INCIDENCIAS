const { app, BrowserWindow } = require('electron');
const path = require('path');const express = require('express');
const expressApp = express();
const port = 3001;

// Start Express server to serve the www directory
function startServer() {
  expressApp.use(express.static(path.join(__dirname, 'www')));
  
  // Explicitly serve admin.html for the root if needed, 
  // but we can also just load it directly in Electron.
  
  expressApp.listen(port, '0.0.0.0', () => {
    console.log(`Admin Server running at http://localhost:${port}`);
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ISM Admin Dashboard",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load admin.html specifically for this app
  mainWindow.loadURL(`http://localhost:${port}/admin.html`);
  
  // Optional: Remove menu for a cleaner look
  // mainWindow.setMenu(null);
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
