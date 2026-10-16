/**
 * AushadhiDrishti - client application
 * Streams real pipeline progress from the server and renders the clinical report.
 */

'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STAGES = [
  { id: 'upload', weight: 6 },
  { id: 'enhance', weight: 14 },
  { id: 'vision', weight: 60 },
  { id: 'screening', weight: 14 },
  { id: 'report', weight: 6 }
];

const state = {
  lang: localStorage.getItem('ad_lang') || 'en',
  theme: localStorage.getItem('ad_theme_v2') || 'light',
  analysis: null,
  speaking: false,
  samples: [],
  run: null,
  view: 'input',
  config: null,
  editProvider: null,
  perf: {},
  analysisMeta: null,
  history: []
};
let runSeq = 0;

const HISTORY_KEY = 'ad_history_v1';
const HISTORY_MAX = 20;

/* --------------------------------------------------------------------------
   Strings
   -------------------------------------------------------------------------- */
const I18N = {
  en: {
    appTitle: 'AushadhiDrishti',
    appTagline: 'Prescription scanner and medication safety',
    themeDark: 'Dark mode',
    themeLight: 'Light mode',
    btnSettings: 'API settings',
    heroTitle: 'Read any prescription. Check it for unsafe combinations.',
    heroEyebrow: 'Prescription scanner and medication safety',
    heroDesc: 'Upload a photo of a prescription to extract each medicine, screen for drug interactions, and get a daily timetable in English and Hindi.',
    dropTitle: 'Upload a prescription image',
    dropSub: 'Drag and drop a file here, or choose one. JPG, PNG or WebP.',
    btnBrowse: 'Choose file',
    btnCamera: 'Take photo',
    presetsTitle: 'Sample prescriptions',
    presetsNote: 'Run the pipeline on a built-in example.',
    tagSafe: 'Routine',
    tagAcute: 'Acute care',
    tagDanger: 'High risk',

    docTitle: 'Document',
    badgeScanning: 'Scanning',
    badgeDone: 'Complete',
    badgeFailed: 'Failed',
    progressTitle: 'Analysis progress',
    btnCancel: 'Cancel',
    errTitle: 'Analysis could not be completed',
    btnBack: 'Back to upload',
    errNetwork: 'Could not reach the server. Check that the app is running and try again.',
    errNotImage: 'That file is not an image. Choose a JPG, PNG or WebP photo.',
    errNoResult: 'The server closed the connection before sending a result.',
    elapsedLabel: (s) => `${s} s`,
    stepOf: (n, total, name) => `Step ${n} of ${total}: ${name}`,
    allDone: 'All steps complete',
    failedAt: (name) => `Stopped at: ${name}`,

    stage_upload: 'File received',
    stage_enhance: 'Image enhancement',
    stage_vision: 'Reading the prescription',
    stage_screening: 'Interaction screening',
    stage_report: 'Building the report',

    upload_done: (size) => `Received ${size}`,
    enhance_active: 'Correcting orientation, contrast and sharpness',
    enhance_done: (ow, oh, pw, ph) => `Resized ${ow} x ${oh} px to ${pw} x ${ph} px`,
    kvContrast: 'Contrast',
    kvSharpness: 'Sharpness',
    kvOutput: 'Output',
    vision_active_live: (s) => `Transcribing handwriting and clinical entities - ${s} s`,
    vision_active_offline: 'Preparing the offline engine',
    vision_slow: 'This is taking longer than usual. The analysis is still working.',
    vision_done_live: (n, s) => `${n} medicine${n === 1 ? '' : 's'} extracted in ${s} s`,
    vision_done_offline: (n, reason) => `Offline engine used (${reason}). ${n} medicine${n === 1 ? '' : 's'} returned from demo data.`,
    reasonNoKey: 'no API key configured',
    reasonUnavailable: 'vision service unavailable',
    kvPatient: 'Patient',
    screening_active: 'Matching names to the drug database and checking every pair',
    screening_done: (matched, total, pairs, rules) => `${matched} of ${total} medicines matched. ${pairs} pair${pairs === 1 ? '' : 's'} checked against ${rules} rules`,
    kvFound: 'Interactions found',
    kvNone: 'No interactions found',
    report_active: 'Writing the English and Hindi summary and timetable',
    report_done: 'Report ready',

    meta_name: 'File',
    meta_size: 'Size',
    meta_type: 'Type',
    meta_original: 'Original (px)',
    meta_enhanced: 'Enhanced (px)',

    viewerTitle: 'Enhanced scan',
    patientDetails: 'Prescription details',
    lblPatient: 'Patient',
    lblVitals: 'Age / sex',
    lblDoctor: 'Doctor',
    lblDate: 'Date',
    unspecified: 'Not stated',
    summaryTitle: 'Plain-language summary',
    btnListen: 'Listen',
    btnStopListen: 'Stop',
    interactionsTitle: 'Drug interaction screening',
    noInteractions: 'No harmful interactions were found between the identified medicines.',
    sevContraindicated: 'Contraindicated',
    sevMajor: 'Major',
    sevModerate: 'Moderate',
    recommended: 'Recommended action:',
    scheduleTitle: 'Daily timetable',
    slotMorning: 'Morning',
    slotAfternoon: 'Afternoon',
    slotNight: 'Night',
    slotEmpty: 'None',
    medsListTitle: 'Medications and guidance',
    lblDosage: 'Schedule',
    lblTiming: 'Timing and food',
    lblDuration: 'Duration',
    lblUses: 'Purpose',
    lblWarnings: 'Warning:',
    notInDb: 'Not in database',
    btnDownloadPDF: 'Print or save as PDF',
    btnScanNew: 'Scan another',
    sourceLive: 'Clinical analysis',
    sourceOffline: 'Demo analysis',
    disclaimer: 'Medical disclaimer: AushadhiDrishti is an AI assistant for educational and informational use. Consult a licensed physician or pharmacist before starting, changing or stopping any medication.',

    btnHistory: 'History',
    historyTitle: 'Scan history',
    historyCount: (n) => `${n} saved scan${n === 1 ? '' : 's'}`,
    btnClearHistory: 'Clear history',
    historyEmpty: 'No prescription scans saved yet.',
    historyEmptySub: 'Scans you analyze will automatically appear here.',
    confirmClearHistory: 'Delete all saved scans? This cannot be undone.',
    btnOpenReport: 'View report',
    btnDelete: 'Delete',

    settingsTitle: 'Model configuration',
    providerLabel: 'Vision provider',
    providerInUse: 'In use',
    providerKeySet: 'Key set',
    providerNoKey: 'No key',
    usingProvider: (label) => `Now using ${label}.`,
    perfScan: (s) => `Last scan: ${s} s`,
    perfTest: (s) => `Responded in ${s} s`,
    stepUpload: 'Upload',
    stepAnalyse: 'Analyse',
    stepReport: 'Report',
    how1Title: 'Add a prescription',
    how1Text: 'Upload a photo or pick a sample. Images are processed in memory and are not stored.',
    how2Title: 'Watch it work',
    how2Text: 'Follow each step live: image enhancement, reading, and interaction screening.',
    how3Title: 'Review the report',
    how3Text: 'Get a safety verdict, a daily timetable and plain-language guidance in English and Hindi.',
    reportTitle: 'Prescription report',
    statMeds: 'Medicines',
    statMedsSub: (m, n) => `${m} of ${n} matched in database`,
    statIx: 'Interactions',
    statIxSub: (n) => `${n} pair${n === 1 ? '' : 's'} checked`,
    statDoses: 'Doses per day',
    statDosesSub: 'Morning, afternoon, night',
    statTime: 'Read in',
    statTimeSub: 'End-to-end analysis',
    lblFailover: 'If this provider fails, try the other one automatically',
    btnTest: 'Test connection',
    testing: 'Testing...',
    testOk: (ms) => `Connected in ${ms} ms.`,
    testFail: (m) => `Test failed: ${m}.`,
    needKey: (label) => `Add an API key for ${label} to use it.`,
    lblApiKey: 'API key',
    lblApiBase: 'API base URL',
    lblModel: 'Model identifier',
    settingsHint: 'Without any API key the app uses its built-in offline engine, which returns fixed demo data instead of reading the image.',
    btnSaveConfig: 'Save and use',
    settingsSaved: 'Configuration saved.',
    settingsFailed: 'Could not save configuration.',
    keyConfigured: (k) => `Configured (${k})`,
    ttsUnsupported: 'Text-to-speech is not supported in this browser.'
  },
  hi: {
    appTitle: 'औषधि दृष्टि',
    appTagline: 'पर्चा स्कैनर और दवा सुरक्षा',
    themeDark: 'डार्क मोड',
    themeLight: 'लाइट मोड',
    btnSettings: 'API सेटिंग्स',
    heroTitle: 'किसी भी पर्चे को पढ़ें और असुरक्षित दवा संयोजन जांचें।',
    heroEyebrow: 'पर्चा स्कैनर और दवा सुरक्षा',
    heroDesc: 'पर्चे की फोटो अपलोड करें। हर दवा पहचानी जाएगी, दवाओं के आपसी टकराव की जांच होगी और हिन्दी व अंग्रेज़ी में दैनिक समय-सारणी मिलेगी।',
    dropTitle: 'पर्चे की तस्वीर अपलोड करें',
    dropSub: 'फ़ाइल यहां खींचकर छोड़ें या चुनें। JPG, PNG या WebP।',
    btnBrowse: 'फ़ाइल चुनें',
    btnCamera: 'फोटो खींचें',
    presetsTitle: 'नमूना पर्चे',
    presetsNote: 'पहले से मौजूद उदाहरण पर जांच चलाएं।',
    tagSafe: 'सामान्य',
    tagAcute: 'तीव्र रोग',
    tagDanger: 'उच्च जोखिम',

    docTitle: 'दस्तावेज़',
    badgeScanning: 'स्कैन हो रहा है',
    badgeDone: 'पूर्ण',
    badgeFailed: 'विफल',
    progressTitle: 'विश्लेषण की प्रगति',
    btnCancel: 'रद्द करें',
    errTitle: 'विश्लेषण पूरा नहीं हो सका',
    btnBack: 'अपलोड पर वापस जाएं',
    errNetwork: 'सर्वर से संपर्क नहीं हो सका। जांचें कि ऐप चालू है और दोबारा प्रयास करें।',
    errNotImage: 'यह फ़ाइल तस्वीर नहीं है। JPG, PNG या WebP फोटो चुनें।',
    errNoResult: 'परिणाम भेजे जाने से पहले सर्वर ने कनेक्शन बंद कर दिया।',
    elapsedLabel: (s) => `${s} सेकंड`,
    stepOf: (n, total, name) => `चरण ${n}/${total}: ${name}`,
    allDone: 'सभी चरण पूर्ण',
    failedAt: (name) => `यहां रुका: ${name}`,

    stage_upload: 'फ़ाइल प्राप्त',
    stage_enhance: 'छवि सुधार',
    stage_vision: 'पर्चा पढ़ना',
    stage_screening: 'दवा टकराव जांच',
    stage_report: 'रिपोर्ट तैयार करना',

    upload_done: (size) => `${size} प्राप्त हुआ`,
    enhance_active: 'दिशा, कंट्रास्ट और स्पष्टता सुधारी जा रही है',
    enhance_done: (ow, oh, pw, ph) => `${ow} x ${oh} px से ${pw} x ${ph} px किया गया`,
    kvContrast: 'कंट्रास्ट',
    kvSharpness: 'स्पष्टता',
    kvOutput: 'आउटपुट',
    vision_active_live: (s) => `हस्तलेखन और दवाओं की पहचान जारी - ${s} सेकंड`,
    vision_active_offline: 'ऑफ़लाइन इंजन तैयार किया जा रहा है',
    vision_slow: 'सामान्य से अधिक समय लग रहा है। विश्लेषण जारी है।',
    vision_done_live: (n, s) => `${s} सेकंड में ${n} दवाएं निकाली गईं`,
    vision_done_offline: (n, reason) => `ऑफ़लाइन इंजन उपयोग हुआ (${reason})। डेमो डेटा से ${n} दवाएं मिलीं।`,
    reasonNoKey: 'कोई API कुंजी सेट नहीं है',
    reasonUnavailable: 'विज़न सेवा उपलब्ध नहीं थी',
    kvPatient: 'मरीज़',
    screening_active: 'दवाओं के नाम डेटाबेस से मिलाए जा रहे हैं और हर जोड़ी जांची जा रही है',
    screening_done: (matched, total, pairs, rules) => `${total} में से ${matched} दवाएं मिलीं। ${rules} नियमों के विरुद्ध ${pairs} जोड़ियां जांची गईं`,
    kvFound: 'मिले टकराव',
    kvNone: 'कोई टकराव नहीं मिला',
    report_active: 'हिन्दी और अंग्रेज़ी सारांश व समय-सारणी बन रही है',
    report_done: 'रिपोर्ट तैयार',

    meta_name: 'फ़ाइल',
    meta_size: 'आकार',
    meta_type: 'प्रकार',
    meta_original: 'मूल (px)',
    meta_enhanced: 'सुधारी गई (px)',

    viewerTitle: 'सुधारा गया स्कैन',
    patientDetails: 'पर्चे का विवरण',
    lblPatient: 'मरीज़',
    lblVitals: 'उम्र / लिंग',
    lblDoctor: 'चिकित्सक',
    lblDate: 'तारीख',
    unspecified: 'उल्लेख नहीं',
    summaryTitle: 'सरल सारांश',
    btnListen: 'सुनें',
    btnStopListen: 'बंद करें',
    interactionsTitle: 'दवा टकराव की जांच',
    noInteractions: 'पहचानी गई दवाओं के बीच कोई हानिकारक टकराव नहीं मिला।',
    sevContraindicated: 'प्रतिबंधित संयोजन',
    sevMajor: 'गंभीर',
    sevModerate: 'मध्यम',
    recommended: 'सुझाई गई कार्रवाई:',
    scheduleTitle: 'दैनिक समय-सारणी',
    slotMorning: 'सुबह',
    slotAfternoon: 'दोपहर',
    slotNight: 'रात',
    slotEmpty: 'कोई नहीं',
    medsListTitle: 'दवाएं और निर्देश',
    lblDosage: 'खुराक का क्रम',
    lblTiming: 'समय और भोजन',
    lblDuration: 'अवधि',
    lblUses: 'उपयोग',
    lblWarnings: 'चेतावनी:',
    notInDb: 'डेटाबेस में नहीं',
    btnDownloadPDF: 'प्रिंट करें या PDF सहेजें',
    btnScanNew: 'दूसरा स्कैन करें',
    sourceLive: 'चिकित्सीय विश्लेषण',
    sourceOffline: 'डेमो विश्लेषण',
    disclaimer: 'चिकित्सा अस्वीकरण: औषधि दृष्टि एक एआई सहायक है जो केवल शैक्षिक और सूचनात्मक उपयोग के लिए है। कोई भी दवा शुरू करने, बदलने या बंद करने से पहले डॉक्टर या फार्मासिस्ट से परामर्श करें।',

    btnHistory: 'इतिहास',
    historyTitle: 'स्कैन इतिहास',
    historyCount: (n) => `${n} सहेजे गए पर्चे`,
    btnClearHistory: 'सब हटाएं',
    historyEmpty: 'अभी कोई पर्चा सहेजा नहीं गया है।',
    historyEmptySub: 'विश्लेषण किए गए पर्चे अपने आप यहां दिखाई देंगे।',
    confirmClearHistory: 'सहेजे गए सभी पर्चे हटाएं? यह वापस नहीं होगा।',
    btnOpenReport: 'रिपोर्ट देखें',
    btnDelete: 'हटाएं',

    settingsTitle: 'मॉडल सेटिंग्स',
    providerLabel: 'विज़न प्रदाता',
    providerInUse: 'उपयोग में',
    providerKeySet: 'कुंजी सेट',
    providerNoKey: 'कुंजी नहीं',
    usingProvider: (label) => `अब ${label} उपयोग में है।`,
    perfScan: (s) => `पिछला स्कैन: ${s} सेकंड`,
    perfTest: (s) => `${s} सेकंड में उत्तर मिला`,
    stepUpload: 'अपलोड',
    stepAnalyse: 'विश्लेषण',
    stepReport: 'रिपोर्ट',
    how1Title: 'पर्चा जोड़ें',
    how1Text: 'फोटो अपलोड करें या नमूना चुनें। तस्वीरें केवल मेमोरी में संसाधित होती हैं, सहेजी नहीं जातीं।',
    how2Title: 'प्रगति देखें',
    how2Text: 'हर चरण लाइव देखें: छवि सुधार, पर्चा पढ़ना और दवा टकराव जांच।',
    how3Title: 'रिपोर्ट देखें',
    how3Text: 'सुरक्षा निष्कर्ष, दैनिक समय-सारणी और सरल मार्गदर्शन हिन्दी व अंग्रेज़ी में पाएं।',
    reportTitle: 'पर्चे की रिपोर्ट',
    statMeds: 'दवाएं',
    statMedsSub: (m, n) => `${n} में से ${m} डेटाबेस में मिलीं`,
    statIx: 'टकराव',
    statIxSub: (n) => `${n} जोड़ियां जांची गईं`,
    statDoses: 'प्रतिदिन खुराक',
    statDosesSub: 'सुबह, दोपहर, रात',
    statTime: 'पढ़ने में समय',
    statTimeSub: 'पूर्ण विश्लेषण',
    lblFailover: 'यह प्रदाता विफल हो तो दूसरा अपने आप आज़माएं',
    btnTest: 'कनेक्शन जांचें',
    testing: 'जांच हो रही है...',
    testOk: (ms) => `${ms} मि.से. में कनेक्ट हुआ।`,
    testFail: (m) => `जांच विफल: ${m}।`,
    needKey: (label) => `${label} उपयोग करने के लिए API कुंजी जोड़ें।`,
    lblApiKey: 'API कुंजी',
    lblApiBase: 'API बेस URL',
    lblModel: 'मॉडल का नाम',
    settingsHint: 'किसी भी API कुंजी के बिना ऐप अपना ऑफ़लाइन इंजन चलाता है, जो तस्वीर पढ़ने के बजाय निश्चित डेमो डेटा लौटाता है।',
    btnSaveConfig: 'सहेजें और उपयोग करें',
    settingsSaved: 'सेटिंग्स सहेजी गईं।',
    settingsFailed: 'सेटिंग्स सहेजी नहीं जा सकीं।',
    keyConfigured: (k) => `कॉन्फ़िगर है (${k})`,
    ttsUnsupported: 'इस ब्राउज़र में आवाज़ की सुविधा उपलब्ध नहीं है।'
  }
};

