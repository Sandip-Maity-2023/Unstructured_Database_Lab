const API = `${window.location.origin}/api`;

let allPatients = [];

document.querySelectorAll('.nav-btn').forEach((button) => {
  button.addEventListener('click', () => {
    switchSection(button.dataset.section);
  });
});

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

function switchSection(name) {
  document.querySelectorAll('.section').forEach((section) => {
    section.classList.remove('active');
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === name);
  });

  const activeSection = document.getElementById(name);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  if (name === 'dashboard') loadDashboard();
  if (name === 'patients') loadPatients();
  if (name === 'doctors') loadDoctors();
  if (name === 'appointments') loadAppointments();
  if (name === 'analytics') loadAnalytics();
}

function updateDate() {
  const currentDate = new Date();
  const liveDate = document.getElementById('live-date');

  if (!liveDate) return;

  liveDate.innerHTML = `${currentDate.toLocaleDateString('en-IN', { weekday: 'long' })}<br>${currentDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}`;
}

function toast(message, type = 'success') {
  const element = document.getElementById('toast');
  if (!element) return;

  element.textContent = message;
  element.className = `toast ${type} show`;

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add('open');

  if (id === 'add-appointment-modal') {
    populateSelects();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
  }
}

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error || 'Request failed';
      toast(message, 'error');
      return null;
    }

    updateDbStatus('MongoDB Connected', true);
    return payload;
  } catch (error) {
    console.error(error);
    updateDbStatus('Backend unavailable', false);
    toast('Server not reachable. Start the backend first.', 'error');
    return null;
  }
}

function updateDbStatus(text, connected) {
  const statusText = document.getElementById('db-status-text');
  const dot = document.querySelector('.db-dot');

  if (statusText) {
    statusText.textContent = text;
  }

  if (dot) {
    dot.style.background = connected ? 'var(--teal)' : 'var(--rose)';
    dot.style.boxShadow = connected ? '0 0 8px var(--teal)' : '0 0 8px var(--rose)';
  }
}

