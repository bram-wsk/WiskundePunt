import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { authId, redirectTo } = body || {};

    if (!authId) return res.status(400).json({ error: "authId is required" });

    // 1. Initialize Clients
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error: Missing Supabase keys" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch User by authId
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(authId);
    if (userError || !userData?.user) {
        return res.status(404).json({ error: "User not found in Auth system" });
    }

    const email = userData.user.email;
    if (!email) {
        return res.status(400).json({ error: "User does not have an email address" });
    }

    // 3. Generate Recovery Link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: redirectTo || undefined
        }
    });

    if (linkError) {
        return res.status(400).json({ error: linkError.message });
    }

    return res.status(200).json({ 
        message: "Herstellink gegenereerd!", 
        resetLink: linkData.properties?.action_link
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