const tr = (key, ...args) => {
  const v = (I18N[state.lang] || I18N.en)[key] ?? I18N.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
};

/* --------------------------------------------------------------------------
   Bootstrap
   -------------------------------------------------------------------------- */
const el = {};

document.addEventListener('DOMContentLoaded', () => {
  [
    'dropzone', 'file-input', 'camera-input', 'btn-browse', 'btn-camera', 'presets-list',
    'lang-en', 'lang-hi', 'btn-theme-toggle', 'btn-settings-open', 'btn-settings-close', 'modal-settings',
    'form-settings', 'input-api-key', 'input-api-base', 'input-model', 'settings-status',
    'view-input', 'view-progress', 'view-results',
    'scan-frame', 'scan-image', 'scan-meta', 'scan-badge', 'stage-list', 'elapsed', 'progress-fill',
    'progress-track', 'progress-label', 'progress-pct', 'progress-error', 'progress-error-text',
    'btn-cancel', 'btn-error-back',
    'image-preview', 'source-tag', 'patient-name', 'patient-vitals', 'patient-doctor', 'patient-date',
    'safety-banner', 'safety-icon', 'safety-title', 'safety-desc', 'summary-text', 'btn-audio-summary',
    'audio-icon', 'audio-label', 'interactions-list', 'schedule-morning', 'schedule-afternoon',
    'schedule-night', 'count-morning', 'count-afternoon', 'count-night', 'medications-cards',
    'btn-scan-new', 'btn-scan-another-bottom', 'btn-print-card', 'btn-print-bottom', 'brand-home',
    'btn-history-open', 'btn-history-close', 'btn-clear-history', 'modal-history', 'history-list',
    'history-count', 'history-badge',
    'provider-cards', 'btn-test', 'input-failover', 'steps', 'report-sub', 'theme-use',
    'stat-meds', 'stat-meds-sub', 'stat-ix', 'stat-ix-sub', 'stat-doses', 'stat-doses-sub', 'stat-time', 'stat-time-sub'
  ].forEach((id) => { el[id] = $(id); });

  applyTheme();
  setLanguage(state.lang);
  bindEvents();
  loadSamples();
  loadApiConfig();
  loadHistory();
});

