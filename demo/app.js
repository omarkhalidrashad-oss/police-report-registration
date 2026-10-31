/**
 * Training demo for تسجيل بيانات المحضر.
 * This is not a real police system. Governorates, stations, and people are fictional.
 *
 * Message catalogue (use these strings exactly):
 * - هذا الحقل مطلوب
 * - يسمح بالأرقام فقط
 * - لا يمكن اختيار نفس الطرف كمُقدّم وضدّ في نفس الوقت
 * - تم حفظ بيانات المحضر بنجاح
 * - هل أنت تأكد من التراجع؟ سيتم فقد البيانات غير المحفوظة.
 *
 * ASSUMPTION messages are marked below. They are not in the catalogue.
 * See docs/Police-Report-User-Story-Review.docx.
 *
 * إضافة saves the person onto the current request immediately (AC3).
 * رجوع asks for confirmation only when report fields changed and were not saved (AC5).
 */
const SAMPLE = {
  requestId: 'REQ-2026-001',
  governorates: ['القاهرة', 'الجيزة', 'الإسكندرية'],
  stations: {
    القاهرة: ['قسم قصر النيل', 'قسم الأزبكية', 'قسم المعادي'],
    الجيزة: ['قسم الدقي', 'قسم العجوزة', 'قسم الهرم'],
    الإسكندرية: ['قسم سيدي جابر', 'قسم المنتزه', 'قسم الرمل'],
  },
  years: ['2023', '2024', '2025', '2026'],
  types: ['إداري', 'جنح'],
  parties: ['أحمد محمود', 'سارة علي'],
};

const MESSAGES = {
  required: 'هذا الحقل مطلوب',
  digits: 'يسمح بالأرقام فقط',
  sameParty: 'لا يمكن اختيار نفس الطرف كمُقدّم وضدّ في نفس الوقت',
  success: 'تم حفظ بيانات المحضر بنجاح',
  unsaved: 'هل أنت تأكد من التراجع؟ سيتم فقد البيانات غير المحفوظة.',
  // ASSUMPTION: the story forbids 0 and values above 999999 but gives no message.
  range: 'يجب أن يكون رقم المحضر بين 1 و 999999',
  // ASSUMPTION: the story forbids a future date but gives no message.
  future: 'لا يمكن أن يكون تاريخ المحضر في المستقبل',
  // ASSUMPTION: a party is only a name, so the same name is the same person.
  duplicate: 'هذا الطرف مسجل مسبقاً في الطلب',
};

const STORAGE_PARTIES = 'police-report-parties';
const STORAGE_REPORT = 'police-report-saved';
const ERROR_KEYS = [
  'governorate',
  'police-station',
  'report-number',
  'report-date',
  'report-type',
  'year',
  'complainant',
  'defendant',
];

const governorateEl = document.getElementById('governorate');
const policeStationEl = document.getElementById('police-station');
const numberEl = document.getElementById('report-number');
const dateEl = document.getElementById('report-date');
const dateDisplayEl = document.getElementById('date-display');
const typeEl = document.getElementById('report-type');
const yearEl = document.getElementById('year');
const complainantEl = document.getElementById('complainant');
const defendantEl = document.getElementById('defendant');
const reportForm = document.getElementById('report-form');
const addDialog = document.getElementById('add-dialog');
const partyNameEl = document.getElementById('party-name');
const unsavedDialog = document.getElementById('unsaved-dialog');
const toastEl = document.getElementById('toast');

let formLocked = false;
let parties = [];
let savedReport = null;
let baseline = emptyValues();

function emptyValues() {
  return {
    governorate: '',
    station: '',
    number: '',
    date: '',
    type: '',
    year: '',
    complainant: '',
    defendant: '',
  };
}

function todayIso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toDisplayDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function loadParties() {
  const raw = sessionStorage.getItem(STORAGE_PARTIES);
  if (!raw) return SAMPLE.parties.slice();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string' && item.trim())) return parsed;
  } catch (error) {
    // A damaged session falls back to the two parties that came with the request.
  }
  return SAMPLE.parties.slice();
}

function loadReport() {
  const raw = sessionStorage.getItem(STORAGE_REPORT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.requestId) return parsed;
  } catch (error) {
    return null;
  }
  return null;
}

function currentValues() {
  return {
    governorate: governorateEl.value,
    station: policeStationEl.value,
    number: numberEl.value,
    date: dateEl.value,
    type: typeEl.value,
    year: yearEl.value,
    complainant: complainantEl.value,
    defendant: defendantEl.value,
  };
}

function isDirty() {
  return JSON.stringify(currentValues()) !== JSON.stringify(baseline);
}

function fillStaticSelect(select, items, placeholder) {
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = placeholder;
  select.appendChild(blank);
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  }
}

