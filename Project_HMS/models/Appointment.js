const mongoose=require('mongoose');

const AppointmentSchema=new mongoose.Schema({
    patient_id:{type:mongoose.Schema.Types.ObjectId,ref:'Patient',required:true},
    doctor_id:{type:mongoose.Schema.Types.ObjectId,ref:'Doctor',required:true},
    appointmentDate:Date,
    reason:String,
});

module.exports=mongoose.model('Appointment',AppointmentSchema);