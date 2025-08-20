const fs = require('fs');
const path = require('path');
const winston = require('winston');


// Read log directory from logConfig.json, fallback to barcode_app_logs
let logsDir;
let logFileName = 'pixel-barcode-app.log';
try {
    const logConfigPath = path.join(process.cwd(), 'logConfig.json');
    if (fs.existsSync(logConfigPath)) {
        const logConfig = JSON.parse(fs.readFileSync(logConfigPath, 'utf-8'));
        logsDir = logConfig.path ? path.resolve(logConfig.path) : path.join(process.cwd(), 'barcode_app_logs');
        if (logConfig.fileName) {
            logFileName = logConfig.fileName;
        }
    } else {
        logsDir = path.join(process.cwd(), 'barcode_app_logs');
    }
} catch (e) {
    logsDir = path.join(process.cwd(), 'barcode_app_logs');
}
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, logFileName);

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        info.message = `${info.message}\n${info.stack}`;
    }
    return info;
});


const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        enumerateErrorFormat(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: logFilePath }),
        new winston.transports.Console()
    ]
});

module.exports = { logger };
