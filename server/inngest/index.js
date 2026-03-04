// import { Inngest } from "inngest";
// import { clerkClient, User } from "@clerk/express";
// import Booking from "../models/Booking.js";
// import Show from "../models/Show.js";
// import sendEmail from "../configs/nodeMailer.js";

// export const inngest = new Inngest({ id: "movie-ticket-booking" });

// // ─── Release Seats if Unpaid after 10 minutes ─────────────────────────────────
// export const releaseSeatsAndDeleteBooking = inngest.createFunction(
//   { id: "release-seats-delete-booking" },
//   { event: "app/checkpayment" },
//   async ({ event, step }) => {
//     await step.sleep("Wait-for-10-minutes", "10m");

//     await step.run("check-payment-status", async () => {
//       const { bookingId } = event.data;

//       if (!bookingId) {
//         console.log("No booking ID found in event data.");
//         return;
//       }

//       const bookingData = await Booking.findById(bookingId);

//       if (!bookingData) {
//         console.log("Booking not found or already deleted.");
//         return;
//       }

//       if (!bookingData.isPaid) {
//         const show = await Show.findById(bookingData.show);

//         if (show) {
//           bookingData.bookedSeats.forEach((seat) => {
//             delete show.occupiedSeats[seat];
//           });
//           show.markModified("occupiedSeats");
//           await show.save();
//         }

//         await Booking.findByIdAndDelete(bookingData._id);
//         console.log("Booking deleted due to non-payment:", bookingId);
//       }
//     });
//   },
// );

// // ─── Send Booking Confirmation Email ──────────────────────────────────────────
// const sendBookingConfirmationEmail = inngest.createFunction(
//   { id: "send-booking-confirmation-email" },
//   { event: "app/show.booked" },
//   async ({ event, step }) => {
//     const { bookingId } = event.data;

//     // Step 1: Fetch booking + show + movie
//     const bookingData = await step.run("fetch-booking-data", async () => {
//       return await Booking.findById(bookingId).populate({
//         path: "show",
//         populate: { path: "movie", model: "Movie" },
//       });
//     });

//     if (!bookingData) {
//       throw new Error(`Email failed: Booking not found for ID ${bookingId}`);
//     }

//     // Step 2: Fetch user directly from Clerk
//     const clerkUser = await step.run("fetch-user-from-clerk", async () => {
//       return await clerkClient.users.getUser(bookingData.user);
//     });

//     const userEmail = clerkUser.emailAddresses[0].emailAddress;
//     const userName = `${clerkUser.firstName} ${clerkUser.lastName}`;

//     // Step 3: Send confirmation email
//     await step.run("send-email", async () => {
//       await sendEmail({
//         to: userEmail,
//         subject: `Payment Confirmed: "${bookingData.show.movie.title}" booked!`,
//         body: `
//           <div style="font-family: Arial, sans-serif; line-height: 1.5;">
//             <h2>Hi ${userName},</h2>
//             <p>Your booking for <strong style="color: #F84565;">${bookingData.show.movie.title}</strong> is confirmed.</p>
//             <p>
//               <strong>Date:</strong> ${new Date(bookingData.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
//               <strong>Time:</strong> ${new Date(bookingData.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
//             </p>
//             <p>Enjoy the show! 🍿</p>
//             <p>Thanks for booking with us!<br/>– QuickShow Team</p>
//           </div>
//         `,
//       });
//     });
//   },
// );

// // Inggest Function to send booking remainders -------------------------

// const sendShowReminders = inngest.createFunction(
//   { id: "send-show-reminders" },
//   { cron: "0 */8 * * *" }, // Every 8 hours
//   async ({ step }) => {
//     const now = new Date();
//     const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
//     const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

//     //prepare remainder tasks

//     const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
//       const shows = await Show.find({
//         showTime: { $gte: windowStart, $lte: in8Hours },
//       }).populate("movie");

//       const tasks = [];

//       for (const show of shows) {
//         if (!show.movie || !show.occupiedSeats) continue;

//         const userIds = [...new Set(Object.values(show.occupiedSeats))];
//         if (userIds.length === 0) continue;

//         const users = await User.find({ _id: { $in: userIds } }).select(
//           "name email",
//         );

//         for (const user of users) {
//           tasks.push({
//             userEmail: user.email,
//             userName: user.name,
//             movieTitle: show.movie.title,
//             showTime: show.showTime,
//           });
//         }
//       }
//       return tasks;
//     });

//     if (reminderTasks.length === 0) {
//       return { sent: 0, message: "No reminders to send." };
//     }
//     // Send reminder emails
//     const results = await step.run("send-all-reminders", async () => {
//       return await Promise.allSettled(
//         reminderTasks.map((task) =>
//           sendEmail({
//             to: task.userEmail,
//             subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,

//             body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
//     <h2>Hello ${task.userName},</h2>
//     <p>This is a quick reminder that your movie:</p>
//     <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
//     <p>
//         is scheduled for <strong>${new Date(task.showTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}</strong> at
//         <strong>${new Date(task.showTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}</strong>.
//     </p>
//     <p>It starts in approximately <strong>8 hours</strong> – make sure you're ready!</p>
//     <br/>
//     <p>Enjoy the show!<br/>QuickShow Team</p>
// </div>`,
//           }),
//         ),
//       );
//     });