function fillStations(governorate, selected) {
  const stations = SAMPLE.stations[governorate] || [];
  policeStationEl.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = governorate ? 'اختر' : 'اختر المحافظة أولاً';
  policeStationEl.appendChild(blank);
  for (const name of stations) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    policeStationEl.appendChild(option);
  }
  policeStationEl.disabled = stations.length === 0;
  policeStationEl.value = stations.includes(selected) ? selected : '';
}

function fillParties(select, selected) {
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'اختر';
  select.appendChild(blank);
  for (const name of parties) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  select.value = parties.includes(selected) ? selected : '';
}

function applyValues(values) {
  governorateEl.value = values.governorate;
  fillStations(values.governorate, values.station);
  numberEl.value = values.number;
  dateEl.value = values.date;
  updateDateDisplay();
  typeEl.value = values.type;
  yearEl.value = values.year;
  fillParties(complainantEl, values.complainant);
  fillParties(defendantEl, values.defendant);
}

function updateDateDisplay() {
  dateDisplayEl.textContent = dateEl.value ? toDisplayDate(dateEl.value) : '—';
}

function setError(key, message) {
  const error = document.getElementById(`error-${key}`);
  const field = document.getElementById(key);
  if (!error) return;
  if (message) {
    error.hidden = false;
    error.textContent = message;
    if (field) field.setAttribute('aria-invalid', 'true');
  } else {
    error.hidden = true;
    error.textContent = '';
    if (field) field.removeAttribute('aria-invalid');
  }
}

function applyErrors(result) {
  for (const key of ERROR_KEYS) setError(key, result.errors[key] || '');
  setError('same-party', result.formError || '');
}

function clearAllErrors() {
  for (const key of ERROR_KEYS) setError(key, '');
  setError('same-party', '');
  setError('party-name', '');
}

