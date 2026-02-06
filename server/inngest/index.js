import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

//Inngest Function to save user data to a database
const syncUserCration = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_addresses,
      name: first_name + " " + last_name,
      Image: image_url,
    };
    await User.create(userData);
  },
);

//Inngest Function to Delete user data to a database

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  },
);

//Inngest Function to Update user data to a database

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_addresses,
      name: first_name + " " + last_name,
      Image: image_url,
    };

    await User.findByIdAndUpdate(id, userData);
  },
);

//inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made

export const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    // 1. Wait for 10 minutes
    await step.sleep("Wait-for-10-minutes", "10m");

    // 2. Check payment status
    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;

      // FIX 1: Ensure we actually have an ID to look for
      if (!bookingId) {
        console.log("No booking ID found in event data.");
        return;
      }

      const booking = await Booking.findById(bookingId);

      // FIX 2: Check if booking exists before accessing properties
      // If booking is null, it might have been deleted manually already.
      if (!booking) {
        console.log("Booking not found or already deleted.");
        return;
      }

      // If payment is not made, release seats and delete booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);

        // Safety check in case the show was deleted too
        if (show) {
          booking.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat];
          });
          show.markModified("occupiedSeats");
          await show.save();
        }

        await Booking.findByIdAndDelete(booking._id);
        console.log("Booking deleted due to non-payment.");
      }
    });
  },
);

// Inngest function to send email when user booked a show

// const sendBookingConfirmationEmail = inngest.createFunction(
//   { id: "send-booking-confirmation-email" },
//   { event: "app/show.booked" },
//   async ({ event, step }) => {
//     const { bookingId } = event.data;

//     const booking = await Booking.findById(bookingId)
//       .populate({
//         path: "show",
//         populate: { path: "movie", model: "Movie" },
//       })
//       .populate("user");

//     await sendEmail({
//       to: booking.user.email,
//       subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
//       body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
//   <h2>Hi ${booking.user.name},</h2>
//   <p>Your booking for <strong style="color: #F84565;">${booking.show.movie.title}</strong> is confirmed.</p>
//   <p>
//     <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
//     <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
//   </p>
//   <p>Enjoy the show! 🍿</p>
//   <p>Thanks for booking with us!<br/>– QuickShow Team</p>
// </div>`,
//     });
//   },
// );

// Inngest function to send email when user booked a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    // STEP 1: Fetch the booking safely
    const booking = await step.run("fetch-booking-details", async () => {
      const result = await Booking.findById(bookingId)
        .populate({
          path: "show",
          populate: { path: "movie", model: "Movie" },
        })
        .populate("user");
      return result;
    });

    // --- FIX STARTS HERE ---

    // Safety Check 1: Did we find the booking?
    if (!booking) {
      console.error(`Booking not found for ID: ${bookingId}`);
      return; // Stop execution, don't throw error
    }

    // Safety Check 2: Does the booking have a user? (This fixes your crash)
    if (!booking.user) {
      console.error(`Booking ${bookingId} found, but associated User is null.`);
      return; // Stop execution
    }

    // --- FIX ENDS HERE ---

    // STEP 2: Send the email
    await step.run("send-email", async () => {
      await sendEmail({
        to: booking.user.email, // Safe now because we checked booking.user above
        subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${booking.user.name},</h2>
          <p>Your booking for <strong style="color: #F84565;">${booking.show.movie.title}</strong> is confirmed.</p>
          <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
            <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
          </p>
          <p>Enjoy the show! 🍿</p>
          <p>Thanks for booking with us!<br/>– QuickShow Team</p>
        </div>`,
      });
    });
  },
);

export const functions = [
  syncUserCration,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];