//     const sent = results.filter((r) => r.status === "fulfilled").length;
//     const failed = results.length - sent;

//     return {
//       sent,
//       failed,
//       message: `Sent ${sent} reminder(s), ${failed} failed.`,
//     };
//   },
// );

// //Inngest Function to send notifications when a new show is added

// const sendNewShowNotification = inngest.createFunction(
//   { id: "send-new-show-notification" },
//   { event: "app/show.added" },
//   async ({ event }) => {
//     const { movieTitle } = event.data;

//     const users = await User.find({});

//     for (const user of users) {
//       const userEmail = user.email;
//       const userName = user.name;

//       const subject = `🎬 New Show Added: ${movieTitle}`;
//       const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
//     <h2>Hi ${userName},</h2>
//     <p>We've just added a new show to our library:</p>
//     <h3 style="color: #F84565;">"${movieTitle}"</h3>
//     <p>Visit our website</p>
//     <br/>
//     <p>Thanks,<br/>QuickShow Team</p>
// </div>`;

//       await sendEmail({
//         to: userEmail,
//         subject,
//         body,
//       });
//     }

//     return { message: "Notifications sent." };
//   },
// );

// export const functions = [
//   releaseSeatsAndDeleteBooking,
//   sendBookingConfirmationEmail,
//   sendShowReminders,
//   sendNewShowNotification,
// ];

import { Inngest } from "inngest";
import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

// ─── Release Seats if Unpaid after 10 minutes ─────────────────────────────────
export const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    await step.sleep("Wait-for-10-minutes", "10m");

    await step.run("check-payment-status", async () => {
      const { bookingId } = event.data;

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
        console.log("Booking deleted due to non-payment:", bookingId);
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

    // Step 1: Fetch booking + show + movie
    const bookingData = await step.run("fetch-booking-data", async () => {
      return await Booking.findById(bookingId).populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      });
    });

    if (!bookingData) {
      throw new Error(`Email failed: Booking not found for ID ${bookingId}`);
    }

    // Step 2: Fetch user directly from Clerk
    const clerkUser = await step.run("fetch-user-from-clerk", async () => {
      return await clerkClient.users.getUser(bookingData.user);
    });

    const userEmail = clerkUser.emailAddresses[0].emailAddress;
    const userName = `${clerkUser.firstName} ${clerkUser.lastName}`;

    // Step 3: Send confirmation email
    await step.run("send-email", async () => {
      await sendEmail({
        to: userEmail,
        subject: `Payment Confirmed: "${bookingData.show.movie.title}" booked!`,
        body: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Hi ${userName},</h2>
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

// ─── Send Show Reminders every 8 hours ────────────────────────────────────────
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" },
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours },
      }).populate("movie");

      const tasks = [];

      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        // Fetch each user from Clerk instead of MongoDB
        const clerkResults = await Promise.allSettled(
          userIds.map((id) => clerkClient.users.getUser(id)),
        );

        for (const result of clerkResults) {
          if (result.status !== "fulfilled") continue;
          const user = result.value;
          const userEmail = user.emailAddresses[0]?.emailAddress;
          if (!userEmail) continue;

          tasks.push({
            userEmail,
            userName: `${user.firstName} ${user.lastName}`,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          });
        }
      }

      return tasks;
    });

    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send." };
    }

    // Send reminder emails
    const results = await step.run("send-all-reminders", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
            body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hello ${task.userName},</h2>
    <p>This is a quick reminder that your movie:</p>
    <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
    <p>
        is scheduled for <strong>${new Date(task.showTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}</strong> at
        <strong>${new Date(task.showTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}</strong>.
    </p>
    <p>It starts in approximately <strong>8 hours</strong> – make sure you're ready!</p>
    <br/>
    <p>Enjoy the show!<br/>QuickShow Team</p>
</div>`,
          }),
        ),
      );
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`,
    };
  },
);

// ─── Send Notifications When a New Show is Added ──────────────────────────────
const sendNewShowNotification = inngest.createFunction(
  { id: "send-new-show-notification" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;

    // Fetch all users from Clerk (up to 500)
    const { data: clerkUsers } = await clerkClient.users.getUserList({
      limit: 500,
    });

    for (const user of clerkUsers) {
      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (!userEmail) continue;

      const userName = `${user.firstName} ${user.lastName}`;
      const subject = `🎬 New Show Added: ${movieTitle}`;
      const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hi ${userName},</h2>
    <p>We've just added a new show to our library:</p>
    <h3 style="color: #F84565;">"${movieTitle}"</h3>
    <p>Visit our website to book your seats!</p>
    <br/>
    <p>Thanks,<br/>QuickShow Team</p>
</div>`;

      await sendEmail({ to: userEmail, subject, body });
    }

    return { message: "Notifications sent." };
  },
);

export const functions = [
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotification,
];
