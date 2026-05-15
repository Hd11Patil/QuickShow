import express from "express";
import {
  getFavorites,
  getUserBookings,
  updateFavorite,
  cancelBooking
} from "../controllers/UserController.js";

const userRouter = express.Router();

userRouter.get("/bookings", getUserBookings);
userRouter.post("/update-favorite", updateFavorite);
userRouter.get("/favorites", getFavorites);
userRouter.delete("/cancel-booking/:id", cancelBooking);


export default userRouter;
