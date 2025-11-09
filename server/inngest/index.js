import { Inngest } from "inngest";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

//Inngest Function to save user data to a database
const syncUserCration = inngest.createFunction(
  { id: 'sync-user-from-clerk' },
  { event: 'clerk/user.created' },
  async ({ event }) => { 

    const { id, first_name, last_name, email_addresses, image_url } = event.data 

    const userData = {
      _id: id,
      email: email_addresses[0].email_addresses,
      name: first_name + " " + last_name,
      Image: image_url
    }
    await User.create(userData)

  }
)

//Inngest Function to Delete user data to a database

const syncUserDeletion = inngest.createFunction(
  { id: 'delete-user-from-clerk' },
  { event: 'clerk/user.deleted' },
  async ({ event }) => {  

    const { id } = event.data
    await User.findByIdAndDelete(id)
    
  }
)

//Inngest Function to Update user data to a database

const syncUserUpdation = inngest.createFunction(
  { id: 'update-user-from-clerk' },
  { event: 'clerk/user.updated' },
  async ({ event }) => { 
    const { id, first_name, last_name, email_addresses, image_url } = event.data
    
    const userData = {
      _id: id,
      email: email_addresses[0].email_addresses,
      name: first_name + " " + last_name,
      Image: image_url
    }

    await User.findByIdAndUpdate(id, userData)

  }
)

export const functions = [syncUserCration,syncUserDeletion,syncUserUpdation];