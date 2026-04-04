// ============================================================
//  MedCore HMS — Frontend App
//  Communicates with the Express + MongoDB backend on :3000
// ============================================================

const API = 'http://localhost:3000/api';

// ── NAVIGATION ──────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchSection(btn.dataset.section);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.section === name) b.classList.add('active');
    else b.classList.remove('active');
  });
  if (name === 'patients') loadPatients();
  if (name === 'doctors') loadDoctors();
  if (name === 'appointments') loadAppointments();
  if (name === 'analytics') loadAnalytics();
  if (name === 'dashboard') loadDashboard();
}

// ── LIVE DATE ────────────────────────────────────────────────
function updateDate() {
  const d = new Date();
  document.getElementById('live-date').innerHTML =
    `${d.toLocaleDateString('en-IN', { weekday:'long' })}<br>
     ${d.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`;
}
updateDate(); setInterval(updateDate, 60000);

// ── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── MODAL ────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  if (id === 'add-appointment-modal') populateSelects();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── API HELPERS ──────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    return await res.json();
  } catch (e) {
    console.error(e);
    toast('Server not reachable. Run the backend first.', 'error');
    return null;
  }
}

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboard() {
  const [patients, doctors, appointments, analytics] = await Promise.all([
    apiFetch('/patients'),
    apiFetch('/doctors'),
    apiFetch('/appointments'),
    apiFetch('/analytics/patients-per-doctor')
  ]);

  if (patients) document.getElementById('stat-patients').textContent = patients.length;
  if (doctors)  document.getElementById('stat-doctors').textContent = doctors.length;
  if (appointments) document.getElementById('stat-appointments').textContent = appointments.length;

  // Top doctor
  if (analytics && analytics.length) {
    document.getElementById('stat-top-doctor').textContent = analytics[0]._id;
  }

  // Recent appointments
  if (appointments) {
    const tbody = document.getElementById('recent-appointments');
    const recent = appointments.slice(-5).reverse();
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No appointments yet</td></tr>';
    } else {
      tbody.innerHTML = recent.map(a => `
        <tr>
          <td>${a.patient_name || '—'}</td>
          <td>${a.doctor_name || '—'}</td>
          <td>${formatDate(a.date)}</td>
          <td><span class="status-badge status-${a.status}">${a.status}</span></td>
        </tr>
      `).join('');
    }
  }

  // Bar chart
  if (analytics && analytics.length) {
    const max = analytics[0].count;
    const container = document.getElementById('doctor-chart');
    container.innerHTML = analytics.slice(0, 6).map(d => `
      <div class="bar-item">
        <div class="bar-label" title="${d._id}">${d._id}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(d.count/max*100)}%"></div></div>
        <div class="bar-count">${d.count}</div>
      </div>
    `).join('');
  }
}

// ============================================================
//  PATIENTS
// ============================================================
let allPatients = [];

async function loadPatients() {
  const data = await apiFetch('/patients');
  allPatients = data || [];
  renderPatients(allPatients);
}

