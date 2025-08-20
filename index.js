// Convert all imports to CommonJS require
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logger, updateLogPath } = require('./utils/logging');
const fileUpload = require('express-fileupload');
const { getMachineInfo } = require('./utils/machineInfo');

//imports
const { connectionDB, initializeModels } = require('./utils/db');
const { validateUploadedLicenseFile, encryptData, validateLicense, getExpiryDate, decryptData } = require('./utils/license');
//Routes imports
const configRouter = require('./routes/configRoutes');
const viewRouter = require('./routes/viewRoutes');

const configPath = path.join(process.cwd(), 'config', 'config.json');
const licensePath = path.join(process.cwd(), 'license.lic');

let PORT = "1406";
const portConfigPath = path.join(process.cwd(), 'config', 'port.json');
if (fs.existsSync(portConfigPath)) {
    try {
        const portConfig = JSON.parse(fs.readFileSync(portConfigPath, 'utf-8'));
        if (portConfig.port) {
            PORT = portConfig.port;
        }
    } catch (e) {
        logger.error('Failed to read port.json: ' + e.message);
    }
}
//initialize express server...
const app = express();

//app dependencies used with express server...
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // 🔧 Add this!
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(fileUpload());

// Middleware to block all routes if license is missing or invalid, except /license
app.use(async (req, res, next) => {
    logger.info(`Request received for ${req.path}`);
    const unprotectedPaths = ['/license', '/license-upload', '/machine-info']
    if (unprotectedPaths.includes(req.path)) {
        return next();
    }
    if (!fs.existsSync(licensePath)) {
        return res.sendFile(path.join(__dirname, 'views', 'license.html'));
    }
    try {
        const isValid = validateLicense();
        logger.info(`License validation result for ${req.path}: ${isValid}`);
        if (!isValid) {
            return res.sendFile(path.join(__dirname, 'views', 'license.html'));
        }
        // logic for valid database credentials
        if (req.path.startsWith("/view") || req.path.startsWith("/config")) {
            if (!fs.existsSync(configPath)) {
                return res.sendFile(path.join(__dirname, 'views', 'databaseError.html'));
            }

            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

            // Check if DB credentials exist and are not empty
            if (!config.DB_HOST || !config.DB_USER || !config.DB_PASSWORD || !config.DB_NAME) {
                return res.sendFile(path.join(__dirname, 'views', 'databaseError.html'));
            }

            // validate the database connection
            try {
                await connectionDB();
                initializeModels();
            } catch (err) {
                logger.error('DB connection failed in middleware: ' + err.message);
                return res.sendFile(path.join(__dirname, 'views', 'databaseError.html'));
            }
        }
        next();
    } catch (e) {
        logger.error('Error in license validation middleware: ' + e.message);
        return res.sendFile(path.join(__dirname, 'views', 'license.html'));
    }
});

// Route to serve license upload page
app.get('/license', (req, res) => {
    if (!fs.existsSync(licensePath)) {
        return res.sendFile(path.join(__dirname, 'views', 'license.html'));
    }

    try {
        const isValid = validateLicense();
        if (!isValid) {
            return res.sendFile(path.join(__dirname, 'views', 'license.html'));
        }

        const expiryDate = getExpiryDate();
        // Render a simple HTML showing remaining days
        return res.send(`
            <html>
            <head><title>License Status</title></head>
            <body style="margin: 40px; font-family: Arial, sans-serif;">
                <h1>Pixel Barcode App</h1>
                <h2>License</h2>
                <p>Your license is valid till <strong>${expiryDate}</strong></p>
                <div><button onclick="location.href='/'" style="padding: 8px 16px; font-size: 16px; cursor: pointer;">🏠︎ Home</button></div>
            </body>
            </html>
        `);
    } catch (err) {
        // On error, show upload page again
        return res.sendFile(path.join(__dirname, 'views', 'license.html'));
    }
});

// Route to handle license file upload
app.post('/license-upload', (req, res) => {
    if (!req.files || !req.files.license) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    const licenseFile = req.files.license;
    const savePath = path.join(process.cwd(), 'license.lic');
    licenseFile.mv(savePath, (err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Failed to save license' });
        }
        try {
            validateUploadedLicenseFile();
            return res.json({ status: 'success', message: 'License uploaded and validated.' });
        } catch (e) {
            fs.unlinkSync(savePath);
            return res.status(400).json({ status: 'error', message: 'Invalid license file.' });
        }
    });
});

app.get("/license-info", async (req, res) => {
    if (!fs.existsSync(licensePath)) {
        return res.status(404).json({ message: 'License file not found.' });
    }
    try {
        const licenseFile = JSON.parse(fs.readFileSync(licensePath, 'utf-8'));
        const decryptedData = decryptData(licenseFile.license);
        if (!decryptedData) {
            return res.status(400).json({ message: 'Invalid license data.' });
        }

        return res.json({
            expiryDate: decryptedData.expiry,
        });
    }
    catch (error) {
        console.error('Error reading license file:', error);
        return res.status(500).json({ message: 'Error reading license file.' });
    }
});

// Route to provide machine info for license page
app.get('/machine-info', (req, res) => {
    const machineInfo = getMachineInfo();
    const data = {
        cpu: machineInfo.cpu,
        machineId: machineInfo.machineId,
    };
    // console.log('DEBUG: machineInfo:', machineInfo);

    hashedData = encryptData(data);
    res.json(hashedData);
});

