import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./supabase-config.json', 'utf-8'));
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function check() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  console.log('DATA:', data);
  console.log('ERROR:', error);
}
check();
