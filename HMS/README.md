# UDB-PROJECT-HMS
Hospital Management System

# Project Title

A full-stack web application built using a lightweight three-tier architecture with a clean separation between frontend, backend, and database layers.

##  Overview

This project demonstrates a modular web application where the frontend communicates with the backend using REST APIs, and the backend manages business logic and database operations. The architecture ensures scalability, maintainability, and efficient data handling.

##  System Architecture

The application follows a three-layer architecture:

### Frontend Layer

* Built with HTML5, CSS3, and Vanilla JavaScript
* No heavy frameworks for lightweight performance
* Fetch API for asynchronous REST communication

### Backend & Data Layer

* Node.js with Express.js for API routing
* MongoDB for persistent data storage
* Mongoose ODM for schema validation and modeling
* RESTful API structure
* Connection pooling for database efficiency

## Features

* User authentication (Sign up / Sign in)
* Secure password handling
* REST API based communication
* Responsive frontend UI
* Scalable database schema

##  Design Principles

* Decoupled frontend and backend
* RESTful service architecture
* Schema-based data validation
* Embedded data for frequently accessed records
* Referenced data for independent modules

## Project Structure

```
project/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── controllers/
│
├── config/
│   └── db.js
│
└── README.md
```
### 1. Clone Repository

```
git clone https://github.com/your-username/project-name.git
cd project-name
```

### 2. Install Dependencies

```
npm install
```

### 3. Run Server

```
npm start
```

### 4. Open in Browser

```
http://localhost:3000
```

## Tech Stack

Frontend: HTML5, CSS3, JavaScript
Backend: Node.js, Express.js
Database: MongoDB
ODM: Mongoose

## Authors

Arindam Jana 
UG/02/BTCSECSF/2023/002;<br>
Sanskriti Sharma 
UG/SOET/165/23/081;<br>
Sazidur Rahaman
UG/SOET/165/24/001;<br> 
Sandip Maity
UG/SOET/165/23/082<br>

