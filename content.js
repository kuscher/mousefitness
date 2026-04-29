let lastX = null;
let lastY = null;
let accumulatedPixels = 0;
let isTracking = true;

// Load initial settings
chrome.storage.local.get(['trackingEnabled'], (result) => {
  if (result.trackingEnabled !== undefined) {
    isTracking = result.trackingEnabled;
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.trackingEnabled) {
    isTracking = changes.trackingEnabled.newValue;
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
    accumulatedPixels += distance;
  }

  lastX = currentX;
  lastY = currentY;
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
