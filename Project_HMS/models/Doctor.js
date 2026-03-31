const mongoose = require('mongoose');

const DoctorSchema=new mongoose.Schema({
    name: String,
    specialization: String,
    doctor_id:{type:String,unique:true},
});

module.exports=mongoose.model('Doctor',DoctorSchema);