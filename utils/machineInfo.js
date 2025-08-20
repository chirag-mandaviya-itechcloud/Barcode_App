// Utility to get machine info for license screen
const os = require('os');
const { machineIdSync } = require('node-machine-id');

function getMachineInfo() {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0].model,
        cpuCount: os.cpus().length,
        totalMem: os.totalmem(),
        machineId: machineIdSync(true),
    };
}

module.exports = { getMachineInfo };
