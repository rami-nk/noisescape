const stateButton = document.getElementById('stateToAchieveButton');

// Handle state selection
let isDropdownVisible = false;
const dropdownMenu = document.createElement('div');
dropdownMenu.style.display = 'none';
dropdownMenu.style.position = 'absolute';
dropdownMenu.style.backgroundColor = 'var(--bg)';
dropdownMenu.style.border = '1px solid var(--fontColor)';
dropdownMenu.style.borderRadius = '5px';
dropdownMenu.style.padding = '5px';
dropdownMenu.style.zIndex = '1000';

// Create the dropdown menu items
const states = ['Relaxed'];
states.forEach(state => {
  const item = document.createElement('div');
  item.textContent = state;
  item.style.padding = '5px 10px';
  item.style.cursor = 'pointer';
  item.style.color = 'var(--fontColor)';
  
  item.addEventListener('mouseover', () => {
    item.style.backgroundColor = '#333';
  });
  
  item.addEventListener('mouseout', () => {
    item.style.backgroundColor = 'transparent';
  });
  
  item.addEventListener('click', async () => {
    const success = await window.api.setState(state);
    if (success) {
      stateButton.textContent = `State To Achieve: ${state} ▼`;
      dropdownMenu.style.display = 'none';
      isDropdownVisible = false;
    }
  });
  
  dropdownMenu.appendChild(item);
});

// Add the dropdown menu to the document
document.body.appendChild(dropdownMenu);

