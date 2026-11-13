export type PlanId = 'free' | 'pro' | 'business';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  audience: string;
  priceMonthlyEur: number;
  priceAnnualEur: number;
  maxProjects: number;
  monthlyCredits: number;
  allowedExports: Array<'pdf' | 'epub' | 'html' | 'docx'>;
  allowAiIllustrations: boolean;
  allowPremiumTemplates: boolean;
  allowTeamSeats: boolean;
  highlights: string[];
}

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Découverte (Free)',
    audience: 'Pour explorer la bibliothèque et rédiger un premier manuscrit',
    priceMonthlyEur: 0,
    priceAnnualEur: 0,
    maxProjects: 3,
    monthlyCredits: 120,
    allowedExports: ['pdf', 'html'],
    allowAiIllustrations: false,
    allowPremiumTemplates: false,
    allowTeamSeats: false,
    highlights: [
      'Accès complet à la bibliothèque publique',
      'Jusqu’à 3 projets actifs',
      '120 crédits IA inclus',
      'Export PDF & HTML',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Auteur Pro',
    audience: 'Pour les auteurs indépendants et créateurs réguliers',
    priceMonthlyEur: 19,
    priceAnnualEur: 15,
    maxProjects: 25,
    monthlyCredits: 1200,
    allowedExports: ['pdf', 'epub', 'html', 'docx'],
    allowAiIllustrations: true,
    allowPremiumTemplates: true,
    allowTeamSeats: false,
    highlights: [
      'Jusqu’à 25 projets d’eBooks',
      '1 200 crédits IA par mois',
      'Génération d’illustrations IA intégrée',
      'Export PDF, EPUB 3, HTML & DOCX',
      'Modèles de couverture et mise en page premium',
    ],
  },
  business: {
    id: 'business',
    name: 'Studio Business',
    audience: 'Pour maisons d’édition, agences et équipes éditoriales',
    priceMonthlyEur: 49,
    priceAnnualEur: 39,
    maxProjects: 250,
    monthlyCredits: 5000,
    allowedExports: ['pdf', 'epub', 'html', 'docx'],
    allowAiIllustrations: true,
    allowPremiumTemplates: true,
    allowTeamSeats: true,
    highlights: [
      'Jusqu’à 250 projets collaboratifs',
      '5 000 crédits IA par mois',
      'Outils éditoriaux avancés & relecture complète',
      'Gestion d’équipe multi-auteurs',
      'Exports illimités tous formats',
    ],
  },
};
