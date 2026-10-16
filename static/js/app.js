/**
 * AushadhiDrishti (औषधि दृष्टि) - Client Application Controller
 * Multilingual AI Prescription Scanner powered by Gemma 4
 */

// Global State
const state = {
  currentLang: localStorage.getItem('ad_lang') || 'en',
  currentTheme: localStorage.getItem('ad_theme') || 'dark',
  currentAnalysis: null,
  activeSpeech: null,
  isAnalyzing: false,
  apiConfig: {
    apiKeySet: false,
    model: 'gemma-4-it',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta'
  }
};

// Bilingual UI Dictionary
const I18N = {
  en: {
    appTitle: 'Aushadhi<span class="brand-gradient">Drishti</span>',
    appTagline: 'AI Prescription Intelligence & Safety Scanner',
    heroPill: '⚡ Powered by Gemma 4 Multimodal Vision',
    heroTitle: 'Decode Any Prescription with <span>Clinical Precision</span>',
    heroDesc: 'Eliminate doctor handwriting confusion, prevent dangerous drug-drug interactions, and view clear bilingual medication timetables.',
    dropTitle: 'Upload Doctor Prescription Scan',
    dropSub: 'Drag & drop image here, browse file, or snap with mobile camera',
    btnBrowse: '📁 Choose File',
    btnCamera: '📷 Take Photo',
    presetsTitle: '⚡ Quick Demo Prescriptions',
    badgeQuick: '1-Click Test',
    loadingTitle: 'AI Clinical Engine Analyzing...',
    loadingSub: 'Processing handwriting with Gemma 4 Vision & Pharmacology Safety Matrix',
    step1: 'Contrast & Edge Enhancement',
    step2: 'Gemma 4 Multimodal Vision',
    step3: 'Drug Interaction Verification',
    step4: 'Bilingual Timetable Synthesis',
    viewerTitle: 'Enhanced Prescription Scan',
    patientDetails: 'Patient Case Profile',
    lblPatient: 'Patient Name',
    lblDoctor: 'Doctor / Clinic',
    lblDate: 'Date',
    lblVitals: 'Demographics',
    summaryTitle: 'Patient Friendly Overview',
    btnListen: '🔊 Listen Aloud',
    btnStopListen: '⏹️ Stop Audio',
    interactionsTitle: '⚠️ Drug-Drug Interaction Safety Alerts',
    noInteractions: '✅ No adverse drug-drug interactions detected. Safe to administer as prescribed.',
    scheduleTitle: '📅 Daily Medication Timetable',
    slotMorning: '☀️ Morning (सुबह)',
    slotAfternoon: '🌤️ Afternoon (दोपहर)',
    slotNight: '🌙 Night (रात)',
    medsListTitle: '💊 Identified Medications & Clinical Guidance',
    lblDosage: 'Dosage',
    lblTiming: 'Timing & Food Instruction',
    lblUses: 'Purpose / Uses',
    lblWarnings: 'Precautions & Warnings',
    btnDownloadPDF: '📥 Print / Save Medical Card',
    btnScanNew: '🔄 Scan Another Prescription',
    btnSettings: '⚙️ API Settings',
    settingsTitle: 'Gemma 4 API Configuration',
    lblApiKey: 'API Key (Google AI Studio / Groq / OpenRouter / Custom)',
    lblApiBase: 'API Base URL',
    lblModel: 'Model Identifier',
    btnSaveConfig: 'Save Configuration',
    disclaimer: '⚕️ Medical Disclaimer: AushadhiDrishti is an AI-powered assistant designed for educational and informational support. Always consult a certified physician or pharmacist before changing or stopping medications.'
  },
  hi: {
    appTitle: 'औषधि <span class="brand-gradient">दृष्टि</span>',
    appTagline: 'एआई पर्चा विश्लेषक एवं दवा सुरक्षा प्रणाली',
    heroPill: '⚡ जेमा ४ (Gemma 4) मल्टीमॉडल विज़न द्वारा संचालित',
    heroTitle: 'डॉक्टर का लिखा पर्चा समझें <span>पूर्ण सटीकता के साथ</span>',
    heroDesc: 'खराब लिखावट की उलझन दूर करें, दवाओं के खतरनाक टकराव से बचें और आसान भाषा में दैनिक दवा समय-सारणी पाएं।',
    dropTitle: 'डॉक्टर का पर्चा (प्रिस्क्रिप्शन) अपलोड करें',
    dropSub: 'तस्वीर यहां खींचकर लाएं, फाइल चुनें या मोबाइल कैमरे से फोटो खींचें',
    btnBrowse: '📁 फाइल चुनें',
    btnCamera: '📷 फोटो खींचें',
    presetsTitle: '⚡ तैयार डेमो पर्चे (परीक्षण हेतु)',
    badgeQuick: '1-क्लिक टेस्ट',
    loadingTitle: 'एआई क्लीनिकल इंजन विश्लेषण कर रहा है...',
    loadingSub: 'जेमा ४ विज़न और औषधीय सुरक्षा मैट्रिक्स द्वारा लिखावट की जांच जारी है',
    step1: 'छवि स्पष्टता एवं कंट्रास्ट सुधार',
    step2: 'जेमा ४ मल्टीमॉडल स्कैनिंग',
    step3: 'दवा टकराव व सुरक्षा जांच',
    step4: 'द्विभाषी समय-सारणी निर्माण',
    viewerTitle: 'स्पष्ट किया गया पर्चा',
    patientDetails: 'मरीज़ एवं डॉक्टर का विवरण',
    lblPatient: 'मरीज़ का नाम',
    lblDoctor: 'चिकित्सक / अस्पताल',
    lblDate: 'तारीख',
    lblVitals: 'उम्र एवं लिंग',
    summaryTitle: 'मरीज़ हेतु सरल सारांश',
    btnListen: '🔊 बोलकर सुनाएं',
    btnStopListen: '⏹️ आवाज़ बंद करें',
    interactionsTitle: '⚠️ दवाओं के आपसी टकराव की चेतावनी',
    noInteractions: '✅ दवाओं के बीच कोई हानिकारक टकराव नहीं मिला। डॉक्टर के निर्देशानुसार सुरक्षित है।',
    scheduleTitle: '📅 दैनिक दवा समय-सारणी',
    slotMorning: '☀️ सुबह (Morning)',
    slotAfternoon: '🌤️ दोपहर (Afternoon)',
    slotNight: '🌙 रात (Night)',
    medsListTitle: '💊 पहचानी गई दवाएं एवं आवश्यक निर्देश',
    lblDosage: 'खुराक',
    lblTiming: 'लेने का समय व भोजन निर्देश',
    lblUses: 'दवा का उपयोग / उद्देश्य',
    lblWarnings: 'सावधानी एवं चेतावनी',
    btnDownloadPDF: '📥 मेडिकल कार्ड प्रिंट / सेव करें',
    btnScanNew: '🔄 दूसरा पर्चा स्कैन करें',
    btnSettings: '⚙️ API सेटिंग्स',
    settingsTitle: 'Gemma 4 API सेटिंग्स',
    lblApiKey: 'API Key (Google AI Studio / Groq / OpenRouter)',
    lblApiBase: 'API बेस URL',
    lblModel: 'मॉडल का नाम',
    btnSaveConfig: 'सेटिंग्स सहेजें',
    disclaimer: '⚕️ चिकित्सा अस्वीकरण: औषधि दृष्टि एक एआई सहायक प्रणाली है। किसी भी दवा को शुरू करने, बदलने या बंद करने से पहले डॉक्टर से परामर्श अवश्य लें।'
  }
};

