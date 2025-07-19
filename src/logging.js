// ================= LOGGING TIMER FUNCTIONALITY ===================

let activeLogTimer = null;
let activeLogButton = null;

const logOnlyEEGButton = document.getElementById('logOnlyEEGButton');
const logEEGandNoiseButton = document.getElementById('logEEGandNoiseButton');

// Timer duration in milliseconds (2 minutes)
const LOG_TIMER_DURATION = 2 * 60 * 1000;

function formatTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}m`;
}

function setLogButtonIcon(button, isActive) {
    const img = button.querySelector('.playPauseImgInButton');
    img.src = isActive ? 'assets/pause.svg' : 'assets/play.svg';
}

function updateLogButtonText(button, timeRemaining) {
    const baseText = button === logOnlyEEGButton ? 'Log EEG (No Noise)' : 'Log EEG + Noise';
    if (timeRemaining > 0) {
        button.innerHTML = `${baseText}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${formatTime(timeRemaining)} <img src="assets/pause.svg" class="playPauseImgInButton">`;
    } else {
        button.innerHTML = `${baseText} <img src="assets/play.svg" class="playPauseImgInButton">`;
    }
}

function stopActiveTimer() {
    if (activeLogTimer) {
        clearInterval(activeLogTimer);
        activeLogTimer = null;
    }
    if (activeLogButton) {
        updateLogButtonText(activeLogButton, 0);
        setLogButtonIcon(activeLogButton, false);
        activeLogButton = null;
    }
}

function startLogTimer(button) {
    stopActiveTimer();
    
    let timeRemaining = LOG_TIMER_DURATION;
    activeLogButton = button;
    
    updateLogButtonText(button, timeRemaining);
    setLogButtonIcon(button, true);
    
    activeLogTimer = setInterval(() => {
        timeRemaining -= 1000;
        
        if (timeRemaining <= 0) {
            stopActiveTimer();
            window.api.notifyLoggingStopped();
            console.log(`Logging completed for ${button === logOnlyEEGButton ? 'EEG only' : 'EEG + Noise'}`);
        } else {
            updateLogButtonText(button, timeRemaining);
        }
    }, 1000);
}

logOnlyEEGButton.addEventListener('click', () => {
    if (activeLogButton === logOnlyEEGButton) {
        stopActiveTimer();
    } else {
        startLogTimer(logOnlyEEGButton);
    }
});

logEEGandNoiseButton.addEventListener('click', () => {
    if (activeLogButton === logEEGandNoiseButton) {
        stopActiveTimer();
    } else {
        startLogTimer(logEEGandNoiseButton);
    }
});