const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function getPortConfig() {
    const portConfigPath = path.join(process.cwd(), 'port.json');
    let PORT = "1406";
    if (fs.existsSync(portConfigPath)) {
        try {
            const portConfig = JSON.parse(await fs.promises.readFile(portConfigPath, 'utf-8'));
            if (portConfig.port) {
                PORT = portConfig.port;
            }
        } catch (e) {
            // fallback to default PORT
        }
    } else {
        await fs.promises.writeFile(portConfigPath, JSON.stringify({ port: PORT }, null, 2));
    }
    return PORT;
}

async function getLogsConfig() {
    const logConfigPath = path.join(process.cwd(), 'logConfig.json');
    let LOG_LEVEL = "debug";
    let logPath = path.join(os.homedir(), 'Downloads', 'Barcode App Logs');
    if (fs.existsSync(logConfigPath)) {
        try {
            const logConfig = JSON.parse(await fs.promises.readFile(logConfigPath, 'utf-8'));
            if (logConfig.level) {
                LOG_LEVEL = logConfig.level;
            }
        } catch (e) {
            // fallback to default LOG_LEVEL
        }
    } else {
        await fs.promises.writeFile(logConfigPath, JSON.stringify({ level: LOG_LEVEL, path: logPath }, null, 2));
    }
}

async function getDefaultDownloadPath() {
    let downloadPath = path.join(os.homedir(), 'Downloads');
    const downloadPathConfig = path.join(process.cwd(), 'downloadPath.json');

    if (fs.existsSync(downloadPathConfig)) {
        try {
            const config = JSON.parse(await fs.promises.readFile(downloadPathConfig, 'utf-8'));
            if (config.path) {
                downloadPath = config.path;
            }
        } catch (e) {
            // fallback to default download path
        }
    } else {
        await fs.promises.writeFile(downloadPathConfig, JSON.stringify({ path: downloadPath }, null, 2));
    }
}

function restartApp() {
    const appPath = app.getPath('exe'); // path to the current executable

    // Spawn new process
    spawn(appPath, [], {
        detached: true,
        stdio: 'ignore'
    }).unref();

    // Exit current instance
    app.quit();
}

// Create the main window
function createWindow(PORT) {
    const mainWindow = new BrowserWindow({
        // kiosk: true, // Kiosk mode keeps taskbar visible
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    mainWindow.maximize();
    mainWindow.loadURL(`http://localhost:${PORT}`); // Load the app's URL
}

ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null; // User canceled the dialog
    }
    return result.filePaths[0]; // Return the selected folder path
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
    const PORT = await getPortConfig();
    await getDefaultDownloadPath();
    await getLogsConfig();
    require('./index');
    setTimeout(() => createWindow(PORT), 1000);
    ipcMain.on('restart-app', () => {
        restartApp(); // Trigger restart from renderer process
    });
});
