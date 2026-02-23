const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
    res.redirect("/login.html");
});
app.use(express.static("public"));


// Test Route
app.get("/", (req, res) => {
    res.send("Training Management System Backend Running 🚀");
});
// Register User
app.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).send("All fields are required");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

        db.query(sql, [name, email, hashedPassword, role], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send("User already exists or error occurred");
            }

            res.send("User Registered Successfully ✅");
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Error registering user");
    }
});
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Email and password required");
    }

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }

        if (result.length === 0) {
            return res.status(401).send("Invalid credentials ❌");
        }

        const user = result[0];

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).send("Invalid credentials ❌");
        }

        res.json({
            message: "Login successful ✅",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});
// Create Course (Admin)
app.post("/add-course", (req, res) => {
    const { course_name, description, trainer_id } = req.body;

    if (!course_name || !description) {
        return res.status(400).send("All fields required");
    }

    const sql = "INSERT INTO courses (course_name, description, trainer_id) VALUES (?, ?, ?)";

    db.query(sql, [course_name, description, trainer_id || null], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error adding course");
        }

        res.send("Course added successfully ✅");
    });
});
// Get All Courses
app.get("/courses", (req, res) => {
    const sql = "SELECT * FROM courses";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching courses");
        }

        res.json(result);
    });
});
// Enroll in Course
app.post("/enroll", (req, res) => {
    const { user_id, course_id } = req.body;

    if (!user_id || !course_id) {
        return res.status(400).send("User ID and Course ID required");
    }

    const sql = "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)";

    db.query(sql, [user_id, course_id], (err, result) => {
        if (err) {
    if (err.code === "ER_DUP_ENTRY") {
        return res.send("You are already enrolled in this course ⚠️");
    }

    console.log(err);
    return res.status(500).send("Error enrolling");
}

        res.send("Enrolled successfully ✅");
    });
});
// Get Enrolled Courses for a User
app.get("/my-courses/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT courses.id, courses.course_name, courses.description
        FROM enrollments
        JOIN courses ON enrollments.course_id = courses.id
        WHERE enrollments.user_id = ?
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching enrolled courses");
        }

        res.json(result);
    });
});
// Get All Enrollments (Admin)
app.get("/admin/enrollments", (req, res) => {

    const sql = `
        SELECT 
            users.name AS student_name,
            users.email,
            courses.course_name
        FROM enrollments
        JOIN users ON enrollments.user_id = users.id
        JOIN courses ON enrollments.course_id = courses.id
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching enrollments");
        }

        res.json(result);
    });
});
// Dashboard Statistics
app.get("/admin/stats", (req, res) => {

    const stats = {};

    db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, userResult) => {
        if (err) return res.status(500).send("Error");

        stats.totalUsers = userResult[0].totalUsers;

        db.query("SELECT COUNT(*) AS totalCourses FROM courses", (err, courseResult) => {
            if (err) return res.status(500).send("Error");

            stats.totalCourses = courseResult[0].totalCourses;

            db.query("SELECT COUNT(*) AS totalEnrollments FROM enrollments", (err, enrollResult) => {
                if (err) return res.status(500).send("Error");

                stats.totalEnrollments = enrollResult[0].totalEnrollments;

                res.json(stats);
            });
        });
    });
});
// Get All Trainers
app.get("/trainers", (req, res) => {

    const sql = "SELECT id, name FROM users WHERE role = 'trainer'";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching trainers");
        }

        res.json(result);
    });
});
// Get Courses Assigned to Trainer
app.get("/trainer-courses/:trainerId", (req, res) => {

    const trainerId = req.params.trainerId;

    const sql = `
        SELECT id, course_name, description
        FROM courses
        WHERE trainer_id = ?
    `;

    db.query(sql, [trainerId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching trainer courses");
        }

        res.json(result);
    });
});
// Get Students Enrolled in Trainer's Courses
app.get("/trainer-students/:trainerId", (req, res) => {

    const trainerId = req.params.trainerId;

    const sql = `
        SELECT 
            courses.course_name,
            users.name AS student_name,
            users.email
        FROM courses
        JOIN enrollments ON courses.id = enrollments.course_id
        JOIN users ON enrollments.user_id = users.id
        WHERE courses.trainer_id = ?
    `;

    db.query(sql, [trainerId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching trainer students");
        }

        res.json(result);
    });
});
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});