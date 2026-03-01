
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhspojtxdjgzijnvmtql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc3BvanR4ZGpnemlqbnZtdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDA2MTAsImV4cCI6MjA4NjgxNjYxMH0.q13rHnSbZG19Qo_6Coofy1S8WoxhQCyxv3KC-_ajwCw';

export const supabase = createClient(supabaseUrl, supabaseKey);