function updateSteps(name) {
  const order = ['input', 'progress', 'results'];
  const idx = order.indexOf(name);
  el.steps.querySelectorAll('li').forEach((li) => {
    const i = order.indexOf(li.dataset.step);
    li.classList.toggle('is-current', i === idx);
    li.classList.toggle('is-done', i < idx);
    if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}

function showView(name) {
  state.view = name;
  updateSteps(name);
  ['input', 'progress', 'results'].forEach((v) => { el['view-' + v].hidden = v !== name; });
  window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
}

/* --------------------------------------------------------------------------
   Language and theme
   -------------------------------------------------------------------------- */
function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('ad_lang', lang);
  document.documentElement.lang = lang;
  document.body.classList.toggle('lang-hi', lang === 'hi');
  el['lang-en'].classList.toggle('active', lang === 'en');
  el['lang-hi'].classList.toggle('active', lang === 'hi');
  el['lang-en'].setAttribute('aria-pressed', String(lang === 'en'));
  el['lang-hi'].setAttribute('aria-pressed', String(lang === 'hi'));

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const v = tr(node.getAttribute('data-i18n'));
    if (typeof v === 'string') node.textContent = v;
  });
  updateThemeLabel();
  updateAudioButton();
  renderProviderUI();
  setBadge(el['scan-badge'].dataset.kind || 'scanning');
  renderHistory();

  if (state.samples.length) renderPresets();
  if (state.run) {
    refreshProgressText(state.run);
    renderAllStages(state.run);
    renderMeta(state.run);
  }
  if (state.analysis) renderAnalysis(state.analysis, { animate: false });
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
  updateThemeLabel();
}

function updateThemeLabel() {
  const b = el['btn-theme-toggle'];
  if (!b) return;
  const label = tr(state.theme === 'dark' ? 'themeLight' : 'themeDark');
  b.title = label;
  b.setAttribute('aria-label', label);
  el['theme-use'].setAttribute('href', state.theme === 'dark' ? '#i-sun' : '#i-moon');
  el['btn-settings-open'].title = tr('btnSettings');
  el['btn-settings-open'].setAttribute('aria-label', tr('btnSettings'));
}