function isAllowedReportNumber(raw) {
  if (!/^\d{1,6}$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 999999;
}

function validate() {
  const values = currentValues();
  const errors = {};
  if (!values.governorate) errors.governorate = MESSAGES.required;
  if (!values.station) errors['police-station'] = MESSAGES.required;
  if (!values.number.trim()) errors['report-number'] = MESSAGES.required;
  else if (/\D/.test(values.number)) errors['report-number'] = MESSAGES.digits;
  else if (!isAllowedReportNumber(values.number)) errors['report-number'] = MESSAGES.range;
  if (!values.date) errors['report-date'] = MESSAGES.required;
  else if (values.date > todayIso()) errors['report-date'] = MESSAGES.future;
  if (!values.type) errors['report-type'] = MESSAGES.required;
  if (!values.year) errors.year = MESSAGES.required;
  if (!values.complainant) errors.complainant = MESSAGES.required;
  if (!values.defendant) errors.defendant = MESSAGES.required;
  let formError = '';
  if (values.complainant && values.defendant && values.complainant === values.defendant) {
    formError = MESSAGES.sameParty;
  }
  return { errors, formError };
}

function hasErrors(result) {
  return Object.keys(result.errors).length > 0 || Boolean(result.formError);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function showSummary(report) {
  document.getElementById('saved-summary').hidden = false;
  setText('saved-request-id', report.requestId);
  setText('saved-governorate', report.governorate);
  setText('saved-station', report.station);
  setText('saved-number', report.number);
  setText('saved-date', report.dateDisplay);
  setText('saved-type', report.type);
  setText('saved-year', report.year);
  setText('saved-complainant', report.complainant);
  setText('saved-defendant', report.defendant);
}

function hideSummary() {
  document.getElementById('saved-summary').hidden = true;
}

function renderRequest() {
  const list = document.getElementById('request-parties');
  list.replaceChildren();
  for (const name of parties) {
    const item = document.createElement('li');
    item.textContent = name;
    list.appendChild(item);
  }
  const card = document.getElementById('request-saved-card');
  if (!savedReport) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  setText('request-saved-request-id', savedReport.requestId);
  setText('request-saved-governorate', savedReport.governorate);
  setText('request-saved-station', savedReport.station);
  setText('request-saved-number', savedReport.number);
  setText('request-saved-date', savedReport.dateDisplay);
  setText('request-saved-type', savedReport.type);
  setText('request-saved-year', savedReport.year);
  setText('request-saved-complainant', savedReport.complainant);
  setText('request-saved-defendant', savedReport.defendant);
}

function showToast(message) {
  toastEl.hidden = false;
  toastEl.textContent = message;
}

function hideToast() {
  toastEl.hidden = true;
  toastEl.textContent = '';
}

function showView(name) {
  document.getElementById('view-request').hidden = name !== 'request';
  document.getElementById('view-report').hidden = name !== 'report';
}

function lockForm(locked) {
  formLocked = locked;
  for (const element of reportForm.elements) {
    if (element.id === 'back') {
      element.disabled = false;
      continue;
    }
    element.disabled = locked;
  }
  if (!locked) policeStationEl.disabled = !governorateEl.value;
}

function savedToFields(report) {
  return {
    governorate: report.governorate,
    station: report.station,
    number: report.number,
    date: report.date,
    type: report.type,
    year: report.year,
    complainant: report.complainant,
    defendant: report.defendant,
  };
}

function openForm() {
  clearAllErrors();
  hideToast();
  if (savedReport) {
    applyValues(savedToFields(savedReport));
    showSummary(savedReport);
    lockForm(true);
  } else {
    applyValues(emptyValues());
    hideSummary();
    lockForm(false);
  }
  baseline = currentValues();
  showView('report');
}

function onSave(event) {
  event.preventDefault();
  if (formLocked) return;
  const result = validate();
  applyErrors(result);
  if (hasErrors(result)) {
    hideToast();
    return;
  }
  const values = currentValues();
  // 000123 has six digits. Its numeric value is 123, which is inside 1..999999.
  const report = {
    requestId: SAMPLE.requestId,
    governorate: values.governorate,
    station: values.station,
    number: String(Number(values.number)),
    date: values.date,
    dateDisplay: toDisplayDate(values.date),
    type: values.type,
    year: values.year,
    complainant: values.complainant,
    defendant: values.defendant,
  };
  numberEl.value = report.number;
  savedReport = report;
  sessionStorage.setItem(STORAGE_REPORT, JSON.stringify(report));
  baseline = currentValues();
  lockForm(true);
  showSummary(report);
  renderRequest();
  showToast(MESSAGES.success);
}

function onBack() {
  if (formLocked || !isDirty()) {
    hideToast();
    showView('request');
    renderRequest();
    return;
  }
  unsavedDialog.showModal();
}

function discardAndLeave() {
  unsavedDialog.close();
  applyValues(baseline);
  clearAllErrors();
  updateDateDisplay();
  hideToast();
  showView('request');
  renderRequest();
}

function openAdd() {
  partyNameEl.value = '';
  setError('party-name', '');
  addDialog.showModal();
  partyNameEl.focus();
}

function closeAdd() {
  setError('party-name', '');
  partyNameEl.value = '';
  if (addDialog.open) addDialog.close();
}

function confirmAdd() {
  const name = partyNameEl.value.trim();
  if (!name) {
    setError('party-name', MESSAGES.required);
    return;
  }
  if (parties.includes(name)) {
    setError('party-name', MESSAGES.duplicate);
    return;
  }
  parties.push(name);
  sessionStorage.setItem(STORAGE_PARTIES, JSON.stringify(parties));
  fillParties(complainantEl, complainantEl.value);
  fillParties(defendantEl, defendantEl.value);
  renderRequest();
  closeAdd();
}

function bindEvents() {
  governorateEl.addEventListener('change', () => {
    // The previous station belongs to the old governorate, so it cannot stay selected.
    fillStations(governorateEl.value, '');
    setError('governorate', '');
    setError('police-station', '');
  });
  policeStationEl.addEventListener('change', () => setError('police-station', ''));
  typeEl.addEventListener('change', () => setError('report-type', ''));
  yearEl.addEventListener('change', () => setError('year', ''));
  complainantEl.addEventListener('change', () => {
    setError('complainant', '');
    setError('same-party', '');
  });
  defendantEl.addEventListener('change', () => {
    setError('defendant', '');
    setError('same-party', '');
  });
  numberEl.addEventListener('input', () => {
    if (numberEl.value && /\D/.test(numberEl.value)) setError('report-number', MESSAGES.digits);
    else setError('report-number', '');
  });
  dateEl.addEventListener('change', () => {
    updateDateDisplay();
    setError('report-date', '');
  });
  reportForm.addEventListener('submit', onSave);
  document.getElementById('back').addEventListener('click', onBack);
  document.getElementById('open-report').addEventListener('click', openForm);
  document.getElementById('add-party').addEventListener('click', openAdd);
  document.getElementById('add-confirm').addEventListener('click', confirmAdd);
  document.getElementById('add-cancel').addEventListener('click', closeAdd);
  partyNameEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmAdd();
    }
  });
  document.getElementById('unsaved-yes').addEventListener('click', discardAndLeave);
  document.getElementById('unsaved-no').addEventListener('click', () => unsavedDialog.close());
}

function init() {
  parties = loadParties();
  savedReport = loadReport();
  fillStaticSelect(governorateEl, SAMPLE.governorates, 'اختر');
  fillStaticSelect(typeEl, SAMPLE.types, 'اختر');
  fillStaticSelect(yearEl, SAMPLE.years, 'اختر');
  fillStations('', '');
  fillParties(complainantEl, '');
  fillParties(defendantEl, '');
  document.getElementById('unsaved-message').textContent = MESSAGES.unsaved;
  renderRequest();
  showView('request');
  bindEvents();
}

init();
