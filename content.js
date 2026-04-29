let lastX = null;
let lastY = null;
let accumulatedPixels = 0;
let isTracking = true;

// Auto-calculate DPI
const calculatedDpi = Math.round(96 * window.devicePixelRatio);
chrome.storage.local.get(['trackingEnabled', 'autoDpi'], (result) => {
  if (result.trackingEnabled !== undefined) {
    isTracking = result.trackingEnabled;
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
    
    // Smoothing: ignore micro-jitters
    const threshold = 3; 
    
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

function flushDistance() {
  if (accumulatedPixels > 0) {
    chrome.runtime.sendMessage({
      type: "ADD_DISTANCE",
      pixels: accumulatedPixels
    });
    accumulatedPixels = 0;
  }
}

// Periodically send accumulated pixels to background script
setInterval(flushDistance, 1000);

// Flush immediately when page unloads or becomes hidden to prevent data loss
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushDistance();
  }
});
window.addEventListener('pagehide', flushDistance);