/* --------------------------------------------------------------------------
   Events
   -------------------------------------------------------------------------- */
function bindEvents() {
  el['lang-en'].addEventListener('click', () => setLanguage('en'));
  el['lang-hi'].addEventListener('click', () => setLanguage('hi'));
  el['btn-theme-toggle'].addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ad_theme_v2', state.theme);
    applyTheme();
  });

  const dz = el.dropzone;
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  dz.addEventListener('click', () => el['file-input'].click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el['file-input'].click(); }
  });
  el['btn-browse'].addEventListener('click', (e) => { e.stopPropagation(); el['file-input'].click(); });
  el['btn-camera'].addEventListener('click', (e) => { e.stopPropagation(); el['camera-input'].click(); });
  [el['file-input'], el['camera-input']].forEach((inp) => {
    inp.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      e.target.value = '';
    });
  });

  el['btn-scan-new'].addEventListener('click', resetToUpload);
  el['btn-scan-another-bottom'].addEventListener('click', resetToUpload);
  el['btn-print-card'].addEventListener('click', () => window.print());
  el['btn-print-bottom'].addEventListener('click', () => window.print());
  el['btn-audio-summary'].addEventListener('click', toggleAudio);
  el['btn-cancel'].addEventListener('click', resetToUpload);
  el['btn-error-back'].addEventListener('click', resetToUpload);

  /* The logo and the Upload step act as a home button, so any view can always start over. */
  el['brand-home'].addEventListener('click', resetToUpload);
  el['brand-home'].addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetToUpload(); }
  });
  el['steps'].querySelector('li[data-step="input"]').addEventListener('click', () => { if (state.view !== 'input') resetToUpload(); });

  el['btn-settings-open'].addEventListener('click', () => openSettings());
  el['btn-test'].addEventListener('click', testConnection);
  el['btn-settings-close'].addEventListener('click', closeSettings);
  el['modal-settings'].addEventListener('click', (e) => { if (e.target === el['modal-settings']) closeSettings(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSettings(); closeHistory(); } });
  el['form-settings'].addEventListener('submit', saveSettings);

  el['btn-history-open'].addEventListener('click', openHistory);
  el['btn-history-close'].addEventListener('click', closeHistory);
  el['btn-clear-history'].addEventListener('click', clearHistory);
  el['modal-history'].addEventListener('click', (e) => { if (e.target === el['modal-history']) closeHistory(); });
  el['history-list'].addEventListener('click', onHistoryListClick);
}

function closeSettings() { el['modal-settings'].classList.remove('active'); }

/* ---- Provider configuration (provider and model names are only shown here, in settings) ---- */
function renderProviderUI() {
  if (!state.config) return;
  renderProviderCards();
}

async function postConfig(body) {
  const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  state.config = data;
  renderProviderUI();
}

function openSettings(provider, message) {
  if (!state.config) return;
  state.editProvider = provider || state.config.active;
  fillSettingsForm();
  setSettingsStatus(message || '', false);
  renderProviderUI();
  el['modal-settings'].classList.add('active');
  el['input-api-key'].focus();
}

function renderProviderCards() {
  const box = el['provider-cards'];
  box.innerHTML = '';
  Object.entries(state.config.providers).forEach(([id, p]) => {
    const inUse = id === state.config.active;
    const perf = state.perf[id];
    const badge = inUse
      ? `<span class="badge badge-accent">${esc(tr('providerInUse'))}</span>`
      : p.api_key_set ? `<span class="badge">${esc(tr('providerKeySet'))}</span>` : `<span class="badge badge-caution">${esc(tr('providerNoKey'))}</span>`;
    const perfText = perf ? tr(perf.kind === 'scan' ? 'perfScan' : 'perfTest', perf.secs.toFixed(1)) : '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'provider-card';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.editProvider));
    b.innerHTML = `<span class="provider-card-top"><span class="provider-card-name">${esc(p.label)}</span>${badge}</span>` +
      `<span class="provider-card-model">${esc(p.model)}</span><span class="provider-card-perf">${esc(perfText)}</span>`;
    b.addEventListener('click', () => pickProviderCard(id));
    box.appendChild(b);
  });
}

/* Choosing a provider card edits it and, when it already has a key, switches to it immediately. */
async function pickProviderCard(id) {
  state.editProvider = id;
  fillSettingsForm();
  const p = state.config.providers[id];
  if (!p.api_key_set) { renderProviderUI(); setSettingsStatus(tr('needKey', p.label), true); return; }
  if (state.config.active !== id) {
    try {
      await postConfig({ provider: id, activate: true });
      setSettingsStatus(tr('usingProvider', p.label), false);
    } catch (err) { setSettingsStatus(err.message, true); }
  } else {
    setSettingsStatus('', false);
  }
  renderProviderUI();
}

function fillSettingsForm() {
  const p = state.config.providers[state.editProvider];
  el['input-api-key'].value = '';
  el['input-api-key'].placeholder = p.api_key_set ? tr('keyConfigured', p.masked_key) : 'Paste your API key';
  el['input-api-base'].value = p.api_base;
  el['input-model'].value = p.model;
  el['input-failover'].checked = state.config.failover;
}

function setSettingsStatus(text, isError) {
  el['settings-status'].className = 'form-status' + (isError ? ' error' : '');
  el['settings-status'].textContent = text;
}

function settingsPayload(activate) {
  const body = {
    provider: state.editProvider,
    api_base: el['input-api-base'].value.trim(),
    model: el['input-model'].value.trim(),
    failover: el['input-failover'].checked,
    activate
  };
  const key = el['input-api-key'].value.trim();
  if (key) body.api_key = key; // a blank field keeps the stored key
  return body;
}

async function saveSettings(e) {
  e.preventDefault();
  const p = state.config.providers[state.editProvider];
  if (!p.api_key_set && !el['input-api-key'].value.trim()) { setSettingsStatus(tr('needKey', p.label), true); return; }
  try {
    await postConfig(settingsPayload(true));
    closeSettings();
  } catch (err) {
    setSettingsStatus(tr('settingsFailed') + ' ' + err.message, true);
  }
}

