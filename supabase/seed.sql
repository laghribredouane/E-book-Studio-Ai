-- EBOOK STUDIO AI — Seed SQL Reference (11 Languages + Categories + Settings)

INSERT INTO book_languages (code, name, native_name, is_rtl, is_active) VALUES
  ('fr', 'Français', 'Français', false, true),
  ('en', 'Anglais', 'English', false, true),
  ('ar', 'Arabe', 'العربية', true, true),
  ('de', 'Allemand', 'Deutsch', false, true),
  ('es', 'Espagnol', 'Español', false, true),
  ('pt', 'Portugais', 'Português', false, true),
  ('it', 'Italien', 'Italiano', false, true),
  ('tr', 'Turc', 'Türkçe', false, true),
  ('nl', 'Néerlandais', 'Nederlands', false, true),
  ('zh', 'Chinois', '中文', false, true),
  ('ja', 'Japonais', '日本語', false, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO book_categories (slug, name, description, sort_order) VALUES
  ('technology', 'Technologie & IA', 'Ingénierie, systèmes et informatique', 1),
  ('architecture', 'Architecture & Design', 'Design urbain, espace et esthétique', 2),
  ('science', 'Sciences & Nature', 'Botanique, physique et recherche', 3),
  ('travel', 'Voyage & Culture', 'Guides éditoriaux et récits géographiques', 4),
  ('business', 'Entreprise & Stratégie', 'Leadership, finance et organisation', 5),
  ('literature', 'Littérature & Essais', 'Romans, nouvelles et essais contemporains', 6),
  ('education', 'Éducation & Pédagogie', 'Manuels pratiques et guides d’apprentissage', 7),
  ('wellness', 'Bien-être & Art de vivre', 'Santé, gastronomie et équilibre', 8)
ON CONFLICT (slug) DO NOTHING;