function renderPatients(patients) {
  const tbody = document.getElementById('patients-table');
  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No patients found</td></tr>';
    return;
  }
  tbody.innerHTML = patients.map(p => `
    <tr>
      <td><strong style="color:var(--text)">${p.name}</strong></td>
      <td>${p.age}</td>
      <td><span class="badge">${p.blood_type || '—'}</span></td>
      <td>${p.contact || '—'}</td>
      <td>
        <button class="btn-ghost" style="font-size:11px;padding:4px 10px" onclick="showHistory('${p._id}','${escHtml(p.name)}')">
          ${(p.medical_history || []).length} Record(s)
        </button>
      </td>
      <td>
        <button class="btn-icon danger" onclick="deletePatient('${p._id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

function filterPatients() {
  const q = document.getElementById('patient-search').value.toLowerCase();
  renderPatients(allPatients.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.blood_type && p.blood_type.toLowerCase().includes(q))
  ));
}

async function addPatient() {
  const payload = {
    name:    document.getElementById('p-name').value.trim(),
    age:     parseInt(document.getElementById('p-age').value),
    gender:  document.getElementById('p-gender').value,
    blood_type: document.getElementById('p-blood').value,
    contact: document.getElementById('p-contact').value.trim(),
    email:   document.getElementById('p-email').value.trim(),
    address: document.getElementById('p-address').value.trim(),
    medical_history: []
  };
  if (!payload.name) { toast('Patient name is required', 'error'); return; }

  const cond = document.getElementById('p-condition').value.trim();
  if (cond) {
    payload.medical_history.push({
      condition:      cond,
      diagnosis_date: document.getElementById('p-diag-date').value,
      treatment:      document.getElementById('p-treatment').value.trim(),
      notes:          document.getElementById('p-notes').value.trim()
    });
  }

  const res = await apiFetch('/patients', { method:'POST', body: JSON.stringify(payload) });
  if (res && res._id) {
    toast('Patient added successfully!');
    closeModal('add-patient-modal');
    loadPatients();
  } else {
    toast('Failed to add patient', 'error');
  }
}

async function deletePatient(id) {
  if (!confirm('Delete this patient?')) return;
  await apiFetch(`/patients/${id}`, { method:'DELETE' });
  toast('Patient deleted');
  loadPatients();
}

async function showHistory(id, name) {
  const patient = allPatients.find(p => p._id === id);
  const body = document.getElementById('history-modal-body');
  document.querySelector('#history-modal .modal-header h2').textContent = `${name} — Medical History`;

  if (!patient || !patient.medical_history || !patient.medical_history.length) {
    body.innerHTML = '<div class="history-empty">No medical history records yet.</div>';
  } else {
    body.innerHTML = patient.medical_history.map(h => `
      <div class="history-entry">
        <div class="history-entry-header">
          <div class="history-condition">${h.condition}</div>
          <div class="history-date">${h.diagnosis_date ? formatDate(h.diagnosis_date) : '—'}</div>
        </div>
        <div class="history-treatment">💊 ${h.treatment || 'No treatment specified'}</div>
        ${h.notes ? `<div class="history-notes">${h.notes}</div>` : ''}
      </div>
    `).join('');
  }
  openModal('history-modal');
}

// ============================================================
//  DOCTORS
// ============================================================
async function loadDoctors() {
  const data = await apiFetch('/doctors');
  const grid = document.getElementById('doctors-grid');
  if (!data || !data.length) {
    grid.innerHTML = '<div class="empty-state">No doctors registered yet.</div>';
    return;
  }
  grid.innerHTML = data.map(d => `
    <div class="doctor-card">
      <div class="doctor-actions">
        <button class="btn-icon danger" onclick="deleteDoctor('${d._id}')">✕</button>
      </div>
      <div class="doctor-avatar">${initials(d.name)}</div>
      <div class="doctor-name">${d.name}</div>
      <div class="doctor-spec">${d.specialization}</div>
      <div class="doctor-meta">
        <span>🏥 <strong>${d.department || '—'}</strong></span>
        <span>📞 <strong>${d.contact || '—'}</strong></span>
        <span>⏱ <strong>${d.experience || 0} yrs exp</strong></span>
        <span>💰 <strong>₹${d.consultation_fee || 0}</strong></span>
        <span>📅 <strong>${d.available_days || '—'}</strong></span>
      </div>
    </div>
  `).join('');
}

async function addDoctor() {
  const payload = {
    name:             document.getElementById('d-name').value.trim(),
    specialization:   document.getElementById('d-spec').value.trim(),
    department:       document.getElementById('d-dept').value.trim(),
    experience:       parseInt(document.getElementById('d-exp').value) || 0,
    contact:          document.getElementById('d-contact').value.trim(),
    email:            document.getElementById('d-email').value.trim(),
    consultation_fee: parseFloat(document.getElementById('d-fee').value) || 0,
    available_days:   document.getElementById('d-days').value.trim()
  };
  if (!payload.name) { toast('Doctor name is required', 'error'); return; }

  const res = await apiFetch('/doctors', { method:'POST', body: JSON.stringify(payload) });
  if (res && res._id) {
    toast('Doctor added successfully!');
    closeModal('add-doctor-modal');
    loadDoctors();
  } else {
    toast('Failed to add doctor', 'error');
  }
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor?')) return;
  await apiFetch(`/doctors/${id}`, { method:'DELETE' });
  toast('Doctor deleted');
  loadDoctors();
}

// ============================================================
//  APPOINTMENTS
// ============================================================
async function loadAppointments() {
  const status = document.getElementById('appt-filter-status').value;
  const url = status ? `/appointments?status=${status}` : '/appointments';
  const data = await apiFetch(url);
  const tbody = document.getElementById('appointments-table');

  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No appointments found</td></tr>';
    return;
  }
  tbody.innerHTML = data.reverse().map(a => `
    <tr>
      <td>${a.patient_name || '—'}</td>
      <td>${a.doctor_name || '—'}</td>
      <td>${formatDate(a.date)} ${a.time || ''}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(a.reason || '')}">${a.reason || '—'}</td>
      <td><span class="status-badge status-${a.status}">${a.status}</span></td>
      <td>
        <button class="btn-icon danger" onclick="deleteAppointment('${a._id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