async function testConnection() {
  setSettingsStatus(tr('testing'), false);
  try {
    await postConfig(settingsPayload(false)); // store what is typed, without switching providers
    fillSettingsForm();
    const res = await fetch('/api/config/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: state.editProvider }) });
    const r = await res.json();
    if (r.ok) { state.perf[state.editProvider] = { kind: 'test', secs: r.latency_ms / 1000 }; renderProviderUI(); }
    setSettingsStatus(r.ok ? tr('testOk', r.latency_ms) : tr('testFail', r.message), !r.ok);
  } catch (err) {
    setSettingsStatus(tr('testFail', err.message), true);
  }
}

async function loadApiConfig() {
  try {
    state.config = await (await fetch('/api/config')).json();
    state.editProvider = state.config.active;
    renderProviderUI();
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

/* --------------------------------------------------------------------------
   Sample prescriptions
   -------------------------------------------------------------------------- */
async function loadSamples() {
  try {
    state.samples = await (await fetch('/api/samples')).json();
    renderPresets();
  } catch (err) {
    console.error('Failed to load samples:', err);
  }
}

function renderPresets() {
  const hi = state.lang === 'hi';
  const tagFor = { cardio_diabetic: ['badge-safe', 'tagSafe'], infection_fever: ['badge-accent', 'tagAcute'], arthritis_pain: ['badge-danger', 'tagDanger'] };
  el['presets-list'].innerHTML = '';
  state.samples.forEach((s) => {
    const [cls, key] = tagFor[s.id] || ['', 'tagAcute'];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-item';
    btn.innerHTML = `
      <span class="preset-top">
        <span class="preset-title">${esc(hi ? s.title_hi : s.title_en)}</span>
        <span class="badge ${cls}">${esc(tr(key))}</span>
      </span>
      <span class="preset-desc">${esc(hi ? s.subtitle_hi : s.subtitle_en)}</span>`;
    btn.addEventListener('click', () => handleSample(s));
    el['presets-list'].appendChild(btn);
  });
}

/* --------------------------------------------------------------------------
   Analysis run: request, stream, progress
   -------------------------------------------------------------------------- */
function handleFile(file) {
  if (state.run) return;
  const url = URL.createObjectURL(file);
  const run = beginRun({ name: file.name, size: file.size, type: file.type || '-', previewUrl: url });
  if (!file.type.startsWith('image/')) { fail(run, tr('errNotImage')); return; }
  const fd = new FormData();
  fd.append('file', file);
  startStream(run, '/api/analyze/stream', { method: 'POST', body: fd });
}

function handleSample(sample) {
  if (state.run) return;
  const run = beginRun({ name: sample.title_en || `${sample.id}.jpg`, size: null, type: 'image/jpeg', previewUrl: sample.preview_url });
  startStream(run, `/api/analyze-sample/${encodeURIComponent(sample.id)}/stream`, { method: 'POST' });
}

function beginRun({ name, size, type, previewUrl }) {
  const run = {
    id: ++runSeq,
    ctrl: new AbortController(),
    startedAt: performance.now(),
    stages: {},
    queue: [],
    pumping: false,
    streamEnded: false,
    failed: false,
    finished: false,
    result: null,
    pct: 0,
    meta: { name, size, type },
    objectUrl: previewUrl && previewUrl.startsWith('blob:') ? previewUrl : null
  };
  STAGES.forEach((s) => { run.stages[s.id] = { status: 'pending', data: null, t0: null, t1: null, body: '' }; });
  state.run = run;

  showView('progress');
  el['scan-meta'].innerHTML = '';
  el['progress-error'].hidden = true;
  el['progress-fill'].className = 'progress-fill';
  el['progress-fill'].style.width = '0%';
  el['scan-frame'].classList.add('is-scanning');
  setBadge('scanning');
  buildStageList(run);
  renderMeta(run);

  const img = el['scan-image'];
  img.hidden = true;
  img.onload = () => {
    img.hidden = false;
    if (!run.meta.original || run.stages.enhance.status === 'pending') {
      run.meta.original = `${img.naturalWidth} x ${img.naturalHeight}`;
      if (state.run === run) renderMeta(run);
    }
  };
  img.onerror = () => { img.hidden = true; };
  img.src = previewUrl;

  setStage(run, 'upload', 'active');
  run.timer = setInterval(() => tickRun(run), 100);
  tickRun(run);
  return run;
}

async function startStream(run, url, init) {
  try {
    const res = await fetch(url, { ...init, signal: run.ctrl.signal });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).detail || ''; } catch { /* ignore */ }
      throw new Error(detail || `HTTP ${res.status}`);
    }
    await readNdjson(run, res);
    run.streamEnded = true;
    pump(run);
  } catch (err) {
    if (run.ctrl.signal.aborted || state.run !== run) return;
    const network = err instanceof TypeError;
    fail(run, network ? tr('errNetwork') : err.message);
  }
}

async function readNdjson(run, res) {
  const parse = (line) => { try { return JSON.parse(line); } catch { return null; } };
  const push = (line) => { const ev = line.trim() && parse(line); if (ev) { run.queue.push(ev); pump(run); } };
  if (!res.body || !res.body.getReader) {
    (await res.text()).split('\n').forEach(push);
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) { push(buf.slice(0, i)); buf = buf.slice(i + 1); }
  }
  push(buf);
}

/* Events are applied one at a time with a short dwell so fast stages stay readable. */
async function pump(run) {
  if (run.pumping) return;
  run.pumping = true;
  while (run.queue.length && state.run === run && !run.failed) {
    const ev = run.queue.shift();
    if (ev.type === 'stage') {
      setStage(run, ev.id, ev.status, ev.data);
      if (!REDUCED_MOTION) {
        if (ev.status === 'active' && ev.id !== 'vision') await sleep(220);
        else if (ev.status === 'done') await sleep(ev.id === 'vision' ? 900 : 380);
      }
    } else if (ev.type === 'result') {
      run.result = ev.payload;
    } else if (ev.type === 'error') {
      fail(run, ev.message);
    }
    /* 'tick' heartbeats keep the connection alive; elapsed time is drawn from the local clock. */
  }
  run.pumping = false;
  if (run.streamEnded && !run.queue.length) finish(run);
}

async function finish(run) {
  if (state.run !== run || run.failed || run.finished) return;
  run.finished = true;
  if (!run.result) { fail(run, tr('errNoResult')); return; }
  clearInterval(run.timer);
  setProgress(run, 100);
  el['progress-fill'].classList.add('is-done');
  el['progress-label'].textContent = tr('allDone');
  el['scan-frame'].classList.remove('is-scanning');
  setBadge('done');
  await sleep(REDUCED_MOTION ? 0 : 450);
  if (state.run !== run) return;
  if (run.objectUrl) URL.revokeObjectURL(run.objectUrl);
  const vision = run.stages.vision.data || {};
  state.analysisMeta = { name: run.meta.name, readSecs: vision.elapsed };
  state.run = null;
  state.analysis = run.result;
  el['image-preview'].src = run.result.image_data_url || '';
  showView('results');
  renderAnalysis(run.result, { animate: true });
  saveHistoryEntry({
    name: run.meta.name,
    readSecs: vision.elapsed ?? null,
    image: run.result.image_data_url,
    analysis: run.result.analysis
  });
}

function fail(run, message) {
  if (state.run !== run || run.failed) return;
  run.failed = true;
  run.ctrl.abort();
  clearInterval(run.timer);
  const active = STAGES.find((s) => run.stages[s.id].status === 'active') || STAGES.find((s) => run.stages[s.id].status === 'pending');
  if (active) { run.stages[active.id].status = 'error'; renderStage(run, active.id); }
  el['progress-fill'].classList.add('is-error');
  el['scan-frame'].classList.remove('is-scanning');
  setBadge('failed');
  el['progress-label'].textContent = active ? tr('failedAt', tr('stage_' + active.id)) : '';
  el['progress-error-text'].textContent = message;
  el['progress-error'].hidden = false;
}

function setBadge(kind) {
  const b = el['scan-badge'];
  b.className = 'badge ' + (kind === 'done' ? 'badge-safe' : kind === 'failed' ? 'badge-danger' : 'badge-neutral');
  b.textContent = tr(kind === 'done' ? 'badgeDone' : kind === 'failed' ? 'badgeFailed' : 'badgeScanning');
  b.dataset.kind = kind;
}

/* ---- Progress bar and clock ---- */
function tickRun(run) {
  if (state.run !== run) return;
  const now = performance.now();
  el.elapsed.textContent = tr('elapsedLabel', ((now - run.startedAt) / 1000).toFixed(1));

  let pct = 0;
  STAGES.forEach((s) => {
    const st = run.stages[s.id];
    if (st.status === 'done' || st.status === 'warn') pct += s.weight;
    else if (st.status === 'active') {
      const secs = (now - st.t0) / 1000;
      // The model call has no measurable progress, so ease toward (never reach) the end of its share.
      const frac = s.id === 'vision' ? 0.92 * (1 - Math.exp(-secs / 9)) : 0.5;
      pct += s.weight * frac;
    }
  });
  setProgress(run, pct);
  if (run.stages.vision.status === 'active') updateVisionDetail(run);
}

