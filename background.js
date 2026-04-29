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
    pendingPixels += message.pixels;
    scheduleSave();
  }
});

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
    
    chrome.storage.local.get(['totalPixels', 'daily', 'hourly', 'tenMin'], (result) => {
      const totalPixels = (result.totalPixels || 0) + pixelsToSave;
      const daily = result.daily || {};
      const hourly = result.hourly || {};
      const tenMin = result.tenMin || {};
      
      daily[dayKey] = (daily[dayKey] || 0) + pixelsToSave;
      hourly[hourKey] = (hourly[hourKey] || 0) + pixelsToSave;
      tenMin[tenMinKey] = (tenMin[tenMinKey] || 0) + pixelsToSave;
      
      chrome.storage.local.set({
        totalPixels,
        daily,
        hourly,
        tenMin
      });
    });
  }, 1000); // Save every 1 second to minimize data loss and increase responsiveness
}