// DOM References
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  cameraInput: document.getElementById('camera-input'),
  btnBrowse: document.getElementById('btn-browse'),
  btnCamera: document.getElementById('btn-camera'),
  loaderSection: document.getElementById('loader-section'),
  resultsContainer: document.getElementById('results-container'),
  inputGrid: document.getElementById('input-grid'),
  presetsList: document.getElementById('presets-list'),
  langEn: document.getElementById('lang-en'),
  langHi: document.getElementById('lang-hi'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  btnSettingsOpen: document.getElementById('btn-settings-open'),
  modalSettings: document.getElementById('modal-settings'),
  btnSettingsClose: document.getElementById('btn-settings-close'),
  formSettings: document.getElementById('form-settings'),
  inputApiKey: document.getElementById('input-api-key'),
  inputApiBase: document.getElementById('input-api-base'),
  inputModel: document.getElementById('input-model'),
  btnAudioSummary: document.getElementById('btn-audio-summary'),
  btnScanNew: document.getElementById('btn-scan-new'),
  btnPrintCard: document.getElementById('btn-print-card'),
  imagePreview: document.getElementById('image-preview'),
  // Dynamic fields
  patientName: document.getElementById('patient-name'),
  patientDoctor: document.getElementById('patient-doctor'),
  patientDate: document.getElementById('patient-date'),
  patientVitals: document.getElementById('patient-vitals'),
  safetyBanner: document.getElementById('safety-banner'),
  safetyIcon: document.getElementById('safety-icon'),
  safetyTitle: document.getElementById('safety-title'),
  safetyDesc: document.getElementById('safety-desc'),
  summaryText: document.getElementById('summary-text'),
  interactionsList: document.getElementById('interactions-list'),
  scheduleMorning: document.getElementById('schedule-morning'),
  scheduleAfternoon: document.getElementById('schedule-afternoon'),
  scheduleNight: document.getElementById('schedule-night'),
  medicationsCards: document.getElementById('medications-cards'),
  sourceTag: document.getElementById('source-tag')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupLanguage();
  setupTheme();
  setupEventListeners();
  loadSamplePresets();
  loadApiConfig();
});

