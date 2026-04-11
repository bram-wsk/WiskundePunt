import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import inviteTeacherHandler from "./api/invite-teacher";

// Load environment variables from .env file if present
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Invite Teacher
  // Use the shared handler for consistency
  app.post("/api/invite-teacher", (req, res) => {
      // Express req/res are compatible with Vercel handler signature
      inviteTeacherHandler(req, res);
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
