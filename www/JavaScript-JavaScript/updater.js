/**
 * Standalone Updater Utility for ISM Incidencias (Capacitor/Android)
 * Uses @capgo/capacitor-updater for Over-The-Air web asset refreshes.
 */

export async function checkOTAUpdates() {
    // 1. Detect environment
    const isCapacitor = !!window.Capacitor;
    if (!isCapacitor) return;

    const { CapacitorUpdater, Device, App } = window.Capacitor.Plugins;
    
    try {
        console.log("OTA: Checking for updates...");
        
        // We'll use a version.json file on GitHub to track the latest available web bundle
        // REPLACE with your repository's raw URL for version.json
        const REPO_URL = "https://raw.githubusercontent.com/AlejandroGonzaloBarroso/WEB_ISM_INCIDENCIAS/main";
        const VERSION_CHECK_URL = `${REPO_URL}/version.json`;

        const response = await fetch(VERSION_CHECK_URL, { cache: 'no-store' });
        if (!response.ok) return;

        const remote = await response.json();
        
        // Fetch local version from the currently active web bundle
        let currentVersion = "1.0.0";
        try {
            const localResponse = await fetch('version.json', { cache: 'no-store' });
            if (localResponse.ok) {
                const local = await localResponse.json();
                currentVersion = local.version || currentVersion;
            }
        } catch (e) {
            console.warn("OTA: Local version.json not found. Falling back to 1.0.0");
        }

        console.log(`OTA: Local bundle Version: ${currentVersion}, Remote Version: ${remote.version}`);

        if (remote.version !== currentVersion && remote.androidZipUrl) {
            console.log("OTA: New update found. Downloading...");
            
            // Download the new bundle
            const update = await CapacitorUpdater.download({
                url: remote.androidZipUrl,
                version: remote.version
            });

            console.log("OTA: Download complete. Setting as active for next restart.");
            
            // Set the new version to be active
            await CapacitorUpdater.set(update);
            
            // Optional: Notify user or auto-reload
            // Because we want it "automatic", we can reload now or wait for next start.
            // Let's show a toast if possible (we'll need to pass a callback or use globals)
            if (window.showToast) {
                window.showToast("Actualización descargada. Se aplicará al reiniciar.", "success");
            }
        } else {
            console.log("OTA: App is up to date.");
        }

    } catch (err) {
        console.error("OTA Error:", err);
    }
}