// Setup Language Switcher
function setupLanguage() {
  setLanguage(state.currentLang);
  elements.langEn.addEventListener('click', () => setLanguage('en'));
  elements.langHi.addEventListener('click', () => setLanguage('hi'));
}

function setLanguage(lang) {
  state.currentLang = lang;
  localStorage.setItem('ad_lang', lang);

  if (lang === 'hi') {
    elements.langHi.classList.add('active');
    elements.langEn.classList.remove('active');
    document.body.classList.add('lang-hi');
  } else {
    elements.langEn.classList.add('active');
    elements.langHi.classList.remove('active');
    document.body.classList.remove('lang-hi');
  }

  // Update UI texts
  const t = I18N[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.innerHTML = t[key];
    }
  });

  // Re-render analysis if currently active
  if (state.currentAnalysis) {
    renderAnalysis(state.currentAnalysis);
  }
}

// Setup Theme
function setupTheme() {
  if (state.currentTheme === 'light') {
    document.body.classList.add('light-theme');
    elements.btnThemeToggle.innerHTML = '🌙';
  } else {
    document.body.classList.remove('light-theme');
    elements.btnThemeToggle.innerHTML = '☀️';
  }

  elements.btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    state.currentTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('ad_theme', state.currentTheme);
    elements.btnThemeToggle.innerHTML = isLight ? '🌙' : '☀️';
  });
}

// Event Listeners
function setupEventListeners() {
  // Drag and drop
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('drag-over');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('drag-over');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // Browse buttons
  elements.btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.fileInput.click();
  });

  elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
  });

  elements.btnCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.cameraInput.click();
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  elements.cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Actions
  elements.btnScanNew.addEventListener('click', resetToUpload);
  elements.btnPrintCard.addEventListener('click', () => window.print());
  elements.btnAudioSummary.addEventListener('click', toggleAudioSummary);

  // Settings Modal
  elements.btnSettingsOpen.addEventListener('click', () => {
    elements.modalSettings.classList.add('active');
  });

  elements.btnSettingsClose.addEventListener('click', () => {
    elements.modalSettings.classList.remove('active');
  });

  elements.modalSettings.addEventListener('click', (e) => {
    if (e.target === elements.modalSettings) {
      elements.modalSettings.classList.remove('active');
    }
  });

  elements.formSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apiKey = elements.inputApiKey.value.trim();
    const apiBase = elements.inputApiBase.value.trim();
    const model = elements.inputModel.value.trim();

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_base: apiBase, model: model })
      });
      const data = await res.json();
      alert(state.currentLang === 'hi' ? 'सेटिंग्स सफलतापूर्वक सुरक्षित की गईं!' : 'Configuration updated successfully!');
      elements.modalSettings.classList.remove('active');
      loadApiConfig();
    } catch (err) {
      alert('Failed to save settings: ' + err);
    }
  });
}