// Handle state button click
stateButton.addEventListener('click', () => {
  if (!isDropdownVisible) {
    // Position the dropdown below the button
    const buttonRect = stateButton.getBoundingClientRect();
    dropdownMenu.style.top = `${buttonRect.bottom + window.scrollY}px`;
    dropdownMenu.style.left = `${buttonRect.left + window.scrollX}px`;
    dropdownMenu.style.display = 'block';
    isDropdownVisible = true;
  } else {
    dropdownMenu.style.display = 'none';
    isDropdownVisible = false;
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
  if (!stateButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
    dropdownMenu.style.display = 'none';
    isDropdownVisible = false;
  }
});

// ================= WHITE NOISE GENERATION & PLAYBACK ===================

// Web Audio context and nodes
let audioCtx = null;
let noiseSource = null;
let gainNode = null;
let filterBank = [];
let isPlaying = false;
let currentStudyButton = null;

// Frequency bands for 10 sliders (logarithmic spacing from 20Hz to 20kHz)
const bandFrequencies = [
  20, 40, 80, 160, 400, 1000, 2500, 6300, 12000, 20000
];

// Get DOM elements
const verticalSliderContainer = document.getElementById('verticalSliderContainer');
const verticalSliders = Array.from(verticalSliderContainer.getElementsByClassName('vertical-slider'));
const playPauseButtonFreePlay = document.getElementById('playPauseButtonFreePlay');
const volumeSlider = document.getElementById('volumeSlider');
const thumbLabel = document.getElementById('thumbLabel');

// Study buttons
const studyButtons = [
  { id: "whiteNoiseLowButton",    noiseType: "white", volumeSetting: "low",    type: 'white', volumeId: 'lowVolumeSlider' },
  { id: "whiteNoiseMiddleButton", noiseType: "white", volumeSetting: "middle", type: 'white', volumeId: 'middleVolumeSlider' },
  { id: "whiteNoiseHighButton",   noiseType: "white", volumeSetting: "high",   type: 'white', volumeId: 'highVolumeSlider' },
  { id: "rightSkewedNoiseLowButton",    noiseType: "brown", volumeSetting: "low",    type: 'right', volumeId: 'lowVolumeSlider' },
  { id: "rightSkewedNoiseMiddleButton", noiseType: "brown", volumeSetting: "middle", type: 'right', volumeId: 'middleVolumeSlider' },
  { id: "rightSkewedNoiseHighButton",   noiseType: "brown", volumeSetting: "high",   type: 'right', volumeId: 'highVolumeSlider' },
  { id: "leftSkewedNoiseLowButton",     noiseType: "pink",  volumeSetting: "low",    type: 'left', volumeId: 'lowVolumeSlider' },
  { id: "leftSkewedNoiseMiddleButton",  noiseType: "pink",  volumeSetting: "middle", type: 'left', volumeId: 'middleVolumeSlider' },
  { id: "leftSkewedNoiseHighButton",    noiseType: "pink",  volumeSetting: "high",   type: 'left', volumeId: 'highVolumeSlider' }
];

// Helper: Set all vertical sliders to a value (0-100)
function setAllSliders(valArr) {
  verticalSliders.forEach((slider, i) => {
    slider.value = valArr[i];
    slider.dispatchEvent(new Event('input'));
  });
}

// Helper: Get current slider values (0-100)
function getSliderValues() {
  return verticalSliders.map(slider => parseInt(slider.value));
}

// Helper: Set play/pause icon
function setPlayPauseIcon(imgElem, isPause) {
  imgElem.src = isPause ? 'assets/pause.svg' : 'assets/play.svg';
}

// Helper: Set study button UI
function setStudyButtonActive(btnElem, active) {
  if (active) {
    btnElem.style.borderWidth = '0.2rem';
    btnElem.style.borderColor = 'white';
    btnElem.style.boxShadow = '0 0 8px 2px white';
  } else {
    btnElem.style.borderWidth = '';
    btnElem.style.borderColor = '';
    btnElem.style.boxShadow = '';
  }
  // Set play/pause icon
  const img = btnElem.querySelector('.playPauseImgInButton');
  setPlayPauseIcon(img, active);
}

// Helper: Stop all noise
function stopNoise() {
  if (noiseSource) {
    noiseSource.disconnect();
    noiseSource.stop();
    noiseSource = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  filterBank.forEach(f => f.disconnect());
  filterBank = [];
  isPlaying = false;
  setPlayPauseIcon(playPauseButtonFreePlay, false);
  // Reset all study buttons
  studyButtons.forEach(({ id }) => {
    const btn = document.getElementById(id);
    setStudyButtonActive(btn, false);
  });
  currentStudyButton = null;
}

// Helper: Start white noise with given slider values and volume (1-9)
function startNoise(sliderVals, volume) {
  stopNoise();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // White noise buffer
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;

  // Create 10 bandpass filters
  filterBank = bandFrequencies.map((freq, i) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.5; // moderate width
    // Invert gain: lower slider value = more gain, higher value = less gain
    const gain = audioCtx.createGain();
    gain.gain.value = (100 - sliderVals[i]) / 100;
    noiseSource.connect(filter);
    filter.connect(gain);
    return gain;
  });

  // Mix all bands
  const merger = audioCtx.createGain();
  filterBank.forEach(gain => gain.connect(merger));

  // Volume
  gainNode = audioCtx.createGain();
  // Map volume 1-9 to 0.05-1.0 (log scale for better perception)
  gainNode.gain.value = Math.pow((volume / 9), 1.5);
  merger.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  noiseSource.start();
  isPlaying = true;
}

// ================= FREE PLAY LOGIC ===================

playPauseButtonFreePlay.addEventListener('click', () => {
  if (isPlaying && !currentStudyButton) {
    stopNoise();
    setPlayPauseIcon(playPauseButtonFreePlay, false);
  } else {
    // Get current slider values and volume
    const sliderVals = getSliderValues();
    const volume = parseInt(volumeSlider.value);
    startNoise(sliderVals, volume);
    setPlayPauseIcon(playPauseButtonFreePlay, true);
    // Deactivate all study buttons
    studyButtons.forEach(({ id }) => {
      const btn = document.getElementById(id);
      setStudyButtonActive(btn, false);
    });
    currentStudyButton = null;
  }
});

// If any slider is changed during free play, update the noise spectrum in realtime
verticalSliders.forEach((slider, i) => {
  slider.addEventListener('input', () => {
    if (isPlaying && !currentStudyButton && filterBank[i]) {
      filterBank[i].gain.value = (100 - slider.value) / 100;
    }
  });
});

// If volume slider is changed during free play, update volume in realtime
volumeSlider.addEventListener('input', () => {
  if (isPlaying && !currentStudyButton && gainNode) {
    gainNode.gain.value = Math.pow((parseInt(volumeSlider.value) / 9), 1.5);
  }
});

// ================= STUDY MODE LOGIC ===================
let enableLogging = false;
let noiseType;
let volumeSetting;

studyButtons.forEach(({ id, type, volumeId, noiseType: noise, volumeSetting: vol  }) => {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => {

    noiseType = noise;
    volumeSetting = vol;
    const img = document.getElementById(`${id}Img`);
    const isPlaying = img.src.includes("pause");
    img.src = isPlaying ?  "assets/play.svg" : "assets/pause.svg";
    // If this button is already active, stop
    if (currentStudyButton === id) {
      stopNoise();
      setStudyButtonActive(btn, false);
      setPlayPauseIcon(playPauseButtonFreePlay, false);
      return;
    }
    // Set slider preset
    let preset;
    if (type === 'white') {
      preset = Array(10).fill(50); // all sliders middle
    } else if (type === 'right') {
      // right-skewed: right (high freq) high, left (low freq) low (slider up = more sound, so low value)
      preset = Array.from({ length: 10 }, (_, i) => Math.round(i * (100 / 9)));
    } else if (type === 'left') {
      // left-skewed: left (low freq) high, right (high freq) low (slider up = more sound, so low value)
      preset = Array.from({ length: 10 }, (_, i) => 100 - Math.round(i * (100 / 9)));
    }
    setAllSliders(preset);
    // Get volume from defined slider
    const volElem = document.getElementById(volumeId);
    const volume = parseInt(volElem.value);
    startNoise(preset, volume);
    // UI updates
    setPlayPauseIcon(playPauseButtonFreePlay, false);
    studyButtons.forEach(({ id: otherId }) => {
      const otherBtn = document.getElementById(otherId);
      setStudyButtonActive(otherBtn, otherId === id);
    });
    currentStudyButton = id;
  });
});

