# EBOOK STUDIO AI

Plateforme SaaS complète de bibliothèque numérique et de création d’eBooks assistée par IA (Gemini).

## Fonctionnalités principales

- **Site public & Bibliothèque numérique** : Accueil éditorial, catalogue filtrable par catégorie, langue, auteur et popularité (grille/liste), fiches détaillées avec table des matières, aperçus, favoris et avis.
- **Lecteur eBook intégré** : Navigation par chapitres, pagination, mode plein écran, thèmes papier/sépia/nuit, taille de police réglable, support natif RTL pour l’arabe, signets et reprise automatique de lecture.
- **Studio de création en 8 étapes** :
  1. Cadrage du projet (langue du livre indépendante de la langue d’interface).
  2. Génération de plan structuré via Gemini + ajout, édition, suppression et réorganisation des chapitres.
  3. Rédacteur riche HTML avec sauvegarde automatique et 10 outils IA (générer un paragraphe, continuer, réécrire, développer, résumer, corriger, améliorer le style, traduire, simplifier, changer de ton).
  4. Générateur d’illustrations IA par style artistique + insertion dans les chapitres ou couvertures.
  5. Concepteur de couvertures en direct (modèles, couleurs, typographies, alignements).
  6. Mise en page avancée (A4, A5, Letter, marges, interligne, en-têtes, pieds de page, numérotation).
  7. Assistant de relecture éditoriale non destructif (validation explicite par suggestion).
  8. Export réel en **PDF** (`pdfkit`), **EPUB 3** (`jszip`), **HTML5** et **DOCX** (`docx`).
- **Monétisation & Crédits IA** : Plans Free / Pro / Business, déduction atomique idempotente côté serveur avec remboursement en cas d’erreur API, historique des transactions.
- **Multilingue (11 langues)** : Français, Anglais, Arabe (RTL), Allemand, Espagnol, Portugais, Italien, Turc, Néerlandais, Chinois, Japonais.
- **Panneau Administrateur sécurisé (RBAC)** : Statistiques globales, gestion des utilisateurs/crédits, modération des livres publics, catégories, langues, signalements, configuration des modèles/coûts IA et journal d’audit.

## Stack technique

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend** : Express (`server.ts`), Firebase Admin SDK, `@google/genai` (appels serveur uniquement).
- **Base de données** : PostgreSQL (Cloud SQL) via Drizzle ORM (`src/db/schema.ts`), plus migrations SQL de référence dans `supabase/migrations/`.
- **Exports** : `pdfkit` (PDF), `jszip` (EPUB 3), `docx` (Word).

## Développement & Déploiement

```bash
npm install
npm run dev       # Démarre Express + Vite sur le port 3000
npm run lint      # Vérification TypeScript
npm run build     # Build frontend production
npm run start     # Serveur production
```

Configurez `GEMINI_API_KEY` dans vos secrets serveur. Pour activer le paiement Stripe en production, renseignez `STRIPE_SECRET_KEY`.
