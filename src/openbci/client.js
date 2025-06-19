const {BoardIds, BoardShim, DataFilter, WindowOperations} = require("brainflow");
const { ipcMain } = require('electron');

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let streamInterval = null;
let board = null;

const connectToBoard = async (mainWindow) => {
    const boardId = BoardIds.CYTON_BOARD;
    board = new BoardShim(boardId, {
        serialPort: '/dev/cu.usbserial-DN0093R0'
    });

    board.prepareSession();
    console.log("Session prepared.");

    board.startStream();
    console.log("Streaming started.");

    await sleep(5000);

    const eegChannels = BoardShim.getEegChannels(boardId);
    const samplingRate = BoardShim.getSamplingRate(boardId);
    const windowSize = 128;

    streamInterval = setInterval(() => {
        const data = board.getCurrentBoardData(windowSize);
        let bandPowers = {delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0};
        let validChannels = 0;

        for (const channel of eegChannels) {
            const channelData = data[channel];

            if (!channelData || channelData.length < windowSize) {
                console.log(`Not enough data for channel ${channel}, only ${channelData.length} samples available`);
                continue;
            }

            const [psd, freq] = DataFilter.getPsdWelch(
                channelData,
                windowSize,
                Math.floor(windowSize / 2),
                samplingRate,
                WindowOperations.HANNING
            );

            bandPowers.delta = DataFilter.getBandPower([psd, freq], 2, 4);
            bandPowers.theta = DataFilter.getBandPower([psd, freq], 4, 7);
            bandPowers.alpha = DataFilter.getBandPower([psd, freq], 7, 12);
            bandPowers.beta = DataFilter.getBandPower([psd, freq], 12, 29);
            bandPowers.gamma = DataFilter.getBandPower([psd, freq], 29, 100);
            validChannels++;
            console.log(`Channel ${channel}: Δ=${bandPowers.delta.toFixed(2)} Θ=${bandPowers.theta.toFixed(2)} α=${bandPowers.alpha.toFixed(2)} β=${bandPowers.beta.toFixed(2)} γ=${bandPowers.gamma.toFixed(2)}`);
        }

        if (validChannels > 0) {
            for (let key in bandPowers) {
                bandPowers[key] /= validChannels;
                bandPowers[key] = Number(bandPowers[key].toFixed(2));
            }
            mainWindow.webContents.send('band-powers', bandPowers);
            console.log("Sent:", bandPowers);
        }
    }, 1000);
}

const disconnectFromBoard = async () => {
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
    }
    if (board) {
        await board.stopStream();
        await board.releaseSession();
        console.log("Board disconnected and session released.");
        board = null;
    }
}

module.exports = {connectToBoard, disconnectFromBoard};