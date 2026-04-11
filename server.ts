import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import webpush from "web-push";
import inviteTeacherHandler from "./api/invite-teacher";

// Load environment variables from .env file if present
dotenv.config();

// Configure web-push
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:bombaertb@gmail.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// In-memory subscription storage (for demo/prototype)
let subscriptions: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Invite Teacher
  app.post("/api/invite-teacher", (req, res) => {
      inviteTeacherHandler(req, res);
  });

  // API Route: Push Subscribe
  app.post("/api/push/subscribe", (req, res) => {
    const subscription = req.body;
    if (!subscriptions.find(s => s.endpoint === subscription.endpoint)) {
      subscriptions.push(subscription);
    }
    res.status(201).json({});
  });

  // API Route: Push Send (Triggered by student app)
  app.post("/api/push/send", async (req, res) => {
    const { title, body, url } = req.body;
    const payload = JSON.stringify({ title, body, url });

    const notifications = subscriptions.map(subscription => {
      return webpush.sendNotification(subscription, payload).catch(error => {
        console.error("Error sending push notification:", error);
        if (error.statusCode === 404 || error.statusCode === 410) {
          subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
        }
      });
    });

    await Promise.all(notifications);
    res.status(200).json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production (if needed, though usually handled by platform)
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
