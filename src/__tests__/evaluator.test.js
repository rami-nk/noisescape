const path = require('path');
const fs = require('fs');
const { findBestGroupFromFile } = require('../evaluation/evaluator');

function createTempJson(data, filename = 'temp_data.json') {
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
}

describe('EEG evaluator', () => {
    const mockData = {
        white: {
            high: [
                { alpha: 120, beta: 300, delta: 10, theta: 50, gamma: 500 },
                { alpha: 130, beta: 320, delta: 12, theta: 55, gamma: 520 }
            ],
            low: [
                { alpha: 90, beta: 200, delta: 20, theta: 30, gamma: 300 },
                { alpha: 85, beta: 210, delta: 22, theta: 35, gamma: 310 }
            ]
        },
        pink: {
            middle: [
                { alpha: 100, beta: 400, delta: 8, theta: 60, gamma: 600 },
                { alpha: 110, beta: 420, delta: 9, theta: 65, gamma: 620 }
            ]
        }
    };

    let tempFilePath;

    beforeAll(() => {
        tempFilePath = createTempJson(mockData);
    });

    afterAll(() => {
        fs.unlinkSync(tempFilePath);
    });

    test('finds best group for Relaxed (max alpha)', () => {
        const result = findBestGroupFromFile(tempFilePath, 'Relaxed');
        expect(result.group).toBe('white.high');
        expect(result.score).toBeGreaterThan(0);
    });

    test('finds best group for Focused (high beta+alpha, low delta)', () => {
        const result = findBestGroupFromFile(tempFilePath, 'Focused');
        expect(result.group).toBe('pink.middle');
        expect(result.score).toBeGreaterThan(0);
    });

    test('finds best group for Alert (beta+gamma)', () => {
        const result = findBestGroupFromFile(tempFilePath, 'Alert');
        expect(result.group).toBe('pink.middle');
        expect(result.score).toBeGreaterThan(0);
    });

    test('finds best group for Meditative (high theta, moderate alpha)', () => {
        const result = findBestGroupFromFile(tempFilePath, 'Meditative');
        expect(result.group).toBe('pink.middle');
        expect(result.score).toBeGreaterThan(0);
    });

    test('throws for unknown state', () => {
        expect(() => findBestGroupFromFile(tempFilePath, 'HyperActive')).toThrow('Unknown state');
    });
});
