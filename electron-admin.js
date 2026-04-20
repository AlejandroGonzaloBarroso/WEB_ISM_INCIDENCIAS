const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');const express = require('express');
const expressApp = express();

// Start Express server with a dynamic port
function startServer() {
  return new Promise((resolve) => {
    expressApp.use(express.static(path.join(__dirname, 'www')));
    const server = expressApp.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Admin Server running at http://127.0.0.1:${port}`);
      resolve(port);
    });
    
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      // Fallback
      resolve(3001);
    });
  });
}

function createWindow(port) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ISM Admin Dashboard",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load admin.html using the dynamically assigned port
  mainWindow.loadURL(`http://127.0.0.1:${port}/admin.html`);
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

  app.on('activate', async function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const port = await startServer();
      createWindow(port);
    }
  });

});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
