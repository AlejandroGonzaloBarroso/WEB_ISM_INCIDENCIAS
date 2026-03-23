const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const expressApp = express();
const port = 3000;

// Start Express Server
function startServer() {
  return new Promise((resolve) => {
    expressApp.use(express.static(path.join(__dirname, 'www')));
    
    expressApp.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'www/index.html'));
    });

    const server = expressApp.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Live Server started on port ${port}`);
      resolve(port);
    });
    
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      resolve(3000);
    });
  });
}

function createWindow(port) {
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
  win.loadURL(`http://127.0.0.1:${port}`);
  
  // Clean up the UI
  win.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  const port = await startServer();
  createWindow(port);

  // Check for updates after a short delay
  setTimeout(() => {
    try {
      const { autoUpdater } = require('electron-updater');

      // When an update is downloaded, instantly install it and restart
      autoUpdater.on('update-downloaded', (info) => {
        // quitAndInstall(isSilent, isForceRunAfter)
        autoUpdater.quitAndInstall(true, true);
      });

      autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
      console.error("AutoUpdater error:", err);
    }
  }, 3000);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const port = await startServer();
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
