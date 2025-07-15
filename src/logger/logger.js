const fs = require('node:fs');
const { cwd } = require('node:process');
const {join} = require("node:path");

let logDirectory = cwd();
let logContent = {
    white: {
        low: [],
        middle: [],
        high: []
    },
    brown: {
        low: [],
        middle: [],
        high: []
    },
    pink: {
        low: [],
        middle: [],
        high: []
    }
};

const setLogDirectory = (dir) => {
    logDirectory = dir;
}

const getLogDirectory = () => {
    return logDirectory;
}

const getSourceOfLogFile = () => {
    return join(logDirectory, 'data.json') ;
}

const logEntry = (entry, noiseType, volumeSetting) => {
    logContent[noiseType][volumeSetting].push(entry);
}

const storeLogFile = () => {
    fs.writeFile( getSourceOfLogFile(), JSON.stringify(logContent), err => {
        if (err) {
            console.error(err);
        }
    });
}

module.exports = { storeLogFile, logEntry, setLogDirectory, getSourceOfLogFile, getLogDirectory };