const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const ENV_PATH = path.join(__dirname, '.env');
loadEnvFile(ENV_PATH);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = (process.env.MONGO_URI || '').trim();
const MONGO_DB_NAME = (process.env.MONGO_DB_NAME || 'medcore_hms').trim();
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
let databaseConnectionPromise = null;

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envFile = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function ensureMongoUri() {
  if (!MONGO_URI) {
    throw new Error(`Missing MONGO_URI. Add it to ${ENV_PATH} or your deployment environment.`);
  }

  if (!/^mongodb(\+srv)?:\/\//.test(MONGO_URI)) {
    throw new Error('Invalid MONGO_URI. It must start with mongodb:// or mongodb+srv://');
  }
}

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:/?#]+):([^@]+)@/, '//$1:****@');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isDatabaseReady() ? 'connected' : 'disconnected'
  });
});

app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || isDatabaseReady()) {
    return next();
  }

  try {
    await connectDatabase();
    return next();
  } catch (error) {
    return res.status(503).json({
      error: 'Database not connected. Set MONGO_URI in Vercel and make sure the cluster is reachable.'
    });
  }
});

const MedicalHistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  diagnosis_date: { type: Date },
  treatment: { type: String },
  notes: { type: String },
  recorded_at: { type: Date, default: Date.now }
});

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  blood_type: { type: String },
  contact: { type: String },
  email: { type: String },
  address: { type: String },
  medical_history: [MedicalHistorySchema],
  created_at: { type: Date, default: Date.now }
});

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  department: { type: String },
  experience: { type: Number, default: 0 },
  contact: { type: String },
  email: { type: String },
  consultation_fee: { type: Number, default: 0 },
  available_days: { type: String },
  created_at: { type: Date, default: Date.now }
});

const AppointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patient_name: { type: String },
  doctor_name: { type: String },
  date: { type: Date, required: true },
  time: { type: String },
  reason: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  created_at: { type: Date, default: Date.now }
});

AppointmentSchema.index({ doctor_id: 1 });
AppointmentSchema.index({ patient_id: 1, date: -1 });
PatientSchema.index({ name: 'text' });

const Patient = mongoose.model('Patient', PatientSchema);
const Doctor = mongoose.model('Doctor', DoctorSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);

