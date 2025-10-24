require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middle Wire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlwti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// 🔹 Map departments to 2-digit codes
const deptCodes = {
    CSE: "01",
    ECE: "02",
    BBA: "03",
};

// const data = {
//     regNo: 2025030001,
//     studentName: "Amit Paul",
//     fatherName: "Rakesh Paul",
//     motherName: "Sima Paul",
//     session: "2025",
//     dept: "BBA",
//     semester: "First",
//     result: [
//         {
//             code: "CSE101",
//             title: "Programming Fundamentals",
//             credit: 3,
//             assignment: 10,
//             classtest: 10,
//             midterm: 20,
//             final: 60,
//             total: 100,
//             letterGrade: "A+",
//             gradePoint: 4,
//         },
//         {
//             code: "CSE102",
//             title: "Discrete Mathematics",
//             credit: 3,
//             assignment: 10,
//             classtest: 10,
//             midterm: 20,
//             final: 60,
//             total: 100,
//             letterGrade: "A+",
//             gradePoint: 4,
//         },
//         {
//             code: "CSE103",
//             title: "Electrical and Electronic Circuit",
//             credit: 3,
//             assignment: 10,
//             classtest: 10,
//             midterm: 20,
//             final: 60,
//             total: 100,
//             letterGrade: "A+",
//             gradePoint: 4,
//         },
//         {
//             code: "CSE104",
//             title: "Physics",
//             credit: 3,
//             assignment: 10,
//             classtest: 10,
//             midterm: 20,
//             final: 60,
//             total: 100,
//             letterGrade: "A+",
//             gradePoint: 4,
//         },
//         {
//             code: "CSE105",
//             title: "English",
//             credit: 3,
//             assignment: 10,
//             classtest: 10,
//             midterm: 20,
//             final: 60,
//             total: 100,
//             letterGrade: "A+",
//             gradePoint: 4,
//         },
//     ],
//     totalNumber: 500,
//     GradePointAverage: 4,
//     letterGradeAverage: "A+",
// };

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const studentCollection = client.db("ISTDB").collection("students");
        const courseCollection = client.db("ISTDB").collection("courses");
        const resultCollection = client.db("ISTDB").collection("results");

        // Create Student API
        app.post("/api/student/register", async (req, res) => {
            try {
                const { studentName, fatherName, motherName, session, dept } =
                    req.body;

                // Validation
                if (
                    !studentName ||
                    !fatherName ||
                    !motherName ||
                    !session ||
                    !dept
                ) {
                    return res
                        .status(400)
                        .json({ message: "All fields are required" });
                }

                const deptCode = deptCodes[dept.toUpperCase()];
                if (!deptCode) {
                    return res
                        .status(400)
                        .json({ message: "Invalid department name" });
                }

                // 🔍 Check if student already exists (same student, father, mother)
                const existingStudent = await studentCollection.findOne({
                    studentName: studentName.trim(),
                    fatherName: fatherName.trim(),
                    motherName: motherName.trim(),
                });

                if (existingStudent) {
                    return res.status(400).json({
                        message: "Student already registered",
                        existingRegNo: existingStudent.regNo,
                    });
                }

                // Generate unique registration number
                const studentCount = await studentCollection.countDocuments({
                    dept,
                });
                const year = session; // admission year
                const studentCode = String(studentCount + 1).padStart(4, "0");
                const regNo = `${year}${deptCode}${studentCode}`; // 10-digit reg no

                // Create student document
                const newStudent = {
                    studentName,
                    fatherName,
                    motherName,
                    session,
                    dept,
                    regNo,
                };

                await studentCollection.insertOne(newStudent);

                res.status(200).json({
                    message: "Student registered successfully",
                    student: newStudent,
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Add Result (POST)
        app.post("/api/student/result", async (req, res) => {
            try {
                const resultData = req.body;

                if (
                    !resultData.regNo ||
                    !resultData.studentName ||
                    !resultData.dept ||
                    !resultData.semester
                ) {
                    return res.status(400).json({
                        message:
                            "regNo, studentName, dept, and semester are required",
                    });
                }

                // Optional: prevent duplicate results for same student + semester
                const existing = await resultCollection.findOne({
                    regNo: resultData.regNo,
                    semester: resultData.semester,
                });

                if (existing) {
                    return res.status(409).json({
                        message:
                            "Result already exists for this student and semester",
                    });
                }

                resultData.createdAt = new Date();

                await resultCollection.insertOne(resultData);

                res.status(200).json({
                    message: "Result added successfully",
                    result: resultData,
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Get Result (GET)
        app.get("/api/student/result", async (req, res) => {
            try {
                const { regNo, semester } = req.query;

                if (!regNo || !semester) {
                    return res
                        .status(400)
                        .json({ message: "regNo and semester are required" });
                }

                const result = await resultCollection.findOne({
                    regNo: regNo,
                    semester,
                });

                if (!result) {
                    return res.status(404).json({
                        message:
                            "No result found for this student and semester",
                    });
                }

                res.status(200).json({
                    result,
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Add or Get Courses API
        app.post("/api/teacher/course", async (req, res) => {
            try {
                const { semester, dept, subjects } = req.body;

                if (
                    !semester ||
                    !dept ||
                    !subjects ||
                    !Array.isArray(subjects)
                ) {
                    return res.status(400).json({
                        message: "semester, dept, and subjects[] are required",
                    });
                }

                const newCourse = {
                    semester,
                    dept,
                    subjects,
                    createdAt: new Date(),
                };

                await courseCollection.insertOne(newCourse);

                res.status(200).json({
                    message: "Course added successfully",
                    course: newCourse,
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Get Subjects by Dept and Semester
        app.get("/api/teacher/course", async (req, res) => {
            try {
                const { dept, semester } = req.query;

                if (!dept || !semester) {
                    return res.status(400).json({
                        message: "department and semester are required",
                    });
                }

                const course = await courseCollection.findOne({
                    dept,
                    semester,
                });

                if (!course) {
                    return res.status(404).json({
                        message:
                            "No course found for this department and semester",
                    });
                }

                res.status(200).json({
                    subjects: course.subjects,
                });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("RPS server is running");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
