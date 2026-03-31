const mongoose = require('mongoose');

const historySchema=new mongoose.Schema({
    diagnosis:String,
    medicines:String,
    visitDate:Date,
});

const PatientSchema=new mongoose.Schema({
    name: String,
    age: Number,
    gender:String,
    patient_id:{type:String,unique:true},
    medicalHistory:[historySchema],
});

module.exports=mongoose.model('Patient',PatientSchema);