app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ created_at: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    return res.json(patient);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await Appointment.deleteMany({ patient_id: req.params.id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients/:id/history', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { medical_history: req.body } },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json(patient);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ created_at: -1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    return res.json(doctor);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/doctors', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    return res.json(doctor);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    await Appointment.deleteMany({ doctor_id: req.params.id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.doctor_id) {
      filter.doctor_id = req.query.doctor_id;
    }

    const appointments = await Appointment.find(filter).sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    return res.json(appointment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const patient = await Patient.findById(req.body.patient_id);
    const doctor = await Doctor.findById(req.body.doctor_id);

    if (!patient) {
      return res.status(400).json({ error: 'Invalid patient selected' });
    }
    if (!doctor) {
      return res.status(400).json({ error: 'Invalid doctor selected' });
    }

    const appointment = new Appointment({
      ...req.body,
      patient_name: patient.name,
      doctor_name: doctor.name
    });

    await appointment.save();
    return res.status(201).json(appointment);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    return res.json(appointment);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/patients-per-doctor', async (req, res) => {
  try {
    const result = await Appointment.aggregate([
      {
        $group: {
          _id: '$doctor_name',
          count: { $sum: 1 },
          doctor_id: { $first: '$doctor_id' }
        }
      },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctor_id',
          foreignField: '_id',
          as: 'doctor_info'
        }
      },
      {
        $addFields: {
          specialization: { $arrayElemAt: ['$doctor_info.specialization', 0] }
        }
      },
      { $project: { doctor_info: 0 } }
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/most-visited-doctor', async (req, res) => {
  try {
    const result = await Appointment.aggregate([
      {
        $group: {
          _id: '$doctor_id',
          name: { $first: '$doctor_name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor_info'
        }
      },
      {
        $addFields: {
          specialization: { $arrayElemAt: ['$doctor_info.specialization', 0] },
          department: { $arrayElemAt: ['$doctor_info.department', 0] }
        }
      },
      { $project: { doctor_info: 0 } }
    ]);

    res.json(result[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/indexes', async (req, res) => {
  try {
    const appointmentIndexes = await Appointment.collection.indexes();
    const patientIndexes = await Patient.collection.indexes();

    const formatIndexes = (indexes, collection) =>
      indexes.map((index) => ({
        name: index.name,
        collection,
        key: index.key,
        unique: index.unique || false,
        sparse: index.sparse || false
      }));

    res.json([
      ...formatIndexes(appointmentIndexes, 'appointments'),
      ...formatIndexes(patientIndexes, 'patients')
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function seedData() {
  const doctorCount = await Doctor.countDocuments();
  if (doctorCount > 0) {
    return;
  }

  console.log('Seeding initial data...');

  const doctors = await Doctor.insertMany([
    { name: 'Dr. Ananya Sharma', specialization: 'Cardiology', department: 'Heart Care', experience: 14, contact: '9800001111', consultation_fee: 800, available_days: 'Mon, Wed, Fri' },
    { name: 'Dr. Rajan Mehta', specialization: 'Neurology', department: 'Brain & Spine', experience: 10, contact: '9800002222', consultation_fee: 1000, available_days: 'Tue, Thu, Sat' },
    { name: 'Dr. Priya Nair', specialization: 'Pediatrics', department: 'Child Health', experience: 8, contact: '9800003333', consultation_fee: 600, available_days: 'Mon, Tue, Wed' },
    { name: 'Dr. Sameer Kulkarni', specialization: 'Orthopedics', department: 'Bone & Joint', experience: 12, contact: '9800004444', consultation_fee: 700, available_days: 'Wed, Fri, Sat' },
    { name: 'Dr. Kavitha Reddy', specialization: 'Dermatology', department: 'Skin Care', experience: 6, contact: '9800005555', consultation_fee: 500, available_days: 'Mon, Thu, Sat' }
  ]);

  const patients = await Patient.insertMany([
    {
      name: 'Arjun Das',
      age: 45,
      gender: 'Male',
      blood_type: 'B+',
      contact: '9700001111',
      medical_history: [
        { condition: 'Hypertension', diagnosis_date: new Date('2022-03-15'), treatment: 'Amlodipine 5mg', notes: 'BP monitored monthly' },
        { condition: 'Type 2 Diabetes', diagnosis_date: new Date('2023-01-10'), treatment: 'Metformin 500mg', notes: 'Diet control advised' }
      ]
    },
    {
      name: 'Meena Krishnan',
      age: 32,
      gender: 'Female',
      blood_type: 'O+',
      contact: '9700002222',
      medical_history: [
        { condition: 'Migraine', diagnosis_date: new Date('2023-06-20'), treatment: 'Sumatriptan', notes: 'Triggered by stress' }
      ]
    },
    {
      name: 'Ravi Patel',
      age: 58,
      gender: 'Male',
      blood_type: 'A-',
      contact: '9700003333',
      medical_history: [
        { condition: 'Coronary Artery Disease', diagnosis_date: new Date('2021-11-05'), treatment: 'Aspirin + Statins', notes: 'Follow-up every 3 months' }
      ]
    },
    {
      name: 'Sunita Bose',
      age: 27,
      gender: 'Female',
      blood_type: 'AB+',
      contact: '9700004444',
      medical_history: []
    },
    {
      name: 'Hari Om Gupta',
      age: 63,
      gender: 'Male',
      blood_type: 'B-',
      contact: '9700005555',
      medical_history: [
        { condition: 'Osteoarthritis', diagnosis_date: new Date('2020-08-22'), treatment: 'Physiotherapy + NSAIDs', notes: 'Knee joint affected' }
      ]
    }
  ]);

  const today = new Date();
  const shiftDays = (offset) => new Date(today.getTime() + offset * 86400000);

  await Appointment.insertMany([
    { patient_id: patients[0]._id, doctor_id: doctors[0]._id, patient_name: 'Arjun Das', doctor_name: 'Dr. Ananya Sharma', date: shiftDays(-10), time: '10:00', reason: 'Chest pain follow-up', status: 'completed' },
    { patient_id: patients[1]._id, doctor_id: doctors[1]._id, patient_name: 'Meena Krishnan', doctor_name: 'Dr. Rajan Mehta', date: shiftDays(-5), time: '11:30', reason: 'Severe headache', status: 'completed' },
    { patient_id: patients[2]._id, doctor_id: doctors[0]._id, patient_name: 'Ravi Patel', doctor_name: 'Dr. Ananya Sharma', date: shiftDays(-3), time: '09:00', reason: 'ECG and lipid profile', status: 'completed' },
    { patient_id: patients[3]._id, doctor_id: doctors[4]._id, patient_name: 'Sunita Bose', doctor_name: 'Dr. Kavitha Reddy', date: shiftDays(1), time: '14:00', reason: 'Skin rash consultation', status: 'scheduled' },
    { patient_id: patients[4]._id, doctor_id: doctors[3]._id, patient_name: 'Hari Om Gupta', doctor_name: 'Dr. Sameer Kulkarni', date: shiftDays(2), time: '10:30', reason: 'Knee pain assessment', status: 'scheduled' },
    { patient_id: patients[0]._id, doctor_id: doctors[0]._id, patient_name: 'Arjun Das', doctor_name: 'Dr. Ananya Sharma', date: shiftDays(3), time: '11:00', reason: 'Monthly BP checkup', status: 'scheduled' },
    { patient_id: patients[1]._id, doctor_id: doctors[2]._id, patient_name: 'Meena Krishnan', doctor_name: 'Dr. Priya Nair', date: shiftDays(-8), time: '15:00', reason: 'Child health consultation', status: 'completed' },
    { patient_id: patients[2]._id, doctor_id: doctors[0]._id, patient_name: 'Ravi Patel', doctor_name: 'Dr. Ananya Sharma', date: shiftDays(-15), time: '09:30', reason: 'Post-surgery checkup', status: 'completed' }
  ]);

  console.log('Seed data inserted');
}

async function connectDatabase() {
  ensureMongoUri();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (databaseConnectionPromise) {
    return databaseConnectionPromise;
  }

  try {
    databaseConnectionPromise = mongoose.connect(MONGO_URI, {
      dbName: MONGO_DB_NAME,
      serverSelectionTimeoutMS: 5000
    });
    await databaseConnectionPromise;
    console.log(`MongoDB connected: ${maskMongoUri(MONGO_URI)}`);
    await seedData();
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 1) {
      databaseConnectionPromise = null;
    }
  }
}

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`MedCore HMS backend running at http://localhost:${PORT}`);
    try {
      await connectDatabase();
    } catch (error) {
      console.error('Startup database connection failed:', error.message);
    }
  });
}

module.exports = app;
