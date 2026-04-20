const { app, BrowserWindow, dialog } = require('electron');
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

      // Catch and log auto-updater errors
      autoUpdater.on('error', (err) => {
        console.error('Error in auto-updater:', err);
      });

      // Prompt the user when update is downloaded instead of force quit
      autoUpdater.on('update-downloaded', (info) => {
        dialog.showMessageBox({
          type: 'info',
          buttons: ['Reiniciar ahora', 'Más tarde'],
          title: 'Actualización disponible',
          message: 'Se ha descargado una nueva versión de la aplicación.',
          detail: '¿Deseas reiniciar la aplicación ahora para instalar la actualización?'
        }).then((returnValue) => {
          if (returnValue.response === 0) {
            // User clicked 'Reiniciar ahora'
            autoUpdater.quitAndInstall();
          }
        });
      });

      // Initial update check
      autoUpdater.checkForUpdatesAndNotify();

      // Periodic check every 4 hours (4 * 60 * 60 * 1000)
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 14400000);

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