// Fetch Sample Presets
async function loadSamplePresets() {
  try {
    const res = await fetch('/api/samples');
    const samples = await res.json();
    renderPresetsList(samples);
  } catch (err) {
    console.error('Failed to load sample presets:', err);
  }
}

function renderPresetsList(samples) {
  elements.presetsList.innerHTML = '';
  const isHi = state.currentLang === 'hi';

  samples.forEach(s => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    
    let tagClass = 'tag-safe';
    if (s.id === 'arthritis_pain') tagClass = 'tag-danger';
    else if (s.id === 'infection_fever') tagClass = 'tag-acute';

    item.innerHTML = `
      <div class="preset-item-top">
        <span class="preset-title">${isHi ? s.title_hi : s.title_en}</span>
        <span class="preset-tag ${tagClass}">${s.tag}</span>
      </div>
      <div class="preset-desc">${isHi ? s.subtitle_hi : s.subtitle_en}</div>
    `;

    item.addEventListener('click', () => handleSampleSelect(s.id));
    elements.presetsList.appendChild(item);
  });
}

// Fetch Current API Config
async function loadApiConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    state.apiConfig = cfg;
    elements.inputApiBase.value = cfg.api_base;
    elements.inputModel.value = cfg.model;
    if (cfg.api_key_set) {
      elements.inputApiKey.placeholder = `Configured (${cfg.masked_key})`;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

// Handle File Upload
async function handleFileUpload(file) {
  if (state.isAnalyzing) return;
  startAnalysisAnimation();

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Analysis failed');
    }

    const data = await res.json();
    displayResults(data);
  } catch (err) {
    alert('Error analyzing prescription: ' + err.message);
    resetToUpload();
  }
}

// Handle Sample Preset Select
async function handleSampleSelect(presetId) {
  if (state.isAnalyzing) return;
  startAnalysisAnimation();

  try {
    const res = await fetch(`/api/analyze-sample/${presetId}`, {
      method: 'POST'
    });

    if (!res.ok) throw new Error('Failed to analyze sample preset');

    const data = await res.json();
    displayResults(data);
  } catch (err) {
    alert('Error: ' + err.message);
    resetToUpload();
  }
}

// Loading Animation
function startAnalysisAnimation() {
  state.isAnalyzing = true;
  elements.inputGrid.style.display = 'none';
  elements.resultsContainer.style.display = 'none';
  elements.loaderSection.style.display = 'block';

  // Step sequencer animation
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4')
  ];

  steps.forEach(s => s.className = 'loader-step-pill');
  if (steps[0]) steps[0].classList.add('active');

  setTimeout(() => {
    if (steps[0]) steps[0].classList.replace('active', 'done');
    if (steps[1]) steps[1].classList.add('active');
  }, 700);

  setTimeout(() => {
    if (steps[1]) steps[1].classList.replace('active', 'done');
    if (steps[2]) steps[2].classList.add('active');
  }, 1400);

  setTimeout(() => {
    if (steps[2]) steps[2].classList.replace('active', 'done');
    if (steps[3]) steps[3].classList.add('active');
  }, 2000);
}

