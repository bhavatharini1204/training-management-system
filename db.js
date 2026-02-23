const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "bhava@2005",
    database: "tms"
});

connection.connect((err) => {
    if (err) {
        console.log("Database connection failed ❌", err);
    } else {
        console.log("Connected to MySQL Database ✅");
    }
});

module.exports = connection;