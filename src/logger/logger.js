const fs = require('node:fs');
const { cwd } = require('node:process');
const {join} = require("node:path");

let logDirectory = cwd();
let logContent = {
    white: {
        low: { entries: [], rating: null },
        middle: { entries: [], rating: null },
        high: { entries: [], rating: null }
    },
    brown: {
        low: { entries: [], rating: null },
        middle: { entries: [], rating: null },
        high: { entries: [], rating: null }
    },
    pink: {
        low: { entries: [], rating: null },
        middle: { entries: [], rating: null },
        high: { entries: [], rating: null }
    }
};

const getFilename = () => {
    return 'noisescape-experiment.json';
};

const setLogDirectory = (dir) => {
    logDirectory = dir;
}

const getLogDirectory = () => {
    return logDirectory;
}

const setRatingForCondition = (noiseType, volumeSetting, rating) => {
    logContent[noiseType][volumeSetting].rating = rating;
    storeLogFile();
};

const getSourceOfLogFile = () => {
    return join(logDirectory, getFilename()) ;
}

const logEntry = (entry, noiseType, volumeSetting) => {
    logContent[noiseType][volumeSetting].entries.push(entry);
}

const storeLogFile = () => {
    fs.writeFile(getSourceOfLogFile(), JSON.stringify(logContent), err => {
        if (err) {
            console.error(err);
        }
    });
}

module.exports = { storeLogFile, logEntry, setLogDirectory, getSourceOfLogFile, getLogDirectory, setRatingForCondition };