function setProgress(run, pct) {
  run.pct = Math.max(run.pct, Math.min(100, pct));
  const v = Math.round(run.pct);
  el['progress-fill'].style.width = run.pct.toFixed(1) + '%';
  el['progress-pct'].textContent = v + '%';
  el['progress-track'].setAttribute('aria-valuenow', String(v));
  refreshProgressText(run);
}

function refreshProgressText(run) {
  if (run.failed || run.finished) return;
  const idx = STAGES.findIndex((s) => run.stages[s.id].status === 'active');
  if (idx >= 0) el['progress-label'].textContent = tr('stepOf', idx + 1, STAGES.length, tr('stage_' + STAGES[idx].id));
}

/* ---- Stage list ---- */
function buildStageList(run) {
  el['stage-list'].innerHTML = STAGES.map((s) => `
    <li class="stage is-pending" id="stage-${s.id}">
      <span class="stage-marker" id="marker-${s.id}"></span>
      <div class="stage-main">
        <div class="stage-head"><span class="stage-title" id="title-${s.id}"></span><span class="stage-time" id="time-${s.id}"></span></div>
        <p class="stage-detail" id="detail-${s.id}"></p>
        <div class="stage-body" id="bodywrap-${s.id}"><div><div class="stage-data" id="body-${s.id}"></div></div></div>
      </div>
    </li>`).join('');
  renderAllStages(run);
}

function setStage(run, id, status, data) {
  const st = run.stages[id];
  if (!st) return;
  if (status === 'active' && st.t0 == null) st.t0 = performance.now();
  if (status === 'done') {
    if (st.t0 == null) st.t0 = run.startedAt;
    st.t1 = performance.now();
    // A finished stage that fell back to the offline engine is flagged rather than shown as a clean success.
    if (id === 'vision' && data && data.engine === 'offline') status = 'warn';
  }
  st.status = status;
  if (data) {
    st.data = data;
    if (id === 'enhance') {
      run.meta.original = `${data.original_width} x ${data.original_height}`;
      run.meta.enhanced = `${data.processed_width} x ${data.processed_height}`;
      if (data.image_data_url) { el['scan-image'].src = data.image_data_url; el['scan-image'].hidden = false; }
    }
    if (id === 'upload' && data.size_bytes != null) run.meta.size = data.size_bytes;
    if (id === 'vision' && data.engine === 'live' && data.provider) state.perf[data.provider] = { kind: 'scan', secs: data.elapsed };
    renderMeta(run);
  }
  renderStage(run, id);
  tickRun(run);
}

function renderAllStages(run) { STAGES.forEach((s) => renderStage(run, s.id)); }

const ICON_TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const ICON_BANG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v8M12 18v.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

function renderStage(run, id) {
  const st = run.stages[id];
  const li = $('stage-' + id);
  if (!li) return;
  li.className = 'stage is-' + st.status;
  $('marker-' + id).innerHTML = st.status === 'done' ? ICON_TICK : st.status === 'error' ? ICON_X : st.status === 'warn' ? ICON_BANG : '';
  $('title-' + id).textContent = tr('stage_' + id);
  $('time-' + id).textContent = st.t1 != null && st.t0 != null ? ((st.t1 - st.t0) / 1000).toFixed(1) + ' s' : '';

  $('detail-' + id).textContent = stageDetail(run, id, st);

  const html = stageBody(id, st);
  if (html !== st.body) {
    st.body = html;
    $('body-' + id).innerHTML = html;
  }
  $('bodywrap-' + id).classList.toggle('open', !!html);
}

function updateVisionDetail(run) {
  const st = run.stages.vision;
  if (st.status === 'active') $('detail-vision').textContent = stageDetail(run, 'vision', st);
}

const fmtBytes = (b) => (b == null ? '-' : b < 1024 * 1024 ? (b / 1024).toFixed(0) + ' KB' : (b / 1024 / 1024).toFixed(2) + ' MB');

/* The raw fallback text names the configured provider, so it is generalised before display. */
function offlineReason(d) {
  const errors = (d.attempts || []).map((a) => String(a.error || '').toLowerCase());
  if (!errors.length || errors.every((e) => e.includes('no api key'))) return tr('reasonNoKey');
  return tr('reasonUnavailable');
}

function stageDetail(run, id, st) {
  const d = st.data || {};
  if (st.status === 'pending') return '';
  switch (id) {
    case 'upload':
      return st.status === 'done' ? tr('upload_done', fmtBytes(d.size_bytes)) : '';
    case 'enhance':
      if (st.status === 'active') return tr('enhance_active');
      return d.original_width ? tr('enhance_done', d.original_width, d.original_height, d.processed_width, d.processed_height) : '';
    case 'vision': {
      if (st.status === 'active') {
        const secs = (performance.now() - st.t0) / 1000;
        if (!d.engine) return '';
        if (d.engine === 'offline') return tr('vision_active_offline');
        return secs > 25 ? tr('vision_slow') : tr('vision_active_live', secs.toFixed(0));
      }
      const n = (d.medications || []).length;
      if (d.engine === 'offline') return tr('vision_done_offline', n, offlineReason(d));
      return tr('vision_done_live', n, d.elapsed);
    }
    case 'screening':
      if (st.status === 'active') return tr('screening_active');
      return d.pairs_checked != null ? tr('screening_done', d.medications_matched, d.medications_total, d.pairs_checked, d.rules_total) : '';
    case 'report':
      return st.status === 'active' ? tr('report_active') : st.status === 'done' ? tr('report_done') : '';
    default:
      return '';
  }
}

function kv(label, value) { return `<span>${esc(label)} <b>${esc(value)}</b></span>`; }

function stageBody(id, st) {
  const d = st.data || {};
  if (st.status === 'pending' || st.status === 'error') return '';
  if (id === 'enhance' && st.status === 'done') {
    return `<div class="kv-row">${kv(tr('kvContrast'), '1.4x')}${kv(tr('kvSharpness'), '1.3x')}${kv(tr('kvOutput'), fmtBytes(d.processed_size_bytes))}</div>`;
  }
  if (id === 'vision') {
    if (st.status === 'done' || st.status === 'warn') {
      const chips = (d.medications || []).map((m, i) => `
        <div class="chip" style="animation-delay:${i * 90}ms"><strong>${esc(m.name)}</strong><span>${esc([m.dosage, m.frequency].filter(Boolean).join('  '))}</span></div>`).join('');
      const patient = d.patient_name && d.engine === 'live' ? `<div class="kv-row">${kv(tr('kvPatient'), d.patient_name)}</div>` : '';
      return `<div class="chip-row">${chips}</div>${patient}`;
    }
  }
  if (id === 'screening' && st.status === 'done') {
    const parts = [];
    if (d.contraindicated) parts.push(kv(tr('sevContraindicated'), d.contraindicated));
    if (d.major) parts.push(kv(tr('sevMajor'), d.major));
    if (d.moderate) parts.push(kv(tr('sevModerate'), d.moderate));
    return `<div class="kv-row">${d.alerts ? kv(tr('kvFound'), d.alerts) + parts.join('') : `<span><b>${esc(tr('kvNone'))}</b></span>`}</div>`;
  }
  return '';
}

/* ---- Document meta list ---- */
const META_ORDER = ['name', 'size', 'type', 'original', 'enhanced'];

