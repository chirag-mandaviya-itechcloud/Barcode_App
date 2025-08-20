const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { logger } = require('./logging'); // Assuming you have a logging utility
const { getMachineInfo } = require('./machineInfo'); // Assuming you have a utility to get machine info
const LICENSE_FILE = path.join(process.cwd(), 'license.lic');

const ENCRYPTION_KEY = crypto.createHash('sha256').update('PixelSecretKey').digest();
const ALGORITHM = 'aes-256-cbc';

function encryptData(data) {
    const iv = crypto.randomBytes(16);

    const jsonData = JSON.stringify(data);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return iv + encrypted string (colon-separated)
    return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encryptedString) {
    const [ivHex, encrypted] = encryptedString.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

function validateUploadedLicenseFile() {
    const machineInfo = getMachineInfo();
    const machineId = machineInfo.machineId;
    const cpu = machineInfo.cpu;

    const license = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));

    const licenseHash = license.license;

    const decryptedData = decryptData(licenseHash);

    if (decryptedData) {
        if (decryptedData.machineId !== machineId || decryptedData.cpu !== cpu) {
            logger.error('License file is invalid.');
            return false;
        } else {
            logger.info('License file is valid.');
            // You can proceed with your application logic here
            data = {
                machineId: decryptedData.machineId,
                cpu: decryptedData.cpu,
                expiry: decryptedData.expiry,
                start: decryptedData.start
            };

            // console.log("data: ", data);

            const encryptedData = encryptData(data);

            fs.writeFileSync(LICENSE_FILE, JSON.stringify({ license: encryptedData }, null, 2));
            return true;
        }
    }
}

function validateLicense() {
    if (!fs.existsSync(LICENSE_FILE)) {
        logger.error('License file not found.');
        return false;
    }

    const licenseFile = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
    if (!licenseFile.license) {
        logger.error('Invalid license file format.');
        return false;
    }

    const decryptedData = decryptData(licenseFile.license);
    if (!decryptedData) {
        logger.error('Failed to decrypt license data.');
        return false;
    }
    const machineInfo = getMachineInfo();
    const machineId = machineInfo.machineId;
    const cpu = machineInfo.cpu;

    if (decryptedData.machineId !== machineId || decryptedData.cpu !== cpu) {
        logger.error('License does not match this machine.');
        return false;
    }
    // Compare only the date part (ignore time)
    if (decryptedData.expiry) {
        const expiryDate = new Date(decryptedData.expiry);
        const today = new Date(new Date().toISOString().split('T')[0]);
        if (expiryDate < today) {
            logger.error('License has expired.');
            return false;
        }
    }
    if (decryptedData.start) {
        const startDate = new Date(decryptedData.start);
        const today = new Date(new Date().toISOString().split('T')[0]);
        if (today < startDate) {
            logger.error('Time is tampered with.');
            return false;
        }
    }
    logger.info('License is valid and verified successfully.');
    return true;
}

function getExpiryDate() {
    const licenseFile = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
    const decryptedData = decryptData(licenseFile.license);

    return decryptedData.expiry;
}

module.exports = { validateUploadedLicenseFile, encryptData, decryptData, validateLicense, getExpiryDate };