// Display Results
function displayResults(data) {
  state.isAnalyzing = false;
  state.currentAnalysis = data;

  elements.loaderSection.style.display = 'none';
  elements.resultsContainer.style.display = 'grid';

  // Set image preview
  if (data.image_data_url) {
    elements.imagePreview.src = data.image_data_url;
  }

  renderAnalysis(data);

  // Smooth scroll into view
  elements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Render Content based on current language
function renderAnalysis(data) {
  const isHi = state.currentLang === 'hi';
  const analysis = data.analysis;
  const p = analysis.patient || {};

  // Patient Info
  elements.patientName.textContent = p.name || (isHi ? 'पहचाना नहीं गया' : 'Unspecified');
  elements.patientDoctor.textContent = p.doctor || (isHi ? 'अस्पताल / ओपीडी' : 'Hospital / OPD');
  elements.patientDate.textContent = p.date || (isHi ? 'आज' : 'Today');
  elements.patientVitals.textContent = p.age_gender || 'N/A';

  // Source Engine Tag
  if (elements.sourceTag) {
    elements.sourceTag.textContent = analysis.source || 'Gemma 4';
  }

  // Safety Banner
  const safety = analysis.safety || { level: 'safe' };
  elements.safetyBanner.className = `safety-banner ${safety.level}`;
  
  if (safety.level === 'danger') {
    elements.safetyIcon.textContent = '🚫';
  } else if (safety.level === 'caution') {
    elements.safetyIcon.textContent = '⚠️';
  } else {
    elements.safetyIcon.textContent = '✅';
  }

  elements.safetyTitle.textContent = isHi ? safety.badge_hi : safety.badge_en;
  elements.safetyDesc.textContent = isHi ? safety.summary_hi : safety.summary_en;

  // Summary Text
  elements.summaryText.textContent = isHi ? analysis.summary_hi : analysis.summary_en;

  // Drug-Drug Interactions
  renderInteractions(analysis.interactions || [], isHi);

  // Daily Schedule
  renderSchedule(analysis.medications || [], isHi);

  // Detailed Medication Cards
  renderMedicationCards(analysis.medications || [], isHi);
}

// Render Drug Interactions
function renderInteractions(interactions, isHi) {
  elements.interactionsList.innerHTML = '';
  
  if (interactions.length === 0) {
    elements.interactionsList.innerHTML = `
      <div class="interaction-item" style="border-left-color: #16a34a; background: rgba(22, 163, 74, 0.08);">
        <p style="color: #4ade80; font-weight: 600;">${isHi ? I18N.hi.noInteractions : I18N.en.noInteractions}</p>
      </div>
    `;
    return;
  }

  interactions.forEach(ix => {
    const div = document.createElement('div');
    div.className = `interaction-item ${ix.severity}`;
    
    const drugsBadge = (ix.drugs || []).map(d => d.toUpperCase()).join(' + ');
    const title = isHi ? ix.title_hi : ix.title_en;
    const desc = isHi ? ix.description_hi : ix.description_en;
    const action = isHi ? ix.action_hi : ix.action_en;

    div.innerHTML = `
      <div class="interaction-item-head">
        <span class="interaction-title">${title}</span>
        <span class="interaction-drugs-badge">${drugsBadge}</span>
      </div>
      <div class="interaction-desc">${desc}</div>
      <div class="interaction-action">👉 ${action}</div>
    `;
    elements.interactionsList.appendChild(div);
  });
}

// Render Daily Timetable
function renderSchedule(meds, isHi) {
  elements.scheduleMorning.innerHTML = '';
  elements.scheduleAfternoon.innerHTML = '';
  elements.scheduleNight.innerHTML = '';

  let mCount = 0, aCount = 0, nCount = 0;

  meds.forEach(m => {
    const freq = m.frequency || '';
    const timing = isHi ? m.timing_hi : m.timing_en;
    const name = m.generic_name || m.raw_name;

    // Morning check (1-x-x or 'morning' or 'breakfast')
    if (freq.startsWith('1') || freq.includes('Morning') || freq.includes('Twice') || freq.includes('Thrice') || freq.includes('सुबह')) {
      elements.scheduleMorning.appendChild(createSlotItem(name, m.dosage, timing));
      mCount++;
    }

    // Afternoon check (x-1-x or 'afternoon' or 'lunch')
    if (freq.includes('-1-') || freq.includes('Thrice') || freq.includes('Afternoon') || freq.includes('Lunch') || freq.includes('दोपहर')) {
      elements.scheduleAfternoon.appendChild(createSlotItem(name, m.dosage, timing));
      aCount++;
    }

    // Night check (x-x-1 or 'night' or 'bedtime')
    if (freq.endsWith('1') || freq.includes('Night') || freq.includes('Bedtime') || freq.includes('रात') || freq.includes('Twice')) {
      elements.scheduleNight.appendChild(createSlotItem(name, m.dosage, timing));
      nCount++;
    }
  });

  if (mCount === 0) elements.scheduleMorning.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-dim);">${isHi ? 'कोई दवा नहीं' : 'No morning meds'}</span>`;
  if (aCount === 0) elements.scheduleAfternoon.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-dim);">${isHi ? 'कोई दवा नहीं' : 'No afternoon meds'}</span>`;
  if (nCount === 0) elements.scheduleNight.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-dim);">${isHi ? 'कोई दवा नहीं' : 'No night meds'}</span>`;
}

