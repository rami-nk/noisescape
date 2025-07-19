const { BoardIds, BoardShim, DataFilter, WindowOperations } = require("brainflow");
const { ipcMain } = require('electron');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let streamInterval = null;
let board = null;

const connectToBoard = async (mainWindow, config) => {
    try {
        const boardType = config.boardType || "synthetic";
        let boardId;
        switch (boardType) {
            case "synthetic": {
                boardId = BoardIds.SYNTHETIC_BOARD;
                board = new BoardShim(boardId, {});
                break;
            }
            case "cyton": {
                const serialPort = config.serialPort || '/dev/cu.usbserial-DN0093R0';
                boardId = BoardIds.CYTON_BOARD;
                board = new BoardShim(boardId, { serialPort });
                break;
            }
            default:
                throw new Error(`Unknown board type: ${boardType}`);
        }

        mainWindow.webContents.send('bci-connection-prepare');

        logToFrontend(mainWindow, "Preparing session...")
        board.prepareSession();
        logToFrontend(mainWindow, "Session prepared.")
        logToFrontend(mainWindow, "Starting streaming session ...")
        board.startStream();
        logToFrontend(mainWindow, "Streaming started.")
        logToFrontend(mainWindow, "Warmup connection ...")
        await sleep(1000);
        logToFrontend(mainWindow, "Warmup done.")

        const eegChannels = BoardShim.getEegChannels(boardId);
        const samplingRate = BoardShim.getSamplingRate(boardId);
        const windowSize = 128;

        streamInterval = setInterval(() => {
            const data = board.getCurrentBoardData(windowSize);
            let bandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
            let validChannels = 0;

            for (const channel of eegChannels) {
                const channelData = data[channel];
                if (!channelData || channelData.length < windowSize) continue;

                const [psd, freq] = DataFilter.getPsdWelch(
                    channelData,
                    windowSize,
                    Math.floor(windowSize / 2),
                    samplingRate,
                    WindowOperations.HANNING
                );

                const delta = DataFilter.getBandPower([psd, freq], 2, 4);
                const theta = DataFilter.getBandPower([psd, freq], 4, 7);
                const alpha = DataFilter.getBandPower([psd, freq], 7, 12);
                const beta = DataFilter.getBandPower([psd, freq], 12, 29);
                const gamma = DataFilter.getBandPower([psd, freq], 29, 100);

                bandPowers.delta += delta;
                bandPowers.theta += theta;
                bandPowers.alpha += alpha;
                bandPowers.beta += beta;
                bandPowers.gamma += gamma;

                logToFrontend(mainWindow, `Channel ${channel}: { delta: ${delta}, theta: ${theta}, alpha: ${alpha}, beta: ${beta}, gamma: ${gamma} }`)
                validChannels++;
            }

            if (validChannels > 0) {
                for (let key in bandPowers) {
                    bandPowers[key] = Number((bandPowers[key] / validChannels).toFixed(2));
                }
                mainWindow.webContents.send('band-powers', bandPowers);

                logToFrontend(mainWindow, `Averaged: { delta: ${bandPowers.delta}, theta: ${bandPowers.theta}, alpha: ${bandPowers.alpha}, beta: ${bandPowers.beta}, gamma: ${bandPowers.gamma} }`)
            }
        }, 1000);

        mainWindow.webContents.send('bci-connection-success');
        logToFrontend(mainWindow, "Connection successful.")

    } catch (error) {
        console.error("Error during connection:", error);
        mainWindow.webContents.send('bci-connection-failed', error.message);
    }
};

const disconnectFromBoard = async (mainWindow) => {
    logToFrontend(mainWindow, "Disconnecting ...")
    mainWindow.webContents.send('bci-disconnection-prepare');
    try {
        if (streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
        }
        if (board) {
            await board.stopStream();
            await board.releaseSession();
            console.log("Board disconnected.");
            board = null;
            mainWindow.webContents.send('bci-disconnected');
            logToFrontend(mainWindow, "Connection successfully closed.")
        }
    } catch (error) {
        console.error("Error during disconnect:", error);
        mainWindow.webContents.send('bci-disconnection-failed', error.message);
    }
};

const logToFrontend = (mainWindow, message) => {
    console.log(message);
    mainWindow.webContents.send('bci-log-message', `[openbci-client] ${message}`);
};

module.exports = { connectToBoard, disconnectFromBoard };
