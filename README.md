LAB ASSIGNMENT 1

##Q1. create database and switch it
test> use collegeDB
switched to db collegeDB

##Q2. Create students collection
collegeDB> db.createCollection("students")
{ ok: 1 }

###Q3. Q3. Insert one document
collegeDB> db.students.insertOne({
... name:"Sandip Maity",
... rollNo:101,
... department:"CSE",
... age:20
... })
{
  acknowledged: true,
  insertedId: ObjectId('6962b0ef5541da38d963b112')
}

##Q4. Insert four more documents

collegeDB> db.students.insertMany([{
... name:"Sujata Maity",
... rollNo:102,
... department:"ECE",
... age:21},{
... name:"Sanskriti Sharma",
... rollNo:103,
... department:"ME",
... age:22}
... ,{
... name:"Saikat Das",
... rollNo:103,
... department:"EE",
... age:23},{
... name:"Arpita Saha",
... rollNo:104,
... department:"CSE",
... age:24},{
... name:"Monmon Ghosh",
... rollNo:105,
... department:"CSE",
... age:24}])
{
  acknowledged: true,
  insertedIds: {
    '0': ObjectId('6962b2815541da38d963b113'),
    '1': ObjectId('6962b2815541da38d963b114'),
    '2': ObjectId('6962b2815541da38d963b115'),
    '3': ObjectId('6962b2815541da38d963b116'),
    '4': ObjectId('6962b2815541da38d963b117')
  }
}

##Q5. Display all documents

collegeDB> db.students.find()
[
  {
    _id: ObjectId('6962b0ef5541da38d963b112'),
    name: 'Sandip Maity',
    rollNo: 101,
    department: 'CSE',
    age: 20
  },
  {
    _id: ObjectId('6962b2815541da38d963b113'),
    name: 'Sujata Maity',
    rollNo: 102,
    department: 'ECE',
    age: 21
  },
  {
    _id: ObjectId('6962b2815541da38d963b114'),
    name: 'Sanskriti Sharma',
    rollNo: 103,
    department: 'ME',
    age: 22
  },
  {
    _id: ObjectId('6962b2815541da38d963b115'),
    name: 'Saikat Das',
    rollNo: 103,
    department: 'EE',
    age: 23
  },
  {
    _id: ObjectId('6962b2815541da38d963b116'),
    name: 'Arpita Saha',
    rollNo: 104,
    department: 'CSE',
    age: 24
  },
  {
    _id: ObjectId('6962b2815541da38d963b117'),
    name: 'Monmon Ghosh',
    rollNo: 105,
    department: 'CSE',
    age: 24
  }
]

##Q6. Display CSE students

collegeDB> db.students.find({department:"CSE"})
[
  {
    _id: ObjectId('6962b0ef5541da38d963b112'),
    name: 'Sandip Maity',
    rollNo: 101,
    department: 'CSE',
    age: 20
  },
  {
    _id: ObjectId('6962b2815541da38d963b116'),
    name: 'Arpita Saha',
    rollNo: 104,
    department: 'CSE',
    age: 24
  },
  {
    _id: ObjectId('6962b2815541da38d963b117'),
    name: 'Monmon Ghosh',
    rollNo: 105,
    department: 'CSE',
    age: 24
  }
]

##Q7. Update age of one student

collegeDB> db.students.updateOne({
... rollNo:101},
... {$set:{age:21}}
... )
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}

##Q8. Delete one document

collegeDB> db.students.deleteOne({rollNo:104})
{ acknowledged: true, deletedCount: 1 }
collegeDB> db.students.find()
[
  {
    _id: ObjectId('6962b0ef5541da38d963b112'),
    name: 'Sandip Maity',
    rollNo: 101,
    department: 'CSE',
    age: 21
  },
  {
    _id: ObjectId('6962b2815541da38d963b113'),
    name: 'Sujata Maity',
    rollNo: 102,
    department: 'ECE',
    age: 21
  },
  {
    _id: ObjectId('6962b2815541da38d963b114'),
    name: 'Sanskriti Sharma',
    rollNo: 103,
    department: 'ME',
    age: 22
  },
  {
    _id: ObjectId('6962b2815541da38d963b115'),
    name: 'Saikat Das',
    rollNo: 103,
    department: 'EE',
    age: 23
  },
  {
    _id: ObjectId('6962b2815541da38d963b117'),
    name: 'Monmon Ghosh',
    rollNo: 105,
    department: 'CSE',
    age: 24
  }
]
collegeDB>
