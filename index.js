import dotenv from "dotenv";
import express from "express";
const app = express();
dotenv.config({});
const port = process.env.PORT || 5000;
import connectDB from "./config/database.js";
// import cookieParser from "cookie-parser";
import cors from "cors";

// middleware
// app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(cookieParser());
// const corsOption = {
//     origin: "http://localhost:5173",
//     credentials : true
// }
// app.use(cors(corsOption));
app.use(cors());

app.get("/", (req, res) => {
    res.send("Wellcome to RPS Server!");
});

app.listen(port, () => {
    connectDB();
    console.log(`Example app listening on port ${port}`);
});

