/**
 * Utility functions for handling convocatoria colors
 */

interface ConvocatoriaColor {
  primary: string;
  hover: string;
  glow: string;
  badge: string;
}

// Predefined colors for convocatorias
const CONVOCATORIA_COLORS: ConvocatoriaColor[] = [
  {
    primary: '#3B82F6', // Blue
    hover: '#2563EB',
    glow: 'rgba(59, 130, 246, 0.5)',
    badge: 'bg-blue-500'
  },
  {
    primary: '#10B981', // Green
    hover: '#059669',
    glow: 'rgba(16, 185, 129, 0.5)',
    badge: 'bg-green-500'
  },
  {
    primary: '#8B5CF6', // Purple
    hover: '#7C3AED',
    glow: 'rgba(139, 92, 246, 0.5)',
    badge: 'bg-purple-500'
  },
  {
    primary: '#EC4899', // Pink
    hover: '#DB2777',
    glow: 'rgba(236, 72, 153, 0.5)',
    badge: 'bg-pink-500'
  },
  {
    primary: '#F59E0B', // Amber/Orange
    hover: '#D97706',
    glow: 'rgba(245, 158, 11, 0.5)',
    badge: 'bg-amber-500'
  },
  {
    primary: '#EF4444', // Red
    hover: '#DC2626',
    glow: 'rgba(239, 68, 68, 0.5)',
    badge: 'bg-red-500'
  },
  {
    primary: '#14B8A6', // Teal
    hover: '#0D9488',
    glow: 'rgba(20, 184, 166, 0.5)',
    badge: 'bg-teal-500'
  },
  {
    primary: '#F97316', // Orange
    hover: '#EA580C',
    glow: 'rgba(249, 115, 22, 0.5)',
    badge: 'bg-orange-500'
  },
  {
    primary: '#06B6D4', // Cyan
    hover: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.5)',
    badge: 'bg-cyan-500'
  },
  {
    primary: '#84CC16', // Lime
    hover: '#65A30D',
    glow: 'rgba(132, 204, 22, 0.5)',
    badge: 'bg-lime-500'
  }
];

// Cache for convocatoria to color index mapping
const convocatoriaColorMap = new Map<string, number>();

/**
 * Get color for a specific convocatoria
 * Uses a consistent hash-based approach to assign colors to convocatorias
 */
export function getConvocatoriaColor(convocatoria: string | undefined): ConvocatoriaColor {
  // Default to first color if no convocatoria specified
  if (!convocatoria) {
    return CONVOCATORIA_COLORS[0];
  }

  // Check if we already assigned a color to this convocatoria
  if (convocatoriaColorMap.has(convocatoria)) {
    const index = convocatoriaColorMap.get(convocatoria)!;
    return CONVOCATORIA_COLORS[index];
  }

  // Assign next available color based on current map size
  const colorIndex = convocatoriaColorMap.size % CONVOCATORIA_COLORS.length;
  convocatoriaColorMap.set(convocatoria, colorIndex);
  
  return CONVOCATORIA_COLORS[colorIndex];
}

/**
 * Get badge class for convocatoria
 */
export function getConvocatoriaBadgeClass(convocatoria: string | undefined): string {
  const color = getConvocatoriaColor(convocatoria);
  return color.badge;
}

/**
 * Reset the color mapping (useful for testing or when loading fresh data)
 */
export function resetConvocatoriaColorMap() {
  convocatoriaColorMap.clear();
}

/**
 * Pre-register convocatorias to ensure consistent color assignment
 * Call this when loading initial data to ensure colors stay consistent
 */
export function registerConvocatorias(convocatorias: string[]) {
  // Sort to ensure consistent ordering
  const sorted = [...new Set(convocatorias)].sort();
  
  sorted.forEach((convocatoria, index) => {
    if (!convocatoriaColorMap.has(convocatoria)) {
      convocatoriaColorMap.set(convocatoria, index % CONVOCATORIA_COLORS.length);
    }
  });
}