const startLogging = document.getElementById('logEEGandNoiseButton');


const deltaCtx = document.getElementById('deltaChart').getContext('2d');
const thetaCtx = document.getElementById('thetaChart').getContext('2d');
const alphaCtx = document.getElementById('alphaChart').getContext('2d');
const betaCtx = document.getElementById('betaChart').getContext('2d');
const gammaCtx = document.getElementById('gammaChart').getContext('2d');

const deltaChart = new Chart(deltaCtx, createBandChartConfig());
const thetaChart = new Chart(thetaCtx, createBandChartConfig());
const alphaChart = new Chart(alphaCtx, createBandChartConfig());
const betaChart = new Chart(betaCtx, createBandChartConfig());
const gammaChart = new Chart(gammaCtx, createBandChartConfig());

function createBandChartConfig() {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: 'white',
        borderWidth: 2,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      animation: false,
      responsive: true,
      elements: {
        point:{
          radius: 0
        }
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

const connectBCIButton = document.getElementById('connectBCIButton');
const errorToast = document.getElementById('errorToast');

let connected = false;

function updateButtonState(state) {
  switch (state) {
    case 'connecting':
      connectBCIButton.innerText = 'Connecting...';
      connectBCIButton.disabled = true;
      connectBCIButton.style.opacity = "0.5";
      break;
    case 'connected':
      connectBCIButton.innerText = 'Disconnect';
      connectBCIButton.disabled = false;
      connectBCIButton.style.opacity = "1";
      connected = true;
      break;
    case 'disconnected':
      connectBCIButton.innerText = 'Connect OpenBCI Board';
      connectBCIButton.disabled = false;
      connectBCIButton.style.opacity = "1";
      connected = false;
      break;
    case 'disconnecting':
      connectBCIButton.innerText = 'Disconnecting...';
      connectBCIButton.disabled = true;
      connectBCIButton.style.opacity = "0.5";
      break;
  }
}

window.api.onBciConnectionPreparing(() => {
  updateButtonState('connecting');
});

window.api.onBciDisconnectionPreparing(() => {
  updateButtonState('disconnecting');
});

window.api.onBciConnectionSuccess(() => {
  updateButtonState('connected');
});

window.api.onBciConnectionFailed((errorMessage) => {
  updateButtonState('disconnected');
  showErrorToast(errorMessage);
});

window.api.onBciDisconnected(() => {
  updateButtonState('disconnected');
});

window.api.onBciDisconnectionFailed((errorMessage) => {
  updateButtonState('disconnected');
  showErrorToast(errorMessage);
});

connectBCIButton.addEventListener('click', () => {
  if (connected) {
    window.api.disconnectFromOpenBciBoard();
  } else {
    window.api.connectToOpenBciBoard();
  }
});

function showErrorToast(message) {
  errorToast.innerText = message;
  errorToast.classList.add('visible');
  setTimeout(() => {
    errorToast.classList.remove('visible');
  }, 5000);
}

function updateChart(chart, value) {
  const now = new Date().toLocaleTimeString();
  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(value);

  if (chart.data.labels.length > 30) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

window.api.onBandPowers((bandPowers) => {
  updateChart(deltaChart, bandPowers.delta);
  updateChart(thetaChart, bandPowers.theta);
  updateChart(alphaChart, bandPowers.alpha);
  updateChart(betaChart, bandPowers.beta);
  updateChart(gammaChart, bandPowers.gamma);

  if (enableLogging) {
    window.api.logEntry(bandPowers, noiseType, volumeSetting);
  }
});

const toggleLogsButton = document.getElementById('toggleLogsButton');
const logPanel = document.getElementById('logPanel');

toggleLogsButton.addEventListener('click', () => {
  logPanel.classList.toggle('hidden');
});

function appendLog(message) {
  const logContent = document.getElementById('logContent');
  logContent.textContent += message + '\n';

  const lines = logContent.textContent.split('\n');
  if (lines.length > 500) {
    logContent.textContent = lines.slice(-500).join('\n');
  }

  logPanel.scrollTop = logPanel.scrollHeight;
}

window.api.onBciLogMessage((message) => {
  appendLog(message);
});

const folderButton = document.getElementById('folderButton');

;(async () => {
  try {
    const cwd = await window.api.getCurrentDirectory();
    const display = cwd.split(/[\\/]/).pop() || cwd;
    folderButton.textContent = `Folder: ${display}`;
  } catch (err) {
    console.error('Could not fetch CWD:', err);
    folderButton.textContent = 'Folder: (unavailable)';
  }
})();

folderButton.addEventListener('click', async () => {
  const selectedPath = await window.api.selectDirectory();
  if (selectedPath) {
    const pathParts = selectedPath.split(/[\\/]/);
    const displayPath = pathParts[pathParts.length - 1];
    folderButton.textContent = `Folder: ${displayPath}`;
    window.api.setLogDirectory(selectedPath);
  }
});

const logNoisePlayButton = document.getElementById('logNoisePlayButton');

const adaptiveContainer = document.getElementById('adaptiveNoiseContainer');
const progressContainer = document.getElementById('adaptiveProgressContainer');
const progressBar       = document.getElementById('adaptiveProgressBar');
let adaptivePlaying = false;

adaptiveContainer.addEventListener('click', async () => {
  if (adaptivePlaying) {
    stopNoise();
    adaptivePlaying = false;
    setPlayPauseIcon(
        document.getElementById('playPauseButtonAdaptiveNoise'),
        false
    );
    return;
  }

  progressContainer.classList.remove('hidden');
  progressBar.style.width = '0%';

  const fakeProgress = new Promise(resolve => {
    let pct = 0;
    const interval = setInterval(() => {
      // advance by between 5%–15% each tick
      pct = Math.min(100, pct + 5 + Math.random()*10);
      progressBar.style.width = `${pct}%`;
      if (pct === 100) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  const cfgPromise = window.api.getAdaptiveNoiseConfig();

  const [cfg] = await Promise.all([cfgPromise, fakeProgress]);

  progressContainer.classList.add('hidden');

  if (!cfg) {
    showErrorToast('No adaptive config available');
    return;
  }

  const [noiseType, volumeSetting] = cfg.group.split('.');
  const mapping = {
    white: { low: 'whiteNoiseLowButton',    middle: 'whiteNoiseMiddleButton',    high: 'whiteNoiseHighButton' },
    brown: { low: 'rightSkewedNoiseLowButton', middle: 'rightSkewedNoiseMiddleButton', high: 'rightSkewedNoiseHighButton' },
    pink:  { low: 'leftSkewedNoiseLowButton',  middle: 'leftSkewedNoiseMiddleButton',  high: 'leftSkewedNoiseHighButton' },
  };
  const btnId = mapping[noiseType]?.[volumeSetting];
  if (!btnId) {
    showErrorToast(`Unknown adaptive group: ${cfg.group}`);
    return;
  }

  document.getElementById(btnId).click();

  adaptivePlaying = true;
  setPlayPauseIcon(
      document.getElementById('playPauseButtonAdaptiveNoise'),
      true
  );
});


startLogging.addEventListener('click', () => {
  if (enableLogging) {
    enableLogging = false;
    logNoisePlayButton.src = "assets/play.svg";
    window.api.saveLog();
    return;
  }
  logNoisePlayButton.src = "assets/pause.svg";
  enableLogging = true;
});


// If any defined volume slider is changed and its study button is active, update volume in realtime
['lowVolumeSlider', 'middleVolumeSlider', 'highVolumeSlider'].forEach((sliderId, idx) => {
  const slider = document.getElementById(sliderId);
  slider.addEventListener('input', () => {
    // If a study button is active and matches this volume
    if (currentStudyButton) {
      const btnIdx = studyButtons.findIndex(b => b.id === currentStudyButton);
      if (btnIdx !== -1 && studyButtons[btnIdx].volumeId === sliderId && gainNode) {
        gainNode.gain.value = Math.pow((parseInt(slider.value) / 9), 1.5);
      }
    }
  });
});

// If free play is started, stop study mode
// Already handled in playPauseButtonFreePlay click

// If any slider is changed, update the noise spectrum in realtime (free play or study mode)
verticalSliders.forEach((slider, i) => {
  slider.addEventListener('input', () => {
    if (isPlaying && filterBank[i]) {
      filterBank[i].gain.value = (100 - slider.value) / 100;
    }
  });
});
