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
