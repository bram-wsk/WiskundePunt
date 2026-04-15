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
    const { username, password } = body || {};

    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all students (or we could query by first_name and last_initial, but we need to match the concatenated username)
    // To be safe and handle case-insensitivity properly, we fetch all and filter in JS, or we can use ilike.
    // Since username is firstName + lastInitial, let's fetch all and filter.
    const { data: students, error } = await supabaseAdmin.from('students').select('*');
    
    if (error) {
        return res.status(500).json({ error: "Database error" });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const foundStudent = students.find(s => 
       (s.first_name.toLowerCase() + s.last_initial.toLowerCase()) === normalizedUsername && 
       s.password === password
    );

    if (foundStudent) {
        // Fetch class name
        const { data: classData } = await supabaseAdmin.from('classrooms').select('name').eq('id', foundStudent.class_id).single();
        
        return res.status(200).json({
            student: {
                id: String(foundStudent.id),
                firstName: foundStudent.first_name,
                className: classData?.name || 'Onbekende Klas',
                role: 'student',
                isLowStimulus: foundStudent.is_low_stimulus || false,
                ttsEnabled: foundStudent.tts_enabled || false
            }
        });
    } else {
        return res.status(401).json({ error: "Ongeldige inloggegevens" });
    }

  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
