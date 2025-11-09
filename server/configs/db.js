import e from "express";
import mongoose from "mongoose";


const connectDB = async () => { 

  try {
    mongoose.connection.on('connected', () => console.log('Database connected successfully'));
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`,)
  } catch (error) { 
    console.log('Database connection failed', error.message);
  }
}
export default connectDB;