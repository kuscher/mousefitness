let lastX = null;
let lastY = null;
let accumulatedPixels = 0;
let isTracking = true;
let energyGelMode = false;

// Auto-calculate DPI
const calculatedDpi = Math.round(96 * window.devicePixelRatio);
chrome.storage.local.get(['trackingEnabled', 'energyGelMode', 'autoDpi'], (result) => {
  if (result.trackingEnabled !== undefined) {
    isTracking = result.trackingEnabled;
  }
  if (result.energyGelMode !== undefined) {
    energyGelMode = result.energyGelMode;
  }
  // Store the calculated DPI so popup can use it
  if (result.autoDpi !== calculatedDpi) {
    chrome.storage.local.set({ autoDpi: calculatedDpi });
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.trackingEnabled) isTracking = changes.trackingEnabled.newValue;
    if (changes.energyGelMode) energyGelMode = changes.energyGelMode.newValue;
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isTracking) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  if (lastX !== null && lastY !== null) {
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Smoothing: ignore micro-jitters unless in Energy Gel Mode
    const threshold = energyGelMode ? 0 : 3; 
    
    if (distance > threshold) {
      accumulatedPixels += distance;
      lastX = currentX;
      lastY = currentY;
    }
  } else {
    lastX = currentX;
    lastY = currentY;
  }
});

// Reset coordinates on mouse leave/enter to avoid jumps
document.addEventListener('mouseleave', () => {
  lastX = null;
  lastY = null;
});
document.addEventListener('mouseenter', (e) => {
  lastX = e.clientX;
  lastY = e.clientY;
});

// Periodically send accumulated pixels to background script
setInterval(() => {
  if (accumulatedPixels > 0) {
    chrome.runtime.sendMessage({
      type: "ADD_DISTANCE",
      pixels: accumulatedPixels
    });
    accumulatedPixels = 0;
  }
}, 2000);
