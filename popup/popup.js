document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const totalDistanceEl = document.getElementById('total-distance');
  const todayDistanceEl = document.getElementById('today-distance');
  const bestHourEl = document.getElementById('best-hour');
  const milestonesList = document.getElementById('milestones');
  const graphRangeSelect = document.getElementById('graph-range');
  
  // Settings
  const trackingToggle = document.getElementById('tracking-toggle');
  const unitToggle = document.getElementById('unit-toggle');
  const dpiInput = document.getElementById('dpi-input');
  const saveDpiBtn = document.getElementById('save-dpi');
  const dpiSaveMsg = document.getElementById('dpi-save-msg');
  const overrideDpiToggle = document.getElementById('override-dpi-toggle');
  const dpiStatus = document.getElementById('dpi-status');

  let chartInstance = null;
  let currentData = {};

  // --- Constants ---
  const MILESTONES = [
    { distance: 1, name: "Baby Steps", desc: "You moved your mouse 1 meter." },
    { distance: 10, name: "Getting Started", desc: "10 meters! Keep it up." },
    { distance: 100, name: "100m Dash", desc: "Sprinting across the screen." },
    { distance: 1000, name: "1K Run", desc: "A solid kilometer of movement." },
    { distance: 5000, name: "5K Finisher", desc: "You've run a 5K with your fingers!" },
    { distance: 10000, name: "10K Finisher", desc: "Incredible 10K milestone." },
    { distance: 21097, name: "Half Marathon", desc: "21.1km! Halfway to crazy." },
    { distance: 42195, name: "Marathon", desc: "42.2km! You are a mouse athlete." }
  ];

  // --- Tab Switching ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // --- Core Logic ---
  
  function getDistanceString(pixels, dpi, system) {
    // 1 inch = 2.54 cm.  pixels / dpi = inches.
    const inches = pixels / dpi;
    const cm = inches * 2.54;
    const meters = cm / 100;
    
    if (system === 'metric') {
      if (meters < 1) {
        return { value: cm.toFixed(1), unit: 'cm', rawMeters: meters };
      } else if (meters < 1000) {
        return { value: meters.toFixed(2), unit: 'm', rawMeters: meters };
      } else {
        return { value: (meters / 1000).toFixed(2), unit: 'km', rawMeters: meters };
      }
    } else {
      // Imperial
      const feet = inches / 12;
      const miles = feet / 5280;
      
      if (feet < 3) {
        return { value: inches.toFixed(1), unit: 'in', rawMeters: meters };
      } else if (miles < 1) {
        return { value: feet.toFixed(1), unit: 'ft', rawMeters: meters };
      } else {
        return { value: miles.toFixed(2), unit: 'mi', rawMeters: meters };
      }
    }
  }

  function updateDashboard(data) {
    const isOverride = data.dpiOverride || false;
    const dpi = isOverride ? (data.dpi || 96) : (data.autoDpi || 96);
    const unit = data.unit || 'metric';
    const totalPixels = data.totalPixels || 0;
    
    // Total Distance
    const totalDist = getDistanceString(totalPixels, dpi, unit);
    totalDistanceEl.innerHTML = `${totalDist.value} <span class="unit">${totalDist.unit}</span>`;
    
    // Today's Distance & Best Hour
    const now = new Date();
    const dayKey = now.toISOString().split('T')[0];
    const daily = data.daily || {};
    const todayPixels = daily[dayKey] || 0;
    
    const todayDist = getDistanceString(todayPixels, dpi, unit);
    todayDistanceEl.innerHTML = `${todayDist.value} <span class="unit">${todayDist.unit}</span>`;
    
    // Best Hour
    const hourly = data.hourly || {};
    let bestHourPixels = 0;
    let bestHourStr = "-";
    
    Object.keys(hourly).forEach(k => {
      if (k.startsWith(dayKey)) {
        if (hourly[k] > bestHourPixels) {
          bestHourPixels = hourly[k];
          const hr = k.split('-')[3];
          bestHourStr = `${hr}:00`;
        }
      }
    });
    
    if (bestHourPixels > 0) {
      const bestHourDist = getDistanceString(bestHourPixels, dpi, unit);
      bestHourEl.textContent = `Best hour (${bestHourStr}): ${bestHourDist.value}${bestHourDist.unit}`;
    } else {
      bestHourEl.textContent = `Best hour: -`;
    }

    renderMilestones(totalDist.rawMeters);
    updateChart();
  }

  function renderMilestones(totalMeters) {
    milestonesList.innerHTML = '';
    MILESTONES.forEach(m => {
      const isUnlocked = totalMeters >= m.distance;
      const li = document.createElement('li');
      li.className = `milestone-item ${isUnlocked ? '' : 'locked'}`;
      
      li.innerHTML = `
        <div class="milestone-icon">${isUnlocked ? '✓' : '🔒'}</div>
        <div class="milestone-details">
          <div class="milestone-title">${m.name} (${m.distance >= 1000 ? m.distance/1000 + 'km' : m.distance + 'm'})</div>
          <div class="milestone-desc">${m.desc}</div>
        </div>
      `;
      milestonesList.appendChild(li);
    });
  }

  function updateChart() {
    const range = graphRangeSelect.value;
    const isOverride = currentData.dpiOverride || false;
    const dpi = isOverride ? (currentData.dpi || 96) : (currentData.autoDpi || 96);
    const unit = currentData.unit || 'metric';
    
    let labels = [];
    let chartData = [];
    
    const now = new Date();
    
    if (range === 'today') {
      // 10 minute intervals for today
      const tenMin = currentData.tenMin || {};
      const dayKey = now.toISOString().split('T')[0];
      
      for (let i = 0; i < 24; i++) {
        const hrStr = i.toString().padStart(2, '0');
        for (let j = 0; j < 60; j += 10) {
          const minStr = j.toString().padStart(2, '0');
          const key = `${dayKey}-${hrStr}-${minStr}`;
          
          if (tenMin[key] || i <= now.getHours()) {
             // Only show up to current hour to keep graph clean, or show all 24h?
             // Show all available data for today
          }
        }
      }
      
      // Let's just extract all 10-min keys for today and sort them
      const todayKeys = Object.keys(tenMin).filter(k => k.startsWith(dayKey)).sort();
      labels = todayKeys.map(k => k.split('-')[3] + ':' + k.split('-')[4]);
      chartData = todayKeys.map(k => {
        const dist = getDistanceString(tenMin[k], dpi, unit);
        return parseFloat(dist.value);
      });
      
      if (labels.length === 0) {
        labels = ["No activity"];
        chartData = [0];
      }
      
    } else if (range === 'week') {
      // Last 7 days
      const daily = currentData.daily || {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayKey = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        const dist = getDistanceString(daily[dayKey] || 0, dpi, unit);
        chartData.push(parseFloat(dist.value));
      }
    } else if (range === 'month') {
      // Last 30 days
      const daily = currentData.daily || {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayKey = d.toISOString().split('T')[0];
        labels.push(d.getDate());
        const dist = getDistanceString(daily[dayKey] || 0, dpi, unit);
        chartData.push(parseFloat(dist.value));
      }
    }

    const ctx = document.getElementById('activity-chart').getContext('2d');
    
    if (chartInstance) {
      chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: `Distance (${unit === 'metric' ? 'm/cm/km' : 'in/ft/mi'})`,
          data: chartData,
          backgroundColor: '#cae6ff',
          borderColor: '#006493',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // --- Initialization & Event Listeners ---
  chrome.storage.local.get(null, (result) => {
    currentData = result;
    
    // Init settings UI
    trackingToggle.checked = result.trackingEnabled !== false;
    unitToggle.value = result.unit || 'metric';
    
    const isOverride = result.dpiOverride || false;
    overrideDpiToggle.checked = isOverride;
    dpiInput.disabled = !isOverride;
    saveDpiBtn.disabled = !isOverride;
    
    dpiInput.value = result.dpi || 96;
    
    if (isOverride) {
      dpiStatus.textContent = "Manual override active";
      dpiStatus.style.color = "var(--md-sys-color-outline)";
    } else {
      dpiStatus.textContent = `Auto-calculated: ${result.autoDpi || 96}`;
      dpiStatus.style.color = "var(--md-sys-color-primary)";
    }
    
    updateDashboard(result);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        currentData[key] = newValue;
      }
      updateDashboard(currentData);
    }
  });

  graphRangeSelect.addEventListener('change', updateChart);

  // Settings Events
  trackingToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ trackingEnabled: e.target.checked });
  });

  unitToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ unit: e.target.value });
  });

  overrideDpiToggle.addEventListener('change', (e) => {
    const isOverride = e.target.checked;
    chrome.storage.local.set({ dpiOverride: isOverride });
    dpiInput.disabled = !isOverride;
    saveDpiBtn.disabled = !isOverride;
    
    if (isOverride) {
      dpiStatus.textContent = "Manual override active";
      dpiStatus.style.color = "var(--md-sys-color-outline)";
    } else {
      dpiStatus.textContent = `Auto-calculated: ${currentData.autoDpi || 96}`;
      dpiStatus.style.color = "var(--md-sys-color-primary)";
    }
  });

  saveDpiBtn.addEventListener('click', () => {
    const val = parseInt(dpiInput.value, 10);
    if (!isNaN(val) && val > 0) {
      chrome.storage.local.set({ dpi: val }, () => {
        dpiSaveMsg.classList.add('show');
        setTimeout(() => dpiSaveMsg.classList.remove('show'), 2000);
      });
    }
  });
});