function renderMeta(run) {
  const m = run.meta;
  const values = { name: m.name, size: m.size != null ? fmtBytes(m.size) : null, type: m.type, original: m.original, enhanced: m.enhanced };
  const list = el['scan-meta'];
  // Rows are updated in place and inserted in order, so rows already on screen never re-animate.
  META_ORDER.forEach((k, idx) => {
    if (!values[k]) return;
    let row = list.querySelector(`[data-k="${k}"]`);
    if (!row) {
      row = document.createElement('div');
      row.className = 'meta-row';
      row.dataset.k = k;
      row.innerHTML = '<dt></dt><dd></dd>';
      const next = Array.from(list.children).find((c) => META_ORDER.indexOf(c.dataset.k) > idx);
      list.insertBefore(row, next || null);
    }
    row.firstChild.textContent = tr('meta_' + k);
    row.lastChild.textContent = values[k];
  });
}

/* --------------------------------------------------------------------------
   Results
   -------------------------------------------------------------------------- */
function renderAnalysis(data, { animate }) {
  const hi = state.lang === 'hi';
  const a = data.analysis;
  const p = a.patient || {};
  const view = el['view-results'];
  view.classList.toggle('no-anim', !animate);

  el['patient-name'].textContent = p.name || tr('unspecified');
  el['patient-vitals'].textContent = p.age_gender || tr('unspecified');
  el['patient-doctor'].textContent = p.doctor || tr('unspecified');
  el['patient-date'].textContent = p.date || tr('unspecified');

  const eng = a.engine || {};
  const offline = eng.mode ? eng.mode === 'offline' : /offline/i.test(a.source || '');
  el['source-tag'].className = 'badge ' + (offline ? 'badge-caution' : 'badge-accent');
  el['source-tag'].textContent = offline ? tr('sourceOffline') : tr('sourceLive');

  el['report-sub'].textContent = [(state.analysisMeta || {}).name, offline ? tr('sourceOffline') : tr('sourceLive')].filter(Boolean).join('  -  ');
  renderStats(a, offline);

  const safety = a.safety || { level: 'safe' };
  el['safety-banner'].className = `safety-banner ${safety.level}`;
  const iconId = safety.level === 'danger' ? 'i-octagon' : safety.level === 'safe' ? 'i-check-circle' : 'i-alert';
  el['safety-icon'].innerHTML = `<use href="#${iconId}"/>`;
  el['safety-title'].textContent = sentenceCase(hi ? safety.badge_hi : safety.badge_en, hi);
  el['safety-desc'].textContent = hi ? safety.summary_hi : safety.summary_en;

  el['summary-text'].textContent = hi ? a.summary_hi : a.summary_en;

  renderInteractions(a.interactions || [], hi);
  renderSchedule(a.medications || [], hi);
  renderMedicationCards(a.medications || [], hi);

  view.querySelectorAll('.reveal').forEach((n, i) => n.style.setProperty('--i', i + 1));
  view.querySelectorAll('.med-item').forEach((n, i) => n.style.setProperty('--i', i));
}

function renderStats(a, offline) {
  const meds = a.medications || [];
  const ix = a.interactions || [];
  const sc = a.screening || {};
  const doses = meds.reduce((n, m) => {
    const s = slotsFor(m.frequency);
    return n + (s.morning ? 1 : 0) + (s.afternoon ? 1 : 0) + (s.night ? 1 : 0);
  }, 0);
  const secs = (state.analysisMeta || {}).readSecs;

  el['stat-meds'].textContent = meds.length;
  el['stat-meds-sub'].textContent = tr('statMedsSub', sc.medications_matched ?? 0, sc.medications_total ?? meds.length);
  el['stat-ix'].textContent = ix.length;
  el['stat-ix'].className = 'stat-value ' + (ix.some((x) => x.severity === 'contraindicated' || x.severity === 'major') ? 'is-danger' : ix.length ? '' : 'is-ok');
  el['stat-ix-sub'].textContent = tr('statIxSub', sc.pairs_checked ?? 0);
  el['stat-doses'].textContent = doses;
  el['stat-doses-sub'].textContent = tr('statDosesSub');
  el['stat-time'].textContent = secs != null ? `${secs.toFixed(1)} s` : '-';
  el['stat-time-sub'].textContent = offline ? tr('sourceOffline') : tr('statTimeSub');
}

const sentenceCase = (s, hi) => {
  if (hi || !s) return s || '';
  const l = s.toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
};

function renderInteractions(list, hi) {
  const box = el['interactions-list'];
  if (!list.length) {
    box.innerHTML = `<p class="interaction-none"><svg width="18" height="18" aria-hidden="true"><use href="#i-check-circle"/></svg>${esc(tr('noInteractions'))}</p>`;
    return;
  }
  const sev = {
    contraindicated: ['sevContraindicated', 'badge-danger'],
    major: ['sevMajor', 'badge-caution'],
    moderate: ['sevModerate', 'badge-moderate']
  };
  box.innerHTML = list.map((ix, i) => {
    const [key, cls] = sev[ix.severity] || sev.moderate;
    return `
    <div class="interaction" style="--i:${i}">
      <div class="interaction-head">
        <span class="badge ${cls}">${esc(tr(key))}</span>
        <span class="interaction-title">${esc(hi ? ix.title_hi : ix.title_en)}</span>
      </div>
      <div class="interaction-drugs">${esc((ix.drugs || []).join(' + ').toUpperCase())}</div>
      <p class="interaction-desc">${esc(hi ? ix.description_hi : ix.description_en)}</p>
      <p class="interaction-action"><span>${esc(tr('recommended'))}</span> ${esc(hi ? ix.action_hi : ix.action_en)}</p>
    </div>`;
  }).join('');
}

/* Reads "1-0-1" style schedules first, then falls back to common abbreviations and words. */
function slotsFor(freq) {
  const f = String(freq || '');
  const pat = f.match(/(\d)\s*-\s*(\d)\s*-\s*(\d)/);
  if (pat) return { morning: +pat[1] > 0, afternoon: +pat[2] > 0, night: +pat[3] > 0 };
  const l = f.toLowerCase();
  const s = { morning: false, afternoon: false, night: false };
  if (/\b(tds|tid|thrice|three times)\b/.test(l)) return { morning: true, afternoon: true, night: true };
  if (/\b(bd|bid|twice|two times)\b/.test(l)) return { morning: true, afternoon: false, night: true };
  if (/morning|breakfast|\bod\b|once|सुबह/.test(l)) s.morning = true;
  if (/afternoon|lunch|दोपहर/.test(l)) s.afternoon = true;
  if (/night|bed|dinner|\bhs\b|रात/.test(l)) s.night = true;
  if (!s.morning && !s.afternoon && !s.night) s.morning = true;
  return s;
}

function renderSchedule(meds, hi) {
  const slots = { morning: [], afternoon: [], night: [] };
  meds.forEach((m) => {
    const s = slotsFor(m.frequency);
    const item = { name: m.generic_name || m.raw_name, dose: m.dosage, timing: hi ? m.timing_hi : m.timing_en };
    Object.keys(slots).forEach((k) => { if (s[k]) slots[k].push(item); });
  });
  Object.entries(slots).forEach(([k, items]) => {
    el['schedule-' + k].innerHTML = items.length
      ? items.map((it) => `<div class="slot-item"><div class="slot-name">${esc(it.name)}<small>${esc(it.dose)}</small></div><div class="slot-timing">${esc(it.timing)}</div></div>`).join('')
      : `<p class="slot-empty">${esc(tr('slotEmpty'))}</p>`;
    el['count-' + k].textContent = items.length || '';
  });
}

