const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const app = express();
const PORT = 3005;

// Enable CORS for all domains
app.use(cors());

// Middleware
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'charansct12345@hai',
    database: 'MovieBookingDB'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// GET Endpoint: Fetch all bookings
app.get('/bookings', (req, res) => {
    const query = 'SELECT * FROM bookings';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});

// POST Endpoint: Create a new booking
app.post('/bookings', (req, res) => {
    const { userid, date, slotid, movieId, seatid, theatreId } = req.body;

    // Validation
    if (!userid || !date || !slotid || !movieId || !seatid || !theatreId) {
        res.status(400).send('All fields are required');
        return;
    }
    console.log(theatreId)

    const query = 'INSERT INTO bookings (userid, date, slotid, movieId, seatid, theatreId) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [userid, date, slotid, movieId, seatid, theatreId];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error creating booking:', err);
            res.status(500).send('Server error');
            return;
        }
        res.status(201).json({ id: results.insertId, userid, date, slotid, movieId, seatid, theatreId });
    });
});


// GET Endpoint: Fetch bookings for a specific user
app.get('/bookings/user/:userId', (req, res) => {
    const { userId } = req.params;

    const query = 'SELECT * FROM bookings WHERE userid = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).send('Server error');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('No bookings found for the given user');
            return;
        }

        res.json(results);
    });
});

// GET Endpoint: Fetch bookings based on movieId, date, slotId, seatId, and theatreId
app.get('/bookings/filter', (req, res) => {
    const { movieid, date, slotid, seatid, theatreid } = req.query;

    // Construct the SQL query dynamically based on available parameters
    let query = 'SELECT * FROM bookings WHERE 1=1';
    let values = [];

    if (movieid) {
        query += ' AND movieId = ?';
        values.push(movieid);
    }
    if (date) {
        query += ' AND date = ?';
        values.push(date);
    }
    if (slotid) {
        query += ' AND slotid = ?';
        values.push(slotid);
    }
    if (seatid) {
        query += ' AND seatid = ?';
        values.push(seatid);
    }
    if (theatreid) {
        query += ' AND theatreId = ?';  // Add theatreId to the query
        values.push(theatreid);
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});


// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
