function sayHello() {
  alert('Hello from renderer process!');
}

// Directory selection button functionality
const folderButton = document.getElementById('folderButton');
const stateButton = document.getElementById('stateToAchieveButton');

// Initialize the folder button with the default path
folderButton.textContent = 'Folder: ...';

// Handle directory selection
folderButton.addEventListener('click', async () => {
  const selectedPath = await window.api.selectDirectory();
  if (selectedPath) {
    // Display only the last part of the path
    const pathParts = selectedPath.split(/[\\/]/);
    const displayPath = pathParts[pathParts.length - 1];
    folderButton.textContent = `Folder: ${displayPath}`;
  }
});

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
  { id: 'whiteNoiseLowButton',   type: 'white',  volumeId: 'lowVolumeSlider' },
  { id: 'whiteNoiseMiddleButton',type: 'white',  volumeId: 'middleVolumeSlider' },
  { id: 'whiteNoiseHighButton',  type: 'white',  volumeId: 'highVolumeSlider' },
  { id: 'rightSkewedNoiseLowButton',   type: 'right', volumeId: 'lowVolumeSlider' },
  { id: 'rightSkewedNoiseMiddleButton',type: 'right', volumeId: 'middleVolumeSlider' },
  { id: 'rightSkewedNoiseHighButton',  type: 'right', volumeId: 'highVolumeSlider' },
  { id: 'leftSkewedNoiseLowButton',   type: 'left', volumeId: 'lowVolumeSlider' },
  { id: 'leftSkewedNoiseMiddleButton',type: 'left', volumeId: 'middleVolumeSlider' },
  { id: 'leftSkewedNoiseHighButton',  type: 'left', volumeId: 'highVolumeSlider' },
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
studyButtons.forEach(({ id, type, volumeId }) => {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => {
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
