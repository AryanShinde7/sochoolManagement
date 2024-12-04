import express from "express"
import mysql from "mysql2"
import dotenv  from "dotenv"
dotenv.config();

const port = process.env.PORT
const app = express()

app.use(express.json())


const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 999,
    queueLimit: 0,
    connectTimeout: 0, 
    acquireTimeout: 0,  
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1); // Exit if there's an error connecting to the database
    }
    if (connection) connection.release(); // Release the connection back to the pool
    console.log('MySQL Pool Connected...');
});


app.post('/api/addSchool' , (req , res)=>{
    const {name , address , longitude , latitude} = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const add_query = "INSERT INTO schools (name , address , latitude , longitude) Values (?,?,?,?)"

    db.query(add_query , [name , address , latitude , longitude] , (err , result) =>{
        if (err) {
            console.error(err);
            return res.status(500).json({ message: err });
        }
        res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
    })
    
})

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = value => (value * Math.PI) / 180;

    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};


app.get('/api/getSchool', (req, res) => {
    const { latitude, longitude } = req.query;

    // Check if latitude and longitude are provided
    if (!latitude || !longitude) {
        return res.status(400).json({ message: "Incomplete fields" }); // Return to stop further execution
    }

    const get_query = 'SELECT * FROM schools';

    db.query(get_query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: err });
        }

        // Calculate distance for each school
        const schools = result.map((school) => ({
            ...school,
            distance: calculateDistance(latitude, longitude, school.latitude, school.longitude),
        }));

        // Sort schools by distance
        schools.sort((a, b) => a.distance - b.distance);

        // Send the sorted list of schools
        res.json(schools);
    });
});

app.listen(port , ()=>{
    console.log(`server has started at ${port} `)
})