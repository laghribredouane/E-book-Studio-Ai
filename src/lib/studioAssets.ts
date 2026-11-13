export interface StudioImageAsset {
  id: string;
  title: string;
  style: string;
  kind: 'cover' | 'chapter';
  aspect: '3:4' | '4:3';
  url: string;
  prompt: string;
}

export const STUDIO_COVER_ASSETS: StudioImageAsset[] = [
  {
    id: 'cover-arch',
    title: 'Architecture & Lumière',
    style: 'Éditorial',
    kind: 'cover',
    aspect: '3:4',
    url: '/src/assets/images/cover_architecture_light_1794562687378.jpg',
    prompt: 'Façade contemporaine en travertin baignée de lumière dorée rasante, style monographie d’architecture.',
  },
  {
    id: 'cover-botanical',
    title: 'Atlas Botanique',
    style: 'Artistique',
    kind: 'cover',
    aspect: '3:4',
    url: '/src/assets/images/cover_botanical_atlas_1794562686971.jpg',
    prompt: 'Planche botanique historique sur fond sombre avec dorures éditoriales fines.',
  },
  {
    id: 'cover-quantum',
    title: 'Systèmes & Pensée',
    style: 'Minimaliste',
    kind: 'cover',
    aspect: '3:4',
    url: '/src/assets/images/cover_quantum_minds_1794562688999.jpg',
    prompt: 'Composition géométrique abstraite bleu nuit et violet sur papier texturé.',
  },
  {
    id: 'cover-kyoto',
    title: 'Récits de Voyage',
    style: 'Artistique',
    kind: 'cover',
    aspect: '3:4',
    url: '/src/assets/images/cover_culinary_tokyo_1794562689258.jpg',
    prompt: 'Ruelle nocturne éclairée de lanternes chaudes, atmosphère littéraire et feutrée.',
  },
  {
    id: 'cover-creative',
    title: 'Atelier d’Écriture',
    style: 'Minimaliste',
    kind: 'cover',
    aspect: '3:4',
    url: '/src/assets/images/ebook_cover_creative_writing_1794564433522.jpg',
    prompt: 'Couverture littéraire minimaliste avec géométrie éditoriale bleu nuit, violet et or sur papier coton.',
  },
];

export const STUDIO_ILLUSTRATION_ASSETS: StudioImageAsset[] = [
  {
    id: 'illus-arch-sunlight',
    title: 'Géométrie de l’ombre portée',
    style: 'Éditorial',
    kind: 'chapter',
    aspect: '4:3',
    url: '/src/assets/images/ebook_illus_sunlight_arch_1794564431145.jpg',
    prompt: 'Illustration architecturale éditoriale d’arcades en pierre baignées par la lumière oblique de fin d’après-midi.',
  },
  {
    id: 'illus-alpine-fern',
    title: 'Planche botanique des fougères',
    style: 'Éducatif / Schéma',
    kind: 'chapter',
    aspect: '4:3',
    url: '/src/assets/images/ebook_illus_alpine_fern_1794564431336.jpg',
    prompt: 'Planche naturaliste détaillée illustrant rhizomes, crosses et sporanges d’une fougère alpine sur papier parchemin.',
  },
  {
    id: 'illus-system-diagram',
    title: 'Architecture de systèmes',
    style: 'Minimaliste',
    kind: 'chapter',
    aspect: '4:3',
    url: '/src/assets/images/ebook_illus_system_diagram_1794564431656.jpg',
    prompt: 'Schéma conceptuel suisse épuré représentant des flux modulaires et nœuds de données sur fond clair.',
  },
  {
    id: 'illus-kyoto-courtyard',
    title: 'Poétique du patio au crépuscule',
    style: 'Artistique',
    kind: 'chapter',
    aspect: '4:3',
    url: '/src/assets/images/ebook_illus_kyoto_courtyard_1794564433268.jpg',
    prompt: 'Illustration de cour intérieure au crépuscule avec lanternes chaudes, bois sombre et pierre humide.',
  },
];
