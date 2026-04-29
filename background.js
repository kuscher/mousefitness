chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      totalPixels: 0,
      daily: {},
      hourly: {},
      tenMin: {},
      trackingEnabled: true,
      dpi: 96,
      unit: 'metric'
    });
  }
});

let pendingPixels = 0;
let saveTimeout = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_DISTANCE") {
    console.log(`Mouse Fitness Background: Received ${message.pixels} pixels from tab ${sender.tab?.id}`);
    pendingPixels += message.pixels;
    scheduleSave();
  }
});

const MILESTONES = [
  { distance: 1 },
  { distance: 10 },
  { distance: 100 },
  { distance: 1000 },
  { distance: 5000 },
  { distance: 10000 },
  { distance: 21097 },
  { distance: 42195 }
];

function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    const pixelsToSave = pendingPixels;
    pendingPixels = 0;
    if (pixelsToSave === 0) return;
    
    const now = new Date();
    const dayKey = now.toISOString().split('T')[0];
    const hourKey = dayKey + '-' + now.getHours().toString().padStart(2, '0');
    const min = Math.floor(now.getMinutes() / 10) * 10;
    const tenMinKey = hourKey + '-' + min.toString().padStart(2, '0');
    
    chrome.storage.local.get(['totalPixels', 'daily', 'hourly', 'tenMin', 'dpi', 'autoDpi', 'dpiOverride'], (result) => {
      const totalPixels = (result.totalPixels || 0) + pixelsToSave;
      const daily = result.daily || {};
      const hourly = result.hourly || {};
      const tenMin = result.tenMin || {};
      
      daily[dayKey] = (daily[dayKey] || 0) + pixelsToSave;
      hourly[hourKey] = (hourly[hourKey] || 0) + pixelsToSave;
      tenMin[tenMinKey] = (tenMin[tenMinKey] || 0) + pixelsToSave;
      
      // Calculate total meters for milestones badge
      const isOverride = result.dpiOverride || false;
      const currentDpi = isOverride ? (result.dpi || 96) : (result.autoDpi || 96);
      
      const totalInches = totalPixels / currentDpi;
      const totalCm = totalInches * 2.54;
      const totalMeters = totalCm / 100;
      
      let completedCount = 0;
      for (const milestone of MILESTONES) {
        if (totalMeters >= milestone.distance) {
          completedCount++;
        }
      }
      
      if (completedCount > 0) {
        chrome.action.setBadgeText({ text: String(completedCount) });
        chrome.action.setBadgeBackgroundColor({ color: '#4caf50' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
      
      chrome.storage.local.set({
        totalPixels,
        daily,
        hourly,
        tenMin
      });
    });
  }, 1000); // Save every 1 second to minimize data loss and increase responsiveness
}
