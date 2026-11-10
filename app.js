
import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";

import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import connectDB from "./config/db.js";
import offerRoutes from "./routes/offerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import openPaymentsTestRoutes from "./routes/openPaymentsTestRoutes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

console.log("Passed DNS config");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {

    console.log("Socket connected:", socket.id);

    socket.on("joinChat", ({ shopA, shopB, tradeId }) => {

        const shops = [shopA, shopB].sort();

        const roomName = tradeId
            ? `${shops[0]}-${shops[1]}-${tradeId}`
            : `${shops[0]}-${shops[1]}`;

        socket.join(roomName);

        console.log("Joined room:", roomName);

    });

    socket.on("sendMessage", (data) => {

        const shops = [
            data.senderShopId,
            data.receiverShopId
        ].sort();

        const roomName = data.tradeId
            ? `${shops[0]}-${shops[1]}-${data.tradeId}`
            : `${shops[0]}-${shops[1]}`;

        io.to(roomName).emit(
            "receiveMessage",
            data
        );

        io.emit(
            "messageUnreadChanged",
            {
                receiverShopId: data.receiverShopId
            }
        );

    });

    socket.on("messageRead", (data) => {

        io.emit(
            "messageUnreadChanged",
            {
                receiverShopId: data.shopId
            }
        );

    });

    socket.on("disconnect", () => {

        console.log("Socket disconnected:", socket.id);

    });

});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);

// route calls 10/10
app.use("/", authRoutes);
app.use("/", shopRoutes);
app.use("/", tradeRoutes);
app.use("/", dashboardRoutes);
app.use("/", offerRoutes);
app.use("/", notificationRoutes);
app.use("/", messageRoutes);
app.use("/", paymentRoutes);
app.use("/", transactionRoutes);
app.use("/", openPaymentsTestRoutes);

app.get("/", (req, res) => {

    res.render("public/index");

});
app.use((req, res) => {

    res.status(404).render("public/error", {
        statusCode: 404,
        message: "The page you're looking for doesn't exist or may have been moved."
    });

});

app.use((error, req, res, next) => {

    console.error("NEXA Server Error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).render("public/error", {
        statusCode: 500,
        message: "We ran into an unexpected issue. Please try again in a moment."
    });

});

const PORT = process.env.PORT || 7500;

server.listen(PORT, () => {

    console.log(`NEXA runnin on port ${PORT}`);

});
