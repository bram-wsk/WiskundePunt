-- KOPIEER EN VOER UIT IN DE SUPABASE SQL EDITOR

-- 1. Tabel aanpassingen
-- Voeg auth_id toe om de link te leggen met Supabase Auth
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);
-- Voeg role toe om onderscheid te maken tussen admins en gewone leerkrachten
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';

-- 2. Row Level Security (RLS) inschakelen
-- Dit zorgt ervoor dat niemand data kan zien tenzij er een policy is
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- (Voeg hier eventueel results/interventions aan toe als die tabellen bestaan)

-- 3. Policies voor Teachers
-- Iedereen mag zijn EIGEN profiel zien
CREATE POLICY "Teachers can view own profile" 
ON teachers FOR SELECT 
USING (auth.uid() = auth_id);

-- Admins mogen ALLE teachers zien
CREATE POLICY "Admins can view all teachers" 
ON teachers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Policies voor Classrooms & Students
-- Voorlopig: Elke ingelogde leerkracht mag klassen en studenten zien
-- (Dit kan later verfijnd worden naar "enkel mijn klassen")
CREATE POLICY "Authenticated users can view classrooms"
ON classrooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view students"
ON students FOR SELECT
TO authenticated
USING (true);

-- 5. (Optioneel) Maak je eerste admin aan
-- Nadat je jezelf hebt geregistreerd via de app (of handmatig in Auth),
-- zoek je jouw UUID in de 'auth.users' tabel en voer je dit uit:
-- UPDATE teachers SET role = 'admin', auth_id = 'JOUW_UUID_HIER' WHERE name = 'Jouw Naam';
