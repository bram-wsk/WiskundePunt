-- 1. Row Level Security (RLS) inschakelen voor de 'problems' tabel
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

-- 2. Iedereen mag oefeningen bekijken (SELECT)
-- Dit geldt voor zowel geauthenticeerde gebruikers als anonieme gebruikers (indien nodig)
CREATE POLICY "Anyone can view problems"
ON problems FOR SELECT
USING (true);

-- 3. Enkel beheerders mogen oefeningen verwijderen (DELETE)
CREATE POLICY "Only admins can delete problems"
ON problems FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Enkel beheerders mogen oefeningen toevoegen of wijzigen (INSERT/UPDATE)
-- (Optioneel, maar meestal gewenst als enkel admins mogen beheren)
CREATE POLICY "Only admins can insert problems"
ON problems FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update problems"
ON problems FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE auth_id = auth.uid() AND role = 'admin'
  )
);
