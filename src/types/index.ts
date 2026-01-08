export interface Project {
  id: string; // No registro
  name: string; // Nombre de la propuesta
  organization: string; // Organización o entidad
  category: string; // Categoría de participación
  thematicArea: string; // Ámbito Temático
  state: string; // Ubicación territorial - Estado(s) - Main/Headquarters state
  municipality: string; // Ubicación territorial /Municipios implementación
  implementationStates?: string[]; // Additional states where project is implemented
  isNationalProject?: boolean; // Flag to indicate if this is a national project (all states)
  convocatoria?: string; // Convocatoria (e.g., "Primera Convocatoria 2025")
  objective: string; // Objetivo principal
  beneficiaries: string; // Beneficiarios/ Participantes directos
  riskFactors?: string; // Factores de riesgo identificados
  methodology?: string; // Metodología
  results: string; // Resultados principales
  evaluationCriteriaHighlights?: string; // Criterios de evaluación destacados
  totalScore: number; // Puntaje Acumulado total Evaluaciones
  finalRankingPosition?: number; // Lugar Ocupado en los Resultados Finales
  imageUrl: string; // URL con fotografías - Hero/Main image
  latitude: number; // Generated latitude
  longitude: number; // Generated longitude
  // Section-specific Images
  beneficiariesImageUrl?: string; // Image for Beneficiarios section
  riskFactorsImageUrl?: string; // Image for Risk Factors section
  methodologyImageUrl?: string; // Image for Metodología section
  resultsImageUrl?: string; // Image for Resultados section
  // Footer Information (Project-specific)
  footerOrganizationName?: string; // Organization name for footer
  footerContactEmail?: string; // Contact email for footer
  footerContactPhone?: string; // Contact phone for footer
  footerContactEmail2?: string; // Second contact email (for joint organizations)
  footerContactPhone2?: string; // Second contact phone (for joint organizations)
  footerWebsiteUrl?: string; // Website URL (Sitio web)
  footerPhysicalAddress?: string; // Physical office address (Dirección de oficinas principales)
  footerInstagramUrl?: string; // Instagram URL
  footerFacebookUrl?: string; // Facebook URL
  footerXUrl?: string; // X (Twitter) URL
  footerLinkedinUrl?: string; // LinkedIn URL
  footerTiktokUrl?: string; // TikTok URL
  footerYoutubeUrl?: string; // YouTube URL
  // Keep some legacy fields for compatibility
  description?: string; // Descripción de la iniciativa (legacy)
  location?: {
    state: string;
    city: string;
    x: number;
    y: number;
  };
  socialMediaWebsite?: string; // Redes sociales y sitio web
  budget?: string;
  status?: 'activo' | 'finalizado' | 'en-desarrollo';
  riskFactorsSecondary?: string;
  startDate?: string;
  evaluationCriteria?: string[];
  shortDescription?: string;
}

export interface FilterState {
  searchQuery: string;
  selectedCategories: string[];
  selectedThematicAreas: string[];
  selectedLocations: string[];
}