const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to update
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionJsonPath = path.join(__dirname, '..', 'www', 'version.json');

function updateVersions(newVersion) {
    // 1. Update package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json to v${newVersion}`);

    // 2. Update version.json (for Android OTA)
    if (fs.existsSync(versionJsonPath)) {
        const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
        versionJson.version = newVersion;
        // Update the zip URL to point to the new release tag
        versionJson.androidZipUrl = `https://github.com/AlejandroGonzaloBarroso/WEB_ISM_INCIDENCIAS/releases/download/v${newVersion}/www.zip`;
        fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));
        console.log(`Updated version.json to v${newVersion}`);
    }
}

const newVersion = process.argv[2];

if (!newVersion) {
    console.error("Please provide a version number (e.g. node scripts/release.js 1.0.1)");
    process.exit(1);
}

try {
    updateVersions(newVersion);
    console.log("\n--- READY TO PUBLISH ---");
    console.log("1. Commit these changes: git add . && git commit -m \"chore: release v" + newVersion + "\"");
    console.log("2. Tag the release: git tag v" + newVersion);
    console.log("3. Push everything: git push origin main --tags");
    console.log("\nGitHub Actions will take over and build both Apps + Android Zip automatically!");
} catch (err) {
    console.error("Error during release preparation:", err);
}
