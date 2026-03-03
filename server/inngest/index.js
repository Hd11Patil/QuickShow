// import { Inngest } from "inngest";
// import User from "../models/User.js";
// import Booking from "../models/Booking.js";
// import Show from "../models/Show.js";
// import sendEmail from "../configs/nodeMailer.js";

// // Create a client to send and receive events
// export const inngest = new Inngest({ id: "movie-ticket-booking" });

// //Inngest Function to save user data to a database
// const syncUserCration = inngest.createFunction(
//   { id: "sync-user-from-clerk" },
//   { event: "clerk/user.created" },
//   async ({ event }) => {
//     const { id, first_name, last_name, email_addresses, image_url } =
//       event.data;

//     const userData = {
//       _id: id,
//       email: email_addresses[0].email_address,
//       name: first_name + " " + last_name,
//       Image: image_url,
//     };
//     await User.create(userData);
//   },
// );

// //Inngest Function to Delete user data to a database

// const syncUserDeletion = inngest.createFunction(
//   { id: "delete-user-with-clerk" },
//   { event: "clerk/user.deleted" },
//   async ({ event }) => {
//     const { id } = event.data;
//     await User.findByIdAndDelete(id);
//   },
// );

// //Inngest Function to Update user data to a database

// const syncUserUpdation = inngest.createFunction(
//   { id: "update-user-from-clerk" },
//   { event: "clerk/user.updated" },
//   async ({ event }) => {
//     const { id, first_name, last_name, email_addresses, image_url } =
//       event.data;

//     const userData = {
//       _id: id,
//       email: email_addresses[0].email_address,
//       name: first_name + " " + last_name,
//       Image: image_url,
//     };

//     await User.findByIdAndUpdate(id, userData);
//   },
// );

// //inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made

// export const releaseSeatsAndDeleteBooking = inngest.createFunction(
//   { id: "release-seats-delete-booking" },
//   { event: "app/checkpayment" },
//   async ({ event, step }) => {
//     // 1. Wait for 10 minutes
//     await step.sleep("Wait-for-10-minutes", "10m");

//     // 2. Check payment status
//     await step.run("check-payment-status", async () => {
//       const bookingId = event.data.bookingId;

//       // FIX 1: Ensure we actually have an ID to look for
//       if (!bookingId) {
//         console.log("No booking ID found in event data.");
//         return;
//       }

//       const bookingData = await Booking.findById(bookingId);

//       // FIX 2: Check if booking exists before accessing properties
//       // If booking is null, it might have been deleted manually already.
//       if (!bookingData) {
//         console.log("Booking not found or already deleted.");
//         return;
//       }

//       // If payment is not made, release seats and delete booking
//       if (!bookingData.isPaid) {
//         const show = await Show.findById(bookingData.show);

//         // Safety check in case the show was deleted too
//         if (show) {
//           bookingData.bookedSeats.forEach((seat) => {
//             delete show.occupiedSeats[seat];
//           });
//           show.markModified("occupiedSeats");
//           await show.save();
//         }

//         await Booking.findByIdAndDelete(bookingData._id);
//         console.log("Booking deleted due to non-payment.");
//       }
//     });
//   },
// );

// // Inngest function to send email when user booked a show

// const sendBookingConfirmationEmail = inngest.createFunction(
//   { id: "send-booking-confirmation-email" },
//   { event: "app/show.booked" },
//   async ({ event, step }) => {
//     const { bookingId } = event.data;

//     const bookingData = await Booking.findById(bookingId)
//       .populate({
//         path: "show",
//         populate: { path: "movie", model: "Movie" },
//       })
//       .populate("user");

//     await sendEmail({
//       to: bookingData.user.email,
//       subject: `Payment Confirmation: "${bookingData.show.movie.title}" booked!`,
//       body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
//   <h2>Hi ${bookingData.user.name},</h2>
//   <p>Your booking for <strong style="color: #F84565;">${bookingData.show.movie.title}</strong> is confirmed.</p>
//   <p>
//     <strong>Date:</strong> ${new Date(bookingData.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
//     <strong>Time:</strong> ${new Date(bookingData.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
//   </p>
//   <p>Enjoy the show! 🍿</p>
//   <p>Thanks for booking with us!<br/>– QuickShow Team</p>
// </div>`,
//     });
//   },
// );

// export const functions = [
//   syncUserCration,
//   syncUserDeletion,
//   syncUserUpdation,
//   releaseSeatsAndDeleteBooking,
//   sendBookingConfirmationEmail,
// ];

import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

// ─── Sync User Creation ───────────────────────────────────────────────────────
const syncUserCration = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    await User.create({
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      Image: image_url,
    });
  },
);

// ─── Sync User Deletion ───────────────────────────────────────────────────────
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  },
);

// ─── Sync User Update ─────────────────────────────────────────────────────────
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    await User.findByIdAndUpdate(id, {
      email: email_addresses[0].email_address, // ✅ FIXED typo: was .email_addresses
      name: first_name + " " + last_name,
      Image: image_url,
    });
  },
);

// ─── Release Seats if Unpaid ──────────────────────────────────────────────────
export const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    await step.sleep("Wait-for-10-minutes", "10m");

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      if (!bookingId) {
        console.log("No booking ID found in event data.");
        return;
      }

      const bookingData = await Booking.findById(bookingId);
      if (!bookingData) {
        console.log("Booking not found or already deleted.");
        return;
      }

      if (!bookingData.isPaid) {
        const show = await Show.findById(bookingData.show);
        if (show) {
          bookingData.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat];
          });
          show.markModified("occupiedSeats");
          await show.save();
        }
        await Booking.findByIdAndDelete(bookingData._id);
        console.log("Booking deleted due to non-payment.");
      }
    });
  },
);

// ─── Send Booking Confirmation Email ──────────────────────────────────────────
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    // Step 1: Fetch booking + show + movie (no user populate — won't work with String IDs)
    const bookingData = await step.run("fetch-booking-data", async () => {
      return await Booking.findById(bookingId).populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      });
    });

    if (!bookingData) {
      throw new Error(`Email failed: Booking not found for ID ${bookingId}`);
    }

    // Step 2: Manually fetch user by Clerk string ID ✅ THIS IS THE CORE FIX
    const user = await step.run("fetch-user-data", async () => {
      return await User.findById(bookingData.user);
    });

    if (!user) {
      throw new Error(`Email failed: No user found for ID "${bookingData.user}". 
        Check if clerk/user.created event fired and saved the user correctly.`);
    }

    if (!user.email) {
      throw new Error(`Email failed: User ${user._id} exists but has no email. 
        Likely caused by the email_addresses typo in syncUserUpdation.`);
    }

    // Step 3: Send the email
    await step.run("send-email", async () => {
      await sendEmail({
        to: user.email,
        subject: `Payment Confirmed: "${bookingData.show.movie.title}" booked!`,
        body: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Hi ${user.name},</h2>
            <p>Your booking for <strong style="color: #F84565;">${bookingData.show.movie.title}</strong> is confirmed.</p>
            <p>
              <strong>Date:</strong> ${new Date(bookingData.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
              <strong>Time:</strong> ${new Date(bookingData.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
            </p>
            <p>Enjoy the show! 🍿</p>
            <p>Thanks for booking with us!<br/>– QuickShow Team</p>
          </div>
        `,
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