async function populateSelects() {
  const [patients, doctors] = await Promise.all([apiFetch('/patients'), apiFetch('/doctors')]);
  const pSel = document.getElementById('a-patient');
  const dSel = document.getElementById('a-doctor');
  pSel.innerHTML = '<option value="">Select Patient...</option>' +
    (patients || []).map(p => `<option value="${p._id}">${p.name}</option>`).join('');
  dSel.innerHTML = '<option value="">Select Doctor...</option>' +
    (doctors || []).map(d => `<option value="${d._id}">${d.name} — ${d.specialization}</option>`).join('');
}

async function addAppointment() {
  const pSel = document.getElementById('a-patient');
  const dSel = document.getElementById('a-doctor');
  const payload = {
    patient_id:   pSel.value,
    doctor_id:    dSel.value,
    patient_name: pSel.options[pSel.selectedIndex]?.text,
    doctor_name:  dSel.options[dSel.selectedIndex]?.text.split(' — ')[0],
    date:         document.getElementById('a-date').value,
    time:         document.getElementById('a-time').value,
    reason:       document.getElementById('a-reason').value.trim(),
    status:       document.getElementById('a-status').value
  };
  if (!payload.patient_id || !payload.doctor_id) { toast('Select patient and doctor', 'error'); return; }
  if (!payload.date) { toast('Date is required', 'error'); return; }

  const res = await apiFetch('/appointments', { method:'POST', body: JSON.stringify(payload) });
  if (res && res._id) {
    toast('Appointment booked!');
    closeModal('add-appointment-modal');
    loadAppointments();
  } else {
    toast('Failed to book appointment', 'error');
  }
}

async function deleteAppointment(id) {
  if (!confirm('Delete this appointment?')) return;
  await apiFetch(`/appointments/${id}`, { method:'DELETE' });
  toast('Appointment deleted');
  loadAppointments();
}

// ============================================================
//  ANALYTICS
// ============================================================
async function loadAnalytics() {
  const [perDoctor, topDoctor, indexes] = await Promise.all([
    apiFetch('/analytics/patients-per-doctor'),
    apiFetch('/analytics/most-visited-doctor'),
    apiFetch('/analytics/indexes')
  ]);

  // Patients per doctor
  const perDoctorEl = document.getElementById('analytics-per-doctor');
  if (perDoctor && perDoctor.length) {
    const max = perDoctor[0].count;
    perDoctorEl.innerHTML = perDoctor.map(d => `
      <div class="analytics-row">
        <div>
          <div class="analytics-row-name">${d._id}</div>
          <div class="analytics-row-spec">${d.specialization || ''}</div>
        </div>
        <div class="analytics-row-bar">
          <div class="analytics-row-bar-fill" style="width:${(d.count/max*100)}%"></div>
        </div>
        <div class="analytics-row-count">${d.count}</div>
      </div>
    `).join('');
  } else {
    perDoctorEl.innerHTML = '<div class="history-empty">No data. Book some appointments first.</div>';
  }

  // Top doctor
  const topEl = document.getElementById('analytics-top-doctor');
  if (topDoctor && topDoctor.name) {
    topEl.innerHTML = `
      <div class="top-doc-avatar">${initials(topDoctor.name)}</div>
      <div class="top-doc-name">${topDoctor.name}</div>
      <div class="top-doc-spec">${topDoctor.specialization || 'Specialist'}</div>
      <div class="top-doc-count"><strong>${topDoctor.count}</strong> patient visits</div>
    `;
  } else {
    topEl.innerHTML = '<div class="history-empty">No data yet.</div>';
  }

  // Indexes
  const idxEl = document.getElementById('analytics-indexes');
  if (indexes && indexes.length) {
    idxEl.innerHTML = indexes.map(idx => `
      <div class="index-item">
        <div>
          <div class="index-key">${idx.name}</div>
          <div class="index-info">Collection: <strong>${idx.collection}</strong></div>
        </div>
        <div>
          <div class="index-info">Type: <span style="color:var(--teal)">${JSON.stringify(idx.key)}</span></div>
          <div class="index-info">${idx.unique ? '🔒 Unique' : 'Non-unique'} · ${idx.sparse ? 'Sparse' : 'Standard'}</div>
        </div>
      </div>
    `).join('');
  } else {
    idxEl.innerHTML = '<div class="history-empty">Index info unavailable.</div>';
  }
}

// ── UTILS ────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── INIT ─────────────────────────────────────────────────────
loadDashboard();