// Route to get database credentials from config.json
app.get('/get-database-credentials', (req, res) => {
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    if (!fs.existsSync(configPath)) {
        return res.json({ exists: false });
    }
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return res.json({
            exists: true,
            dbname: config.DB_NAME || '',
            host: config.DB_HOST || '',
            username: config.DB_USER || '',
            password: config.DB_PASSWORD || '',
            dbtype: config.DB_TYPE || '',
            dbport: config.DB_PORT || '',
        });
    } catch (e) {
        return res.json({ exists: false });
    }
});

//base route...
app.get('/', (req, res) => {
    res.redirect('/view/details');
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

app.post('/save-database-credentials', async (req, res) => {
    console.log('Received request to save database credentials:', req.body);
    const { dbtype, dbname, host, username, password, dbport } = req.body;
    if (!dbtype || !dbname || !host || !username || !password) {
        return res.status(400).send('All fields are required.');
    }
    // Save credentials to config.json
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (e) {
            config = {};
        }
    }
    config.DB_TYPE = dbtype
    config.DB_NAME = dbname;
    config.DB_HOST = host;
    config.DB_USER = username;
    config.DB_PASSWORD = password;
    config.DB_PORT = dbport;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info('Database credentials saved successfully');

    // Test the database connection
    try {
        await connectionDB();
        logger.info('Database credentials saved and connection successful');
        return res.status(200).json({ status: 'success', message: 'Database credentials saved and connection tested successful.' });
    } catch (err) {
        logger.error('Database connection failed: ' + err.message);
        return res.status(500).json({ status: 'error', message: 'Database connection failed: ' + err.message });
    }
});

// Route to save port configuration
app.post('/save-port', (req, res) => {
    const { port } = req.body;
    if (!port) {
        return res.status(400).send('Port is required.');
    }
    // Save port to port.json
    const portConfigPath = path.join(process.cwd(), 'config', 'port.json');
    let portConfig = {};
    if (fs.existsSync(portConfigPath)) {
        try {
            portConfig = JSON.parse(fs.readFileSync(portConfigPath, 'utf-8'));
        } catch (e) {
            portConfig = {};
        }
    }
    portConfig.port = port;
    fs.writeFileSync(portConfigPath, JSON.stringify(portConfig, null, 2));
    logger.info('Port configuration saved successfully');
    return res.status(200).json({ status: 'success', message: 'Port configuration saved successfully. App will be restart in 2 seconds..' });
});

app.get('/get-port', (req, res) => {
    const portConfigPath = path.join(process.cwd(), 'config', 'port.json');
    if (!fs.existsSync(portConfigPath)) {
        return res.json({ exists: false });
    }
    try {
        const portConfig = JSON.parse(fs.readFileSync(portConfigPath, 'utf-8'));
        return res.json({ exists: true, port: portConfig.port || '' });
    } catch (e) {
        return res.json({ exists: false });
    }
});

app.get('/get-download-path', (req, res) => {
    const downloadPathConfig = path.join(process.cwd(), 'config', 'downloadPath.json');
    if (!fs.existsSync(downloadPathConfig)) {
        return res.json({ exists: false });
    }
    try {
        const downloadPath = JSON.parse(fs.readFileSync(downloadPathConfig, 'utf-8'));
        return res.json({ exists: true, downloadPath: downloadPath.path || '' });
    } catch (e) {
        return res.json({ exists: false });
    }
});

app.get('/get-log-path', (req, res) => {
    const logPathConfig = path.join(process.cwd(), 'config', 'logConfig.json');
    if (!fs.existsSync(logPathConfig)) {
        return res.json({ exists: false });
    }
    try {
        const logPath = JSON.parse(fs.readFileSync(logPathConfig, 'utf-8'));
        return res.json({ exists: true, logPath: logPath.path || '' });
    } catch (e) {
        return res.json({ exists: false });
    }
});

app.post('/save-download-path', (req, res) => {
    const { downloadPath } = req.body;
    if (!downloadPath) {
        return res.status(400).send('Download path is required.');
    }
    // Save download path to downloadPath.json
    const downloadPathConfig = path.join(process.cwd(), 'config', 'downloadPath.json');
    let downloadPathData = {};
    if (fs.existsSync(downloadPathConfig)) {
        try {
            downloadPathData = JSON.parse(fs.readFileSync(downloadPathConfig, 'utf-8'));
        } catch (e) {
            downloadPathData = {};
        }
    }
    downloadPathData.path = downloadPath;
    fs.writeFileSync(downloadPathConfig, JSON.stringify(downloadPathData, null, 2));
    logger.info('Download path configuration saved successfully');
    return res.status(200).json({ status: 'success', message: 'Download path configuration saved successfully.' });
});

app.post('/save-log-path', (req, res) => {
    const { logPath } = req.body;
    if (!logPath) {
        return res.status(400).send('Log path is required.');
    }
    // Save log path to logConfig.json
    const logPathConfig = path.join(process.cwd(), 'config', 'logConfig.json');
    let logPathData = {};
    if (fs.existsSync(logPathConfig)) {
        try {
            logPathData = JSON.parse(fs.readFileSync(logPathConfig, 'utf-8'));
        } catch (e) {
            // Handle error
        }
    }
    logPathData.path = logPath;
    fs.writeFileSync(logPathConfig, JSON.stringify(logPathData, null, 2));
    logger.info('Log path configuration saved successfully');
    // updateLogPath(logPath);
    res.status(200).json({ status: 'success', message: 'Log path configuration saved successfully. App will restart in 2 seconds.' });
    setTimeout(() => {
        process.exit(0);
    }, 2000);
});

//routes
app.use('/config', configRouter);
app.use('/view', viewRouter);

//server configurations...
app.listen(PORT, () => {
    logger.info(`pixel-barcode-app is running on ${PORT}!`);
});
//DATABASE CONNECTION...
connectionDB();
initializeModels();
