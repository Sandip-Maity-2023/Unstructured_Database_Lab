const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const patient = require("./models/Patient");
const doctor = require("./models/Doctor");
const appointment = require("./models/Appointment");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/hospitalDB", (err) => {
  if (err) {
    console.error("Error connecting to MongoDB:", err);
  } else {
    console.log("Connected to MongoDB");
  }
});

//view all patients
app.get("/patients", async (req, res) => {
  try {
    const patients = await patient.find();
    res.status(200).send(patients);
  } catch (err) {
    res.status(500).send(err);
  }
});

//view all doctors
app.get("/doctors", async (req, res) => {
  try {
    const doctors = await doctor.find();
    res.status(200).send(doctors);
  } catch (err) {
    res.status(500).send(err);
  }
});

//view all appointments
app.get("/appointments", async (req, res) => {
  try {
    const appointments = await appointment.find().populate("patient_id").populate("doctor_id");
    res.status(200).send(appointments);
  } catch (err) {
    res.status(500).send(err);
  }
});

//create doctor
app.post("/doctors", async (req, res) => {
  try {
    const doctor = new doctor(req.body);
    await doctor.save();
    res.status(201).send(doctor);
  } catch (err) {
    res.status(400).send(err);
  }
});


//create patient
app.post("/patients", async (req, res) => {
  try {
    const patient = new patient(req.body);
    await patient.save();
    res.status(201).send(patient);
  } catch (err) {
    res.status(400).send(err);
  }
});


//create appointment
app.post("/appointments", async (req, res) => {
  try {
    const appointment = new appointment(req.body);
    await appointment.save();
    res.status(201).send(appointment);
  } catch (err) {
    res.status(400).send(err);
  }
});


//get all doctors
app.get("/doctors", async (req, res) => {
  try {
    const doctors = await doctor.find();
    res.status(200).send(doctors);
  } catch (err) {
    res.status(500).send(err);
  }
});

//get all patients
app.get("/patients", async (req, res) => {
  try {
    const patients = await patient.find();
    res.status(200).send(patients);
  } catch (err) {
    res.status(500).send(err);
  }
});


//aggregation: patients per doctor
app.get("/analytics/patients-per-doctor", async (req, res) => {
  try {
    const data = await appointment.aggregate([
      {
        $group: {
          _id: "$doctor_id",
          patientCount: { $sum: 1 },
        },
      },
    ]);
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});


//most visited doctors
app.get("/analytics/most-visited", async (req, res) => {
  const data = await appointment.aggregate([
    {
      $group: {
        _id: "$doctor_id",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 1,
    },
  ]);
  res.status(200).send(data);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
