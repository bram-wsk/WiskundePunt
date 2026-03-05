import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define types for Express compatibility if @vercel/node is not available
// or just use 'any' for simplicity as we are in a mixed environment
type Request = VercelRequest | any;
type Response = VercelResponse | any;

export default async function handler(req: Request, res: Response) {
  // CORS handling for Vercel (if needed, though same-origin usually fine)
  // res.setHeader('Access-Control-Allow-Origin', '*');
  // res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: "Invalid JSON body" });
        }
    }
    const { email, name, role, redirectTo } = body || {};

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

    // 2. Generate Invite Link & Send Email
    let userId = null;
    let inviteLink = null;

    // We use generateLink to get the link AND trigger the email (Supabase does both if configured, 
    // but generateLink gives us the URL back immediately for the UI)
    const { data: linkData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            redirectTo: redirectTo || undefined,
            data: { name, role }
        }
    });

    if (inviteError) {
      // If user already exists, try to fetch their ID
      if (inviteError.message.includes("already been registered") || inviteError.message.includes("already exists")) {
          console.log("User already registered, fetching ID...");
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError || !usersData) {
              return res.status(400).json({ error: "User exists, but failed to retrieve ID." });
          }

          const existingUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (existingUser) {
              userId = existingUser.id;
          } else {
               return res.status(400).json({ error: "User exists according to Auth, but could not be found." });
          }
      } else {
          console.error("Invite error:", inviteError);
          return res.status(400).json({ error: inviteError.message });
      }
    } else if (linkData?.user) {
        userId = linkData.user.id;
        inviteLink = linkData.properties?.action_link;
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
        message: inviteLink ? "Uitnodiging verstuurd!" : "Gebruiker bestond al. Profiel is bijgewerkt/gekoppeld.", 
        inviteLink: inviteLink,
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
}