function createSlotItem(name, dosage, timing) {
  const d = document.createElement('div');
  d.className = 'slot-item';
  d.innerHTML = `
    <div class="slot-med-name">${name} <span style="font-size: 0.74rem; color: #38bdf8;">(${dosage})</span></div>
    <div class="slot-med-timing">${timing}</div>
  `;
  return d;
}

// Render Detailed Medication Cards
function renderMedicationCards(meds, isHi) {
  elements.medicationsCards.innerHTML = '';

  meds.forEach(m => {
    const card = document.createElement('div');
    card.className = 'med-card';

    const category = isHi ? m.category_hi : m.category_en;
    const timing = isHi ? m.timing_hi : m.timing_en;
    const uses = isHi ? m.uses_hi : m.uses_en;
    const warnings = isHi ? m.warnings_hi : m.warnings_en;
    const frequency = isHi ? m.frequency_hi : m.frequency;

    card.innerHTML = `
      <div class="med-card-header">
        <div class="med-name-group">
          <h4>${m.generic_name || m.raw_name}</h4>
          <span class="med-category">${category}</span>
        </div>
        <span class="med-dosage-pill">${m.dosage || 'Prescribed'}</span>
      </div>
      
      <div class="med-details-grid">
        <div class="detail-block">
          <label>${isHi ? 'दैनिक खुराक (Schedule)' : 'Daily Schedule'}</label>
          <p>${frequency}</p>
        </div>
        <div class="detail-block">
          <label>${isHi ? 'लेने का समय (Timing)' : 'Timing & Food'}</label>
          <p>${timing}</p>
        </div>
        <div class="detail-block" style="grid-column: 1 / -1;">
          <label>${isHi ? 'उपयोग / लाभ (Purpose)' : 'Clinical Indications'}</label>
          <p>${uses}</p>
        </div>
      </div>

      <div class="med-warning-strip">
        <strong>⚠️ ${isHi ? 'सावधानी:' : 'Warning:'}</strong> ${warnings}
      </div>
    `;

    elements.medicationsCards.appendChild(card);
  });
}

// Audio Read Aloud (Web Speech API)
function toggleAudioSummary() {
  if (state.activeSpeech) {
    window.speechSynthesis.cancel();
    state.activeSpeech = null;
    elements.btnAudioSummary.innerHTML = state.currentLang === 'hi' ? I18N.hi.btnListen : I18N.en.btnListen;
    return;
  }

  if (!state.currentAnalysis) return;

  const isHi = state.currentLang === 'hi';
  const textToRead = isHi ? state.currentAnalysis.analysis.summary_hi : state.currentAnalysis.analysis.summary_en;

  if (!('speechSynthesis' in window)) {
    alert(isHi ? 'आपके ब्राउज़र में आवाज़ की सुविधा उपलब्ध नहीं है।' : 'Text-to-Speech not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.lang = isHi ? 'hi-IN' : 'en-US';
  utterance.rate = 0.95;

  // Try to find appropriate voice
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(v => isHi ? v.lang.startsWith('hi') : v.lang.startsWith('en'));
  if (targetVoice) utterance.voice = targetVoice;

  utterance.onend = () => {
    state.activeSpeech = null;
    elements.btnAudioSummary.innerHTML = isHi ? I18N.hi.btnListen : I18N.en.btnListen;
  };

  utterance.onerror = () => {
    state.activeSpeech = null;
    elements.btnAudioSummary.innerHTML = isHi ? I18N.hi.btnListen : I18N.en.btnListen;
  };

  state.activeSpeech = utterance;
  window.speechSynthesis.speak(utterance);
  elements.btnAudioSummary.innerHTML = isHi ? I18N.hi.btnStopListen : I18N.en.btnStopListen;
}

// Reset UI
function resetToUpload() {
  if (state.activeSpeech) {
    window.speechSynthesis.cancel();
    state.activeSpeech = null;
  }
  elements.loaderSection.style.display = 'none';
  elements.resultsContainer.style.display = 'none';
  elements.inputGrid.style.display = 'grid';
  elements.fileInput.value = '';
  elements.cameraInput.value = '';
  state.currentAnalysis = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
