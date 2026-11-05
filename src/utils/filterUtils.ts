export type CameraFilterId = 
  | 'none'
  | 'clarity'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'mono'
  | 'night'
  | 'thermal'
  | 'sepia';

export interface CameraFilterDef {
  id: CameraFilterId;
  name: string;
  category: 'Standard' | 'Survey' | 'Aesthetic';
  description: string;
  cssFilter: string;
  previewBg: string;
}

export const CAMERA_FILTERS: CameraFilterDef[] = [
  {
    id: 'none',
    name: 'Normal',
    category: 'Standard',
    description: 'Natural authentic sensor output without color modification',
    cssFilter: 'none',
    previewBg: 'bg-slate-700',
  },
  {
    id: 'clarity',
    name: 'Survey Clarity',
    category: 'Survey',
    description: 'Boosts structural edges, crack details, and concrete texture',
    cssFilter: 'contrast(1.38) brightness(1.06) saturate(1.12)',
    previewBg: 'bg-cyan-600',
  },
  {
    id: 'vivid',
    name: 'Vivid Landscape',
    category: 'Aesthetic',
    description: 'Rich saturation and boosted dynamic range for outdoor terrain',
    cssFilter: 'saturate(1.65) contrast(1.18) brightness(1.02)',
    previewBg: 'bg-emerald-600',
  },
  {
    id: 'warm',
    name: 'Warm Gold',
    category: 'Aesthetic',
    description: 'Warm color temperature for architectural and site inspection',
    cssFilter: 'sepia(0.28) saturate(1.32) contrast(1.08) brightness(1.04)',
    previewBg: 'bg-amber-600',
  },
  {
    id: 'cool',
    name: 'Cool Slate',
    category: 'Survey',
    description: 'Technical cool blue tones for metalwork and industrial audits',
    cssFilter: 'hue-rotate(185deg) saturate(0.85) contrast(1.15) brightness(1.03)',
    previewBg: 'bg-blue-600',
  },
  {
    id: 'mono',
    name: 'Structural B&W',
    category: 'Survey',
    description: 'High-contrast monochrome for defect, shadow, and masonry inspection',
    cssFilter: 'grayscale(1) contrast(1.45) brightness(0.96)',
    previewBg: 'bg-neutral-800',
  },
  {
    id: 'night',
    name: 'Night Boost',
    category: 'Survey',
    description: 'Gamma & shadow exposure boost for twilight and low-light surveys',
    cssFilter: 'brightness(1.35) contrast(1.22) saturate(1.15)',
    previewBg: 'bg-indigo-700',
  },
  {
    id: 'thermal',
    name: 'Thermal False-Color',
    category: 'Survey',
    description: 'Heatmap visualization effect simulating thermal energy contrast',
    cssFilter: 'invert(0.88) hue-rotate(195deg) contrast(1.85) saturate(2.4)',
    previewBg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500',
  },
  {
    id: 'sepia',
    name: 'Field Journal',
    category: 'Aesthetic',
    description: 'Classic archival document tone for historical and field notes',
    cssFilter: 'sepia(0.85) contrast(1.12) brightness(0.95)',
    previewBg: 'bg-amber-800',
  },
];

export function getFilterCss(filterId: CameraFilterId = 'none'): string {
  const found = CAMERA_FILTERS.find((f) => f.id === filterId);
  return found ? found.cssFilter : 'none';
}
