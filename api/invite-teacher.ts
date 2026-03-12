import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define types for Express compatibility
type Request = VercelRequest | any;
type Response = VercelResponse | any;

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON body" }); }
    }
    const { email, name, role, redirectTo } = body || {};

    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

    // 1. Initialize Clients
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error: Missing Supabase keys" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Generate Invite Link
    let userId = null;
    let inviteLink = null;

    const { data: linkData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            redirectTo: redirectTo || undefined,
            data: { name, role }
        }
    });

    if (inviteError) {
      if (inviteError.message.includes("already been registered") || inviteError.message.includes("already exists")) {
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError || !usersData) return res.status(400).json({ error: "User exists, but failed to retrieve ID." });
          const existingUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (existingUser) {
              userId = existingUser.id;
              // Try to generate a magic link for existing user so they can still "activate" or log in
              console.log("Generating magic link for existing user:", email);
              const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
                  type: 'magiclink',
                  email: email,
                  options: { redirectTo: redirectTo || undefined }
              });
              if (recoveryError) {
                  console.error("Recovery link generation error:", recoveryError);
              }
              if (recoveryData?.properties?.action_link) {
                  inviteLink = recoveryData.properties.action_link;
                  console.log("Magic link generated:", inviteLink);
              }
          } else {
              return res.status(400).json({ error: "User exists according to Auth, but could not be found." });
          }
      } else {
          return res.status(400).json({ error: inviteError.message });
      }
    } else if (linkData?.user) {
        userId = linkData.user.id;
        inviteLink = linkData.properties?.action_link;
    }

    if (!userId) return res.status(500).json({ error: "Failed to determine user ID" });

    // 3. Create or Update Teacher Profile
    const { data: existingProfile } = await supabaseAdmin.from('teachers').select('id').eq('auth_id', userId).maybeSingle();
    
    const profileData = { name, role: role || 'teacher' };
    if (existingProfile) {
        await supabaseAdmin.from('teachers').update(profileData).eq('auth_id', userId);
    } else {
        await supabaseAdmin.from('teachers').insert({ ...profileData, auth_id: userId, class_ids: [] });
    }

    return res.status(200).json({ 
        message: "Uitnodiging klaar!", 
        inviteLink: inviteLink,
        teacher: { id: userId, name, role: role || 'teacher' } 
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
