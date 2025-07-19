const { evaluateGroup } = require('../evaluation/evaluator');

describe('evaluateGroup', () => {
    const baseReadings = [
        { alpha: 100, beta: 300, theta: 60, delta: 20, gamma: 500 },
        { alpha: 110, beta: 320, theta: 65, delta: 22, gamma: 520 },
        { alpha: 90,  beta: 310, theta: 62, delta: 18, gamma: 510 }
    ];

    test('optimizes alpha only (Relaxed)', () => {
        const stateDef = {
            optimize: ['alpha'],
            weight: [1]
        };

        const score = evaluateGroup(baseReadings, stateDef);
        const expectedAlphaAvg = (100 + 110 + 90) / 3;
        expect(score).toBeCloseTo(expectedAlphaAvg, 5);
    });

    test('optimizes beta (0.7) and alpha (0.3), penalizes delta (Focused)', () => {
        const stateDef = {
            optimize: ['beta', 'alpha'],
            penalize: ['delta'],
            weight: [0.7, 0.3]
        };

        const avgBeta = (300 + 320 + 310) / 3;
        const avgAlpha = (100 + 110 + 90) / 3;
        const avgDelta = (20 + 22 + 18) / 3;

        const expectedScore = (0.7 * avgBeta) + (0.3 * avgAlpha) - avgDelta;
        const score = evaluateGroup(baseReadings, stateDef);

        expect(score).toBeCloseTo(expectedScore, 5);
    });

    test('optimizes theta, moderates alpha (Meditative)', () => {
        const stateDef = {
            optimize: ['theta'],
            moderate: ['alpha'],
            weight: [1]
        };

        const avgTheta = (60 + 65 + 62) / 3;
        const avgAlpha = (100 + 110 + 90) / 3;
        const expectedPenalty = Math.abs(100 - avgAlpha);

        const expectedScore = avgTheta - expectedPenalty;
        const score = evaluateGroup(baseReadings, stateDef);

        expect(score).toBeCloseTo(expectedScore, 5);
    });

    test('returns -Infinity for empty readings', () => {
        const stateDef = { optimize: ['alpha'], weight: [1] };
        const score = evaluateGroup([], stateDef);
        expect(score).toBe(-Infinity);
    });

    test('handles missing weights gracefully', () => {
        const stateDef = {
            optimize: ['beta', 'alpha'],
            weight: []
        };

        const avgBeta = (300 + 320 + 310) / 3;
        const avgAlpha = (100 + 110 + 90) / 3;

        const expectedScore = avgBeta + avgAlpha;
        const score = evaluateGroup(baseReadings, stateDef);

        expect(score).toBeCloseTo(expectedScore, 5);
    });

    test('skips bands that are missing in readings', () => {
        const stateDef = {
            optimize: ['nonexistent'],
            weight: [1]
        };

        const score = evaluateGroup(baseReadings, stateDef);
        expect(score).toBe(0);
    });
});
