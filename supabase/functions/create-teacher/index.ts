import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Maak een client aan met de context van de aanvrager (om te checken of het een admin is)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Haal de user op die de request doet
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }

    // 3. Check of deze user een 'admin' is in de teachers tabel
    const { data: teacher } = await supabaseClient
      .from('teachers')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!teacher || teacher.role !== 'admin') {
      return new Response("Forbidden: Alleen beheerders kunnen leerkrachten toevoegen.", { status: 403, headers: corsHeaders })
    }

    // 4. Als we hier zijn, is de aanvrager een admin. 
    // Nu gebruiken we de SERVICE_ROLE key om de nieuwe gebruiker aan te maken (bypassing RLS en auth restricties)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, name, class_ids, role } = await req.json()

    // 5. Nodig de Auth User uit (stuurt email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders })
    }

    // 6. Voeg het profiel toe aan de teachers tabel
    const { error: dbError } = await supabaseAdmin
      .from('teachers')
      .insert({
        auth_id: newUser.user.id,
        name,
        class_ids: class_ids || [], // Optioneel: direct klassen koppelen
        role: role || 'teacher'
      })

    if (dbError) {
      // Optioneel: rol de auth user creatie terug als DB faalt, maar voor nu simpel houden
      return new Response(JSON.stringify({ error: dbError.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ message: "Leerkracht succesvol aangemaakt!", user: newUser.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
