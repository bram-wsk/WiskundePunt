import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Invite Teacher
  app.post("/api/invite-teacher", async (req, res) => {
    try {
      const { email, name, role, redirectTo } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      // 1. Initialize Supabase Admin Client
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl) {
        console.error("Missing VITE_SUPABASE_URL");
        return res.status(500).json({ error: "Server configuration error: Missing VITE_SUPABASE_URL" });
      }

      if (!supabaseServiceKey) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        return res.status(500).json({ error: "Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY" });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 2. Invite User via Email OR Get Existing User
      let userId = null;

      // Try to invite first
      const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

      if (inviteError) {
        // If user already exists, try to fetch their ID
        // The error message for existing user is usually "A user with this email address has already been registered"
        if (inviteError.message.includes("already been registered")) {
            console.log("User already registered, fetching ID...");
            
            // List users to find the ID
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (listError) {
                console.error("List users error:", listError);
                return res.status(400).json({ error: "User exists, but failed to retrieve ID: " + listError.message });
            }

            const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            
            if (existingUser) {
                userId = existingUser.id;
                console.log("Found existing user ID:", userId);
            } else {
                 return res.status(400).json({ error: "User exists according to Auth, but could not be found in user list." });
            }

        } else {
            console.error("Invite error:", inviteError);
            return res.status(400).json({ error: inviteError.message });
        }
      } else if (newUser?.user) {
          userId = newUser.user.id;
      }

      if (!userId) {
        return res.status(500).json({ error: "Failed to determine user ID" });
      }

      // 3. Create or Update Teacher Profile
      // Check if profile exists first
      const { data: existingProfile, error: fetchError } = await supabaseAdmin
        .from('teachers')
        .select('id')
        .eq('auth_id', userId)
        .single();

      let dbError;
      
      if (existingProfile) {
          // Update existing profile
          const { error } = await supabaseAdmin
            .from('teachers')
            .update({
                name: name,
                role: role || 'teacher'
            })
            .eq('auth_id', userId);
          dbError = error;
      } else {
          // Insert new profile
          const { error } = await supabaseAdmin
            .from('teachers')
            .insert({
                auth_id: userId,
                name: name,
                role: role || 'teacher',
                class_ids: []
            });
          dbError = error;
      }

      if (dbError) {
        console.error("Database error:", JSON.stringify(dbError, null, 2));
        return res.status(400).json({ error: "Profile creation failed: " + (dbError.message || JSON.stringify(dbError)) });
      }

      return res.status(200).json({ 
          message: "Uitnodiging verstuurd / Profiel gekoppeld!", 
          teacher: { 
              id: userId, 
              name, 
              role: role || 'teacher' 
          } 
      });

    } catch (err: any) {
      console.error("Server error:", err);
      return res.status(500).json({ error: err.message });
    }
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
