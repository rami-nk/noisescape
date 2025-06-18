document.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('volumeSlider');
    const thumbLabel = document.getElementById('thumbLabel');
    
    // Update the --value CSS variable and thumb label when slider changes
    volumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        volumeSlider.style.setProperty('--value', value);
        thumbLabel.textContent = value;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const sliders = [
        { id: 'lowVolumeSlider', labelId: 'lowThumbLabel', defaultValue: 3 },
        { id: 'middleVolumeSlider', labelId: 'middleThumbLabel', defaultValue: 5 },
        { id: 'highVolumeSlider', labelId: 'highThumbLabel', defaultValue: 7 }
    ];

    sliders.forEach(slider => {
        const element = document.getElementById(slider.id);
        const label = document.getElementById(slider.labelId);
        element.addEventListener('input', (e) => {
            element.style.setProperty('--value', e.target.value);
            label.textContent = e.target.value;
        });
    });
});