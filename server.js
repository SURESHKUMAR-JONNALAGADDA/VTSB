const express = require('express');
const mysql = require('mysql2/promise'); // Use promise-based MySQL
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Create MySQL Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure the database table exists
async function initDB() {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      vehicleId VARCHAR(255) PRIMARY KEY,
      latitude DOUBLE NOT NULL,
      longitude DOUBLE NOT NULL,
      speed DOUBLE DEFAULT 0,
      lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  connection.release();
}

initDB().then(() => console.log("Database initialized")).catch(console.error);

// API to update vehicle location
app.post('/update-location', async (req, res) => {
  const { vehicleId, latitude, longitude, speed } = req.body;

  try {
    const connection = await pool.getConnection();

    // Insert or update the vehicle record
    const [rows] = await connection.execute(
      `INSERT INTO vehicles (vehicleId, latitude, longitude, speed) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), speed = VALUES(speed), lastUpdated = CURRENT_TIMESTAMP`,
      [vehicleId, latitude, longitude, speed]
    );

    connection.release();
    res.status(200).json({ message: 'Vehicle location updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating vehicle location', error: err });
  }
});

// API to get vehicle location
app.get('/vehicle-location/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM vehicles WHERE vehicleId = ?',
      [vehicleId]
    );
    connection.release();

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching vehicle data', error: err });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the Vehicle Tracking API (MySQL)');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
