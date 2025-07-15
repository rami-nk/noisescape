const fs = require('fs');
const path = require('path');

function findHighestAlphaGroup(data) {
    let bestGroup = null;
    let bestAvg = -Infinity;

    for (const color in data) {
        for (const band in data[color]) {
            const readings = data[color][band];
            if (!Array.isArray(readings) || readings.length === 0) continue;
            const alphas = readings
                .map(r => r.alpha)
                .filter(v => typeof v === 'number');
            if (alphas.length === 0) continue;
            const avg = alphas.reduce((s,v) => s+v, 0) / alphas.length;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestGroup = `${color}.${band}`;
            }
        }
    }

    return bestGroup
        ? { group: bestGroup, averageAlpha: bestAvg }
        : null;
}

function findHighestAlphaGroupFromFile(filePath) {
    const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
    const data = JSON.parse(raw);
    return findHighestAlphaGroup(data);
}

module.exports = { findHighestAlphaGroupFromFile };
