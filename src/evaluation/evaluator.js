const fs = require('fs');
const path = require('path');

const STATE_METRICS = {
    Relaxed: {
        optimize: ['alpha'],
        weight: [1]
    },
    Focused: {
        optimize: ['beta', 'alpha'],
        penalize: ['delta'],
        weight: [0.7, 0.3]
    },
    Alert: {
        optimize: ['beta', 'gamma'],
        weight: [0.6, 0.4]
    },
    Meditative: {
        optimize: ['theta'],
        moderate: ['alpha'],
        weight: [1]
    }
};

function evaluateGroup(readings, stateDef) {
    const { optimize = [], penalize = [], moderate = [], weight = [] } = stateDef;
    if (!Array.isArray(readings) || readings.length === 0) return -Infinity;

    let totalScore = 0;

    optimize.forEach((band, i) => {
        const values = readings.map(r => r[band]).filter(v => typeof v === 'number');
        if (values.length === 0) return;
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        totalScore += (weight[i] || 1) * avg;
    });

    penalize?.forEach(band => {
        const values = readings.map(r => r[band]).filter(v => typeof v === 'number');
        if (values.length === 0) return;
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        totalScore -= avg;
    });

    moderate?.forEach(band => {
        const values = readings.map(r => r[band]).filter(v => typeof v === 'number');
        if (values.length === 0) return;
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const ideal = 100;
        totalScore -= Math.abs(ideal - avg);
    });

    return totalScore;
}

function findBestGroupForState(data, stateName) {
    const stateDef = STATE_METRICS[stateName];
    if (!stateDef) throw new Error(`Unknown state: ${stateName}`);

    let bestGroup = null;
    let bestScore = -Infinity;

    for (const color in data) {
        for (const band in data[color]) {
            const readings = data[color][band].entries;
            const score = evaluateGroup(readings, stateDef);
            if (score > bestScore) {
                bestScore = score;
                bestGroup = { group: `${color}.${band}`, score };
            }
        }
    }

    return bestGroup;
}

function findBestGroupFromFile(filePath, stateName) {
    const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
    const data = JSON.parse(raw);
    return findBestGroupForState(data, stateName);
}

module.exports = {
    findBestGroupFromFile,
    evaluateGroup
};