async function loadDashboard() {
  const [patients, doctors, appointments, analytics] = await Promise.all([
    apiFetch('/patients'),
    apiFetch('/doctors'),
    apiFetch('/appointments'),
    apiFetch('/analytics/patients-per-doctor')
  ]);

  setText('stat-patients', patients ? patients.length : '-');
  setText('stat-doctors', doctors ? doctors.length : '-');
  setText('stat-appointments', appointments ? appointments.length : '-');
  setText('stat-top-doctor', analytics?.length ? analytics[0]._id : '-');

  const recentAppointments = document.getElementById('recent-appointments');
  if (recentAppointments) {
    const recent = appointments ? appointments.slice(0, 5) : [];
    recentAppointments.innerHTML = recent.length
      ? recent.map((appointment) => `
          <tr>
            <td>${escapeHtml(appointment.patient_name || '-')}</td>
            <td>${escapeHtml(appointment.doctor_name || '-')}</td>
            <td>${formatDate(appointment.date)}</td>
            <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" class="empty-row">No appointments yet</td></tr>';
  }

  const chart = document.getElementById('doctor-chart');
  if (chart) {
    if (!analytics?.length) {
      chart.innerHTML = '<div class="empty-state">No analytics data available.</div>';
      return;
    }

    const max = analytics[0].count || 1;
    chart.innerHTML = analytics.slice(0, 6).map((doctor) => `
      <div class="bar-item">
        <div class="bar-label" title="${escapeHtml(doctor._id)}">${escapeHtml(doctor._id)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(doctor.count / max) * 100}%"></div></div>
        <div class="bar-count">${doctor.count}</div>
      </div>
    `).join('');
  }
}

async function loadPatients() {
  const patients = await apiFetch('/patients');
  allPatients = patients || [];
  renderPatients(allPatients);
}

function renderPatients(patients) {
  const table = document.getElementById('patients-table');
  if (!table) return;

  if (!patients.length) {
    table.innerHTML = '<tr><td colspan="6" class="empty-row">No patients found</td></tr>';
    return;
  }

  table.innerHTML = patients.map((patient) => `
    <tr>
      <td><strong style="color:var(--text)">${escapeHtml(patient.name)}</strong></td>
      <td>${patient.age ?? '-'}</td>
      <td><span class="badge">${escapeHtml(patient.blood_type || '-')}</span></td>
      <td>${escapeHtml(patient.contact || '-')}</td>
      <td>
        <button class="btn-ghost" style="font-size:11px;padding:4px 10px" onclick="showHistory('${patient._id}', '${escapeJs(patient.name)}')">
          ${(patient.medical_history || []).length} Record(s)
        </button>
      </td>
      <td>
        <button class="btn-icon danger" onclick="deletePatient('${patient._id}')">X</button>
      </td>
    </tr>
  `).join('');
}

function filterPatients() {
  const query = document.getElementById('patient-search')?.value.toLowerCase() || '';
  const filtered = allPatients.filter((patient) =>
    patient.name.toLowerCase().includes(query) ||
    (patient.blood_type || '').toLowerCase().includes(query)
  );
  renderPatients(filtered);
}

async function addPatient() {
  const payload = {
    name: document.getElementById('p-name')?.value.trim(),
    age: Number.parseInt(document.getElementById('p-age')?.value, 10),
    gender: document.getElementById('p-gender')?.value,
    blood_type: document.getElementById('p-blood')?.value,
    contact: document.getElementById('p-contact')?.value.trim(),
    email: document.getElementById('p-email')?.value.trim(),
    address: document.getElementById('p-address')?.value.trim(),
    medical_history: []
  };

  if (!payload.name) {
    toast('Patient name is required', 'error');
    return;
  }

  if (!Number.isFinite(payload.age)) {
    toast('Valid patient age is required', 'error');
    return;
  }

  const condition = document.getElementById('p-condition')?.value.trim();
  if (condition) {
    payload.medical_history.push({
      condition,
      diagnosis_date: document.getElementById('p-diag-date')?.value || null,
      treatment: document.getElementById('p-treatment')?.value.trim(),
      notes: document.getElementById('p-notes')?.value.trim()
    });
  }

  const result = await apiFetch('/patients', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (result?._id) {
    toast('Patient added successfully');
    closeModal('add-patient-modal');
    loadPatients();
    loadDashboard();
  }
}

async function deletePatient(id) {
  if (!confirm('Delete this patient?')) return;

  const result = await apiFetch(`/patients/${id}`, { method: 'DELETE' });
  if (result?.success) {
    toast('Patient deleted');
    loadPatients();
    loadDashboard();
  }
}

async function showHistory(id, name) {
  const patient = allPatients.find((entry) => entry._id === id);
  const title = document.querySelector('#history-modal .modal-header h2');
  const body = document.getElementById('history-modal-body');

  if (title) {
    title.textContent = `${name} - Medical History`;
  }

  if (!body) return;

  if (!patient?.medical_history?.length) {
    body.innerHTML = '<div class="history-empty">No medical history records yet.</div>';
  } else {
    body.innerHTML = patient.medical_history.map((record) => `
      <div class="history-entry">
        <div class="history-entry-header">
          <div class="history-condition">${escapeHtml(record.condition)}</div>
          <div class="history-date">${record.diagnosis_date ? formatDate(record.diagnosis_date) : '-'}</div>
        </div>
        <div class="history-treatment">Treatment: ${escapeHtml(record.treatment || 'No treatment specified')}</div>
        ${record.notes ? `<div class="history-notes">${escapeHtml(record.notes)}</div>` : ''}
      </div>
    `).join('');
  }

  openModal('history-modal');
}

async function loadDoctors() {
  const doctors = await apiFetch('/doctors');
  const grid = document.getElementById('doctors-grid');
  if (!grid) return;

  if (!doctors?.length) {
    grid.innerHTML = '<div class="empty-state">No doctors registered yet.</div>';
    return;
  }

  grid.innerHTML = doctors.map((doctor) => `
    <div class="doctor-card">
      <div class="doctor-actions">
        <button class="btn-icon danger" onclick="deleteDoctor('${doctor._id}')">X</button>
      </div>
      <div class="doctor-avatar">${initials(doctor.name)}</div>
      <div class="doctor-name">${escapeHtml(doctor.name)}</div>
      <div class="doctor-spec">${escapeHtml(doctor.specialization)}</div>
      <div class="doctor-meta">
        <span>Department: <strong>${escapeHtml(doctor.department || '-')}</strong></span>
        <span>Contact: <strong>${escapeHtml(doctor.contact || '-')}</strong></span>
        <span>Experience: <strong>${doctor.experience || 0} yrs</strong></span>
        <span>Fee: <strong>Rs. ${doctor.consultation_fee || 0}</strong></span>
        <span>Days: <strong>${escapeHtml(doctor.available_days || '-')}</strong></span>
      </div>
    </div>
  `).join('');
}

async function addDoctor() {
  const payload = {
    name: document.getElementById('d-name')?.value.trim(),
    specialization: document.getElementById('d-spec')?.value.trim(),
    department: document.getElementById('d-dept')?.value.trim(),
    experience: Number.parseInt(document.getElementById('d-exp')?.value, 10) || 0,
    contact: document.getElementById('d-contact')?.value.trim(),
    email: document.getElementById('d-email')?.value.trim(),
    consultation_fee: Number.parseFloat(document.getElementById('d-fee')?.value) || 0,
    available_days: document.getElementById('d-days')?.value.trim()
  };

  if (!payload.name || !payload.specialization) {
    toast('Doctor name and specialization are required', 'error');
    return;
  }

  const result = await apiFetch('/doctors', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (result?._id) {
    toast('Doctor added successfully');
    closeModal('add-doctor-modal');
    loadDoctors();
    loadDashboard();
  }
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor?')) return;

  const result = await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
  if (result?.success) {
    toast('Doctor deleted');
    loadDoctors();
    loadDashboard();
  }
}

async function loadAppointments() {
  const status = document.getElementById('appt-filter-status')?.value;
  const path = status ? `/appointments?status=${encodeURIComponent(status)}` : '/appointments';
  const appointments = await apiFetch(path);
  const table = document.getElementById('appointments-table');
  if (!table) return;

  if (!appointments?.length) {
    table.innerHTML = '<tr><td colspan="6" class="empty-row">No appointments found</td></tr>';
    return;
  }

  table.innerHTML = appointments.map((appointment) => `
    <tr>
      <td>${escapeHtml(appointment.patient_name || '-')}</td>
      <td>${escapeHtml(appointment.doctor_name || '-')}</td>
      <td>${formatDate(appointment.date)} ${escapeHtml(appointment.time || '')}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(appointment.reason || '')}">
        ${escapeHtml(appointment.reason || '-')}
      </td>
      <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
      <td><button class="btn-icon danger" onclick="deleteAppointment('${appointment._id}')">X</button></td>
    </tr>
  `).join('');
}

async function populateSelects() {
  const [patients, doctors] = await Promise.all([
    apiFetch('/patients'),
    apiFetch('/doctors')
  ]);

  const patientSelect = document.getElementById('a-patient');
  const doctorSelect = document.getElementById('a-doctor');

  if (patientSelect) {
    patientSelect.innerHTML = '<option value="">Select Patient...</option>' +
      (patients || []).map((patient) => `<option value="${patient._id}">${escapeHtml(patient.name)}</option>`).join('');
  }

  if (doctorSelect) {
    doctorSelect.innerHTML = '<option value="">Select Doctor...</option>' +
      (doctors || []).map((doctor) => `<option value="${doctor._id}">${escapeHtml(doctor.name)} - ${escapeHtml(doctor.specialization)}</option>`).join('');
  }
}

async function addAppointment() {
  const patientSelect = document.getElementById('a-patient');
  const doctorSelect = document.getElementById('a-doctor');
  const date = document.getElementById('a-date')?.value;

  const payload = {
    patient_id: patientSelect?.value,
    doctor_id: doctorSelect?.value,
    date,
    time: document.getElementById('a-time')?.value,
    reason: document.getElementById('a-reason')?.value.trim(),
    status: document.getElementById('a-status')?.value
  };

  if (!payload.patient_id || !payload.doctor_id) {
    toast('Select both a patient and a doctor', 'error');
    return;
  }

  if (!date) {
    toast('Appointment date is required', 'error');
    return;
  }

  const result = await apiFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (result?._id) {
    toast('Appointment booked successfully');
    closeModal('add-appointment-modal');
    loadAppointments();
    loadDashboard();
    if (document.getElementById('analytics').classList.contains('active')) {
      loadAnalytics();
    }
  }
}

async function deleteAppointment(id) {
  if (!confirm('Delete this appointment?')) return;

  const result = await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
  if (result?.success) {
    toast('Appointment deleted');
    loadAppointments();
    loadDashboard();
    if (document.getElementById('analytics').classList.contains('active')) {
      loadAnalytics();
    }
  }
}

async function loadAnalytics() {
  const [perDoctor, topDoctor, indexes] = await Promise.all([
    apiFetch('/analytics/patients-per-doctor'),
    apiFetch('/analytics/most-visited-doctor'),
    apiFetch('/analytics/indexes')
  ]);

  const perDoctorElement = document.getElementById('analytics-per-doctor');
  if (perDoctorElement) {
    if (!perDoctor?.length) {
      perDoctorElement.innerHTML = '<div class="history-empty">No data. Book some appointments first.</div>';
    } else {
      const max = perDoctor[0].count || 1;
      perDoctorElement.innerHTML = perDoctor.map((doctor) => `
        <div class="analytics-row">
          <div>
            <div class="analytics-row-name">${escapeHtml(doctor._id)}</div>
            <div class="analytics-row-spec">${escapeHtml(doctor.specialization || '')}</div>
          </div>
          <div class="analytics-row-bar">
            <div class="analytics-row-bar-fill" style="width:${(doctor.count / max) * 100}%"></div>
          </div>
          <div class="analytics-row-count">${doctor.count}</div>
        </div>
      `).join('');
    }
  }

  const topDoctorElement = document.getElementById('analytics-top-doctor');
  if (topDoctorElement) {
    topDoctorElement.innerHTML = topDoctor?.name
      ? `
          <div class="top-doc-avatar">${initials(topDoctor.name)}</div>
          <div class="top-doc-name">${escapeHtml(topDoctor.name)}</div>
          <div class="top-doc-spec">${escapeHtml(topDoctor.specialization || 'Specialist')}</div>
          <div class="top-doc-count"><strong>${topDoctor.count}</strong> patient visits</div>
        `
      : '<div class="history-empty">No data yet.</div>';
  }

  const indexesElement = document.getElementById('analytics-indexes');
  if (indexesElement) {
    indexesElement.innerHTML = indexes?.length
      ? indexes.map((index) => `
          <div class="index-item">
            <div>
              <div class="index-key">${escapeHtml(index.name)}</div>
              <div class="index-info">Collection: <strong>${escapeHtml(index.collection)}</strong></div>
            </div>
            <div>
              <div class="index-info">Type: <span style="color:var(--teal)">${escapeHtml(JSON.stringify(index.key))}</span></div>
              <div class="index-info">${index.unique ? 'Unique' : 'Non-unique'} | ${index.sparse ? 'Sparse' : 'Standard'}</div>
            </div>
          </div>
        `).join('')
      : '<div class="history-empty">Index info unavailable.</div>';
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((word) => word[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

updateDate();
setInterval(updateDate, 60000);
loadDashboard();

window.switchSection = switchSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.filterPatients = filterPatients;
window.addPatient = addPatient;
window.deletePatient = deletePatient;
window.showHistory = showHistory;
window.addDoctor = addDoctor;
window.deleteDoctor = deleteDoctor;
window.loadAppointments = loadAppointments;
window.addAppointment = addAppointment;
window.deleteAppointment = deleteAppointment;
