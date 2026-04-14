import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  console.log('Select error:', error);
  if (data && data.length > 0) {
    const { error: updateError } = await supabase.from('students').update({ tts_enabled: true }).eq('id', data[0].id);
    console.log('Update error:', updateError);
  }
}
test();