function renderMedicationCards(meds, hi) {
  el['medications-cards'].innerHTML = meds.map((m) => `
    <article class="med-item">
      <div class="med-item-head">
        <div>
          <h4>${esc(m.generic_name || m.raw_name)}</h4>
          <span class="med-category">${esc(hi ? m.category_hi : m.category_en)}</span>
        </div>
        <div class="med-tags">
          ${m.identified ? '' : `<span class="badge badge-caution">${esc(tr('notInDb'))}</span>`}
          <span class="badge">${esc(m.dosage || '-')}</span>
        </div>
      </div>
      <dl class="med-facts">
        <div><dt>${esc(tr('lblDosage'))}</dt><dd>${esc(hi ? m.frequency_hi : m.frequency)}</dd></div>
        <div><dt>${esc(tr('lblTiming'))}</dt><dd>${esc(hi ? m.timing_hi : m.timing_en)}</dd></div>
        <div><dt>${esc(tr('lblDuration'))}</dt><dd>${esc(m.duration || '-')}</dd></div>
        <div class="wide"><dt>${esc(tr('lblUses'))}</dt><dd>${esc(hi ? m.uses_hi : m.uses_en)}</dd></div>
      </dl>
      <p class="med-warning"><strong>${esc(tr('lblWarnings'))}</strong> ${esc(hi ? m.warnings_hi : m.warnings_en)}</p>
    </article>`).join('');
}

/* --------------------------------------------------------------------------
   Text to speech
   -------------------------------------------------------------------------- */
function updateAudioButton() {
  if (!el['audio-label']) return;
  el['audio-label'].textContent = tr(state.speaking ? 'btnStopListen' : 'btnListen');
  el['audio-icon'].setAttribute('href', state.speaking ? '#i-stop' : '#i-volume');
}

function stopAudio() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.speaking = false;
  updateAudioButton();
}

function toggleAudio() {
  if (state.speaking) { stopAudio(); return; }
  if (!state.analysis) return;
  if (!('speechSynthesis' in window)) { el['summary-text'].setAttribute('title', tr('ttsUnsupported')); return; }

  const hi = state.lang === 'hi';
  const a = state.analysis.analysis;
  const u = new SpeechSynthesisUtterance(hi ? a.summary_hi : a.summary_en);
  u.lang = hi ? 'hi-IN' : 'en-US';
  u.rate = 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(hi ? 'hi' : 'en'));
  if (voice) u.voice = voice;
  u.onend = u.onerror = () => { state.speaking = false; updateAudioButton(); };

  window.speechSynthesis.cancel();
  state.speaking = true;
  updateAudioButton();
  window.speechSynthesis.speak(u);
}

/* --------------------------------------------------------------------------
   Reset
   -------------------------------------------------------------------------- */
function resetToUpload() {
  stopAudio();
  const run = state.run;
  if (run) {
    run.ctrl.abort();
    clearInterval(run.timer);
    if (run.objectUrl) URL.revokeObjectURL(run.objectUrl);
    state.run = null;
  }
  state.analysis = null;
  el['scan-meta'].innerHTML = '';
  showView('input');
}

/* --------------------------------------------------------------------------
   Scan history (kept in localStorage so scans survive a reload)
   -------------------------------------------------------------------------- */
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    state.history = Array.isArray(raw) ? raw.filter((e) => e && e.id && e.analysis) : [];
  } catch {
    state.history = [];
  }
  renderHistory();
}

function persistHistory(entries) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); return true; }
  catch { return false; }
}

/* Builds a small JPEG thumbnail; full-size scan images would blow the storage quota. */
function makeThumb(dataUrl, maxW) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function saveHistoryEntry({ name, readSecs, image, analysis }) {
  const thumb = await makeThumb(image, 480);
  const entries = state.history.slice();
  entries.unshift({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: Date.now(),
    name,
    readSecs,
    thumb,
    analysis
  });
  entries.length = Math.min(entries.length, HISTORY_MAX);
  // If the payload still does not fit, drop the oldest entries until it does.
  let saved = false;
  while (entries.length) {
    saved = persistHistory(entries);
    if (saved) break;
    entries.pop();
  }
  if (!saved) { console.warn('Scan history storage is full; this scan was not saved.'); return; }
  state.history = entries;
  renderHistory();
}

function updateHistoryBadge() {
  const n = state.history.length;
  el['history-badge'].textContent = n;
  el['history-badge'].style.display = n ? '' : 'none';
}

function renderHistory() {
  if (!el['history-list']) return;
  updateHistoryBadge();
  el['history-count'].textContent = tr('historyCount', state.history.length);

  if (!state.history.length) {
    el['history-list'].innerHTML = `
      <div class="history-empty">
        <svg class="icon icon-xl" aria-hidden="true"><use href="#i-clock"/></svg>
        <p>${esc(tr('historyEmpty'))}</p>
        <span>${esc(tr('historyEmptySub'))}</span>
      </div>`;
    return;
  }

  const hi = state.lang === 'hi';
  const badgeCls = { danger: 'badge-danger', caution: 'badge-caution', moderate: 'badge-moderate', safe: 'badge-safe' };
  el['history-list'].innerHTML = state.history.map((e) => {
    const a = e.analysis || {};
    const safety = a.safety || {};
    const meds = (a.medications || []).length;
    const ix = (a.interactions || []).length;
    const date = new Date(e.savedAt).toLocaleString(hi ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const badge = safety.level
      ? `<span class="badge ${badgeCls[safety.level] || ''}">${esc(sentenceCase(hi ? safety.badge_hi : safety.badge_en, hi))}</span>`
      : '';
    const thumb = e.thumb
      ? `<img src="${e.thumb}" alt="">`
      : '<svg class="icon" aria-hidden="true"><use href="#i-file-text"/></svg>';
    return `
      <div class="history-item" data-id="${esc(e.id)}">
        <div class="history-item-thumb">${thumb}</div>
        <div class="history-item-body">
          <div class="history-item-head">
            <span class="history-item-title">${esc(e.name || '-')}</span>${badge}
          </div>
          <div class="history-item-meta">
            <span>${esc(date)}</span>
            <span>${meds} ${esc(tr('statMeds'))}</span>
            <span>${ix} ${esc(tr('statIx'))}</span>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-act="open">${esc(tr('btnOpenReport'))}</button>
          <button class="icon-btn" type="button" data-act="delete" aria-label="${esc(tr('btnDelete'))}" title="${esc(tr('btnDelete'))}"><svg class="icon"><use href="#i-trash"/></svg></button>
        </div>
      </div>`;
  }).join('');
}

function onHistoryListClick(e) {
  const item = e.target.closest('.history-item');
  if (!item) return;
  const id = item.dataset.id;
  if (e.target.closest('[data-act="delete"]')) { deleteHistoryEntry(id); return; }
  if (e.target.closest('[data-act="open"]') || !e.target.closest('button')) openHistoryEntry(id);
}

function deleteHistoryEntry(id) {
  state.history = state.history.filter((e) => e.id !== id);
  persistHistory(state.history);
  renderHistory();
}

function clearHistory() {
  if (!state.history.length) return;
  if (!window.confirm(tr('confirmClearHistory'))) return;
  state.history = [];
  persistHistory(state.history);
  renderHistory();
}

function openHistory() {
  renderHistory();
  el['modal-history'].classList.add('active');
  el['btn-history-open'].setAttribute('aria-expanded', 'true');
}

function closeHistory() {
  el['modal-history'].classList.remove('active');
  el['btn-history-open'].setAttribute('aria-expanded', 'false');
}

function openHistoryEntry(id) {
  const entry = state.history.find((e) => e.id === id);
  if (!entry) return;
  stopAudio();
  closeHistory();
  state.analysis = { success: true, image_data_url: entry.thumb || '', metadata: {}, analysis: entry.analysis };
  state.analysisMeta = { name: entry.name, readSecs: entry.readSecs };
  el['image-preview'].src = entry.thumb || '';
  showView('results');
  renderAnalysis(state.analysis, { animate: false });
}
