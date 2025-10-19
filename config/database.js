import mongoose from "mongoose";

const connectDB = async () => {
    await mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
            console.log("Successfully connected database");
        })
        .catch((err) => {
            console.log("error");
            console.log(err);
        });
};

export default connectDB;
