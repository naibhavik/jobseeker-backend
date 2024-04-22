import express from "express";
import { dbConnection } from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import { config } from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import stripePackage from 'stripe';
import http from 'http'; // Import http module
import { Server } from "socket.io";  // Create HTTP server
const app = express();
const server = http.createServer(app);
import Message from "./models/messageSchema.js"



const stripe = stripePackage("sk_test_51P10z2SGpizPxAHaSlTGprId3dKnA9KyRayVkMdEkj8738mKJIbwkwA56Jmxv9n0VTQFEaPviPugDdVBbu5PbGB500kaTG3r01");
config({ path: "./config/config.env" });

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    rooms[socket.id] = roomId;
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("send-message", async (message) => {
    const roomId = rooms[socket.id];
    if (roomId) {
      io.to(roomId).emit("received-message", message);

      // Save message to MongoDB
      try {
        await Message.create(message);
        console.log("Message saved to database:", message);
      } catch (error) {
        console.error("Error saving message to database:", error);
      }
      try {
        const previousMessages = await Message.find({ roomId });
        socket.emit("previous-messages", previousMessages);
      } catch (error) {
        console.error("Error fetching previous messages:", error);
      }
    }
  });

  socket.on("disconnect", () => {
    const roomId = rooms[socket.id];
    if (roomId) {
      console.log(`User ${socket.id} disconnected from room ${roomId}`);
      delete rooms[socket.id];
    }
  });
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const products = req.body;
    console.log("this is products", products)

    const lineItems = products.map(product => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: product.name,
        },
        unit_amount: product.price, // Amount in cents
        recurring: {
          interval: 'month', // Define the billing interval (e.g., month, year)
        },
      },
      quantity: product.quantity,
    }));

    // Create customer with provided details
    const customer = await stripe.customers.create({
      name: 'naibhavik',
      email: 'naibhavik68@gmail.com',
      address: {
        city: 'palanpur',
        country: 'China',
        line1: 'dijfjd',
        line2: 'djfdhf',
        postal_code: 'dfjdjf',
        state: 'Gujarat',
      }
    });

    // Create checkout session with customer ID
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      customer: customer.id,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe API Error:', error.message);
    res.status(500).json({
      msg: 'Failed to create checkout session',
      error: error.message
    });
  }
});


dbConnection();

app.use(errorMiddleware);
export default server;
