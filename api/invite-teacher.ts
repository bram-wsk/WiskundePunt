import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

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
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error: Missing Supabase keys" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
          if (existingUser) userId = existingUser.id;
          else return res.status(400).json({ error: "User exists according to Auth, but could not be found." });
      } else {
          return res.status(400).json({ error: inviteError.message });
      }
    } else if (linkData?.user) {
        userId = linkData.user.id;
        inviteLink = linkData.properties?.action_link;
    }

    if (!userId) return res.status(500).json({ error: "Failed to determine user ID" });

    // 3. Send Email via Resend (if configured)
    let emailSent = false;
    if (resend && inviteLink) {
        try {
            await resend.emails.send({
                from: 'Meneer Priem <onboarding@resend.dev>', // Use verified domain in production
                to: email,
                subject: 'Uitnodiging voor Meneer Priem',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                        <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 16px;">Welkom bij Meneer Priem!</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                            Beste ${name},<br><br>
                            Je bent uitgenodigd om als <strong>${role === 'admin' ? 'Beheerder' : 'Leerkracht'}</strong> aan de slag te gaan in de Meneer Priem wiskunde-app.
                        </p>
                        <div style="margin: 32px 0;">
                            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                                Account Activeren
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">
                            Als de knop niet werkt, kopieer dan deze link in je browser:<br>
                            <span style="word-break: break-all; color: #3b82f6;">${inviteLink}</span>
                        </p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                            Dit is een automatische uitnodiging van Meneer Priem.
                        </p>
                    </div>
                `
            });
            emailSent = true;
        } catch (e) {
            console.error("Resend error:", e);
        }
    }

    // 4. Create or Update Teacher Profile
    const { data: existingProfile } = await supabaseAdmin.from('teachers').select('id').eq('auth_id', userId).maybeSingle();
    
    const profileData = { name, role: role || 'teacher' };
    if (existingProfile) {
        await supabaseAdmin.from('teachers').update(profileData).eq('auth_id', userId);
    } else {
        await supabaseAdmin.from('teachers').insert({ ...profileData, auth_id: userId, class_ids: [] });
    }

    return res.status(200).json({ 
        message: emailSent ? "Uitnodiging verstuurd!" : "Uitnodiging klaar (geen e-mail verstuurd, gebruik de link).", 
        inviteLink: inviteLink,
        emailSent: emailSent,
        teacher: { id: userId, name, role: role || 'teacher' } 
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
