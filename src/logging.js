// ================= LOGGING TIMER FUNCTIONALITY ===================

// Timer state management
let activeLogTimer = null;
let activeLogButton = null;

// DOM elements
const logOnlyEEGButton = document.getElementById('logOnlyEEGButton');
const logEEGandNoiseButton = document.getElementById('logEEGandNoiseButton');

// Timer duration in milliseconds (2 minutes)
const LOG_TIMER_DURATION = 2 * 60 * 1000;

// Helper: Format time as MM:SS
function formatTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}m`;
}

// Helper: Set button icon
function setLogButtonIcon(button, isActive) {
    const img = button.querySelector('.playPauseImgInButton');
    img.src = isActive ? 'assets/pause.svg' : 'assets/play.svg';
}

// Helper: Update button text with timer
function updateLogButtonText(button, timeRemaining) {
    const baseText = button === logOnlyEEGButton ? 'Log EEG (No Noise)' : 'Log EEG + Noise';
    if (timeRemaining > 0) {
        button.innerHTML = `${baseText}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${formatTime(timeRemaining)} <img src="assets/pause.svg" class="playPauseImgInButton">`;
    } else {
        button.innerHTML = `${baseText} <img src="assets/play.svg" class="playPauseImgInButton">`;
    }
}

// Helper: Stop active timer
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

// Helper: Start timer for a specific button
function startLogTimer(button) {
    // Stop any existing timer first
    stopActiveTimer();
    
    let timeRemaining = LOG_TIMER_DURATION;
    activeLogButton = button;
    
    // Update button immediately
    updateLogButtonText(button, timeRemaining);
    setLogButtonIcon(button, true);
    
    // Start countdown
    activeLogTimer = setInterval(() => {
        timeRemaining -= 1000;
        
        if (timeRemaining <= 0) {
            // Timer finished
            stopActiveTimer();
            // TODO: Call actual logging function here
            console.log(`Logging completed for ${button === logOnlyEEGButton ? 'EEG only' : 'EEG + Noise'}`);
        } else {
            // Update button text
            updateLogButtonText(button, timeRemaining);
        }
    }, 1000);
}

// Event listeners for log buttons
logOnlyEEGButton.addEventListener('click', () => {
    if (activeLogButton === logOnlyEEGButton) {
        // Stop current timer
        stopActiveTimer();
    } else {
        // Start new timer
        startLogTimer(logOnlyEEGButton);
    }
});

logEEGandNoiseButton.addEventListener('click', () => {
    if (activeLogButton === logEEGandNoiseButton) {
        // Stop current timer
        stopActiveTimer();
    } else {
        // Start new timer
        startLogTimer(logEEGandNoiseButton);
    }
});

// ================= LOGGING FUNCTIONS (TO BE IMPLEMENTED) ===================

// Function to start EEG-only logging
function startEEGOnlyLogging() {
    // TODO: Implement actual EEG logging logic
    // This is for baseline of the user's brain activity
    console.log('Starting EEG-only logging...');
}

// Function to start EEG + Noise logging
function startEEGAndNoiseLogging() {
    // TODO: Implement actual EEG + Noise logging logic
    console.log('Starting EEG + Noise logging...');
}

// Function to stop logging
function stopLogging() {
    // TODO: Implement actual logging stop logic
    // I think the EEG AND Noise logging should just have two parameters more in the logging (so e.g. nosieType='White Noise', noiseLevel='Low')
    // compared to the EEG only logging 
    console.log('Stopping logging...');
}

// Export functions for future use
window.loggingModule = {
    startEEGOnlyLogging,
    startEEGAndNoiseLogging,
    stopLogging
}; 