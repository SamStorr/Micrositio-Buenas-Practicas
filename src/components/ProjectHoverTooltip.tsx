import React from 'react';
import { Project } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin } from 'lucide-react';
import { getConvocatoriaBadgeClass } from '../utils/convocatoriaColors';

interface ProjectHoverTooltipProps {
  project: Project;
  markerPosition: { x: number; y: number };
  mapTransform: { x: number; y: number; scale: number };
  containerRect: DOMRect | null;
  onViewDetails?: () => void;
}

export function ProjectHoverTooltip({ 
  project, 
  markerPosition, 
  mapTransform, 
  containerRect,
  onViewDetails
}: ProjectHoverTooltipProps) {
  if (!containerRect) return null;

  // markerPosition is in map space (2638x1822 coordinate system)
  // The markers are offset by (-455px, -521px) in the map coordinate system
  // So we need to account for this offset before applying the transform
  const mapOffset = { x: -455, y: -521 };
  
  // Calculate screen position:
  // 1. Add the offset to marker position (still in map space)
  // 2. Apply scale transformation
  // 3. Add the pan transformation
  const screenX = (markerPosition.x + mapOffset.x) * mapTransform.scale + mapTransform.x;
  const screenY = (markerPosition.y + mapOffset.y) * mapTransform.scale + mapTransform.y;

  // Position tooltip above the marker with centered alignment
  // On mobile, use smaller width for better fit
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cardWidth = isMobile ? Math.min(280, containerRect.width - 40) : 280; // Responsive width on mobile
  const tooltipHeight = isMobile ? 400 : 340; // Account for CTA button on mobile
  const tooltipOffset = 20; // Additional spacing above the marker
  
  // Center horizontally on the marker, position above
  const tooltipX = screenX - (cardWidth / 2);
  const tooltipY = screenY - tooltipHeight - tooltipOffset;

  // Check if tooltip would go off screen and adjust accordingly
  const horizontalPadding = isMobile ? 10 : 20;
  const adjustedX = Math.max(horizontalPadding, Math.min(tooltipX, containerRect.width - cardWidth - horizontalPadding));
  const adjustedY = Math.max(20, tooltipY);

  return (
    <div
      className="absolute md:z-50 z-[55] hover:md:pointer-events-none pointer-events-auto md:pointer-events-none hover-tooltip"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        width: `${cardWidth}px`,
      }}
    >
      {/* Unified Preview Card Container */}
      <div className="relative animate-fade-in touch-smooth">
        {/* Hero Image */}
        <div 
          className="w-full aspect-[4/3] overflow-hidden rounded-t-lg bg-gray-200 shadow-lg"
        >
          {project.imageUrl && (
            <ImageWithFallback
              src={project.imageUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Dark Text Area - seamlessly connected to image */}
        <div className="bg-[#2d3748] bg-opacity-95 backdrop-blur-sm text-white px-5 py-4 rounded-b-lg shadow-lg space-y-2 md:pb-4 pb-3">
          {/* Project Title - Bold and larger (Top) */}
          <h3 className="font-['Arvo',_serif] text-[15px] leading-tight text-white line-clamp-2 font-bold">
            {project.name}
          </h3>
          
          {/* Organization Name - Regular weight (Middle) */}
          <p className="font-['Arvo',_serif] text-[13px] leading-tight text-white text-opacity-90">
            {project.organization}
          </p>
          
          {/* Convocatoria Badge */}
          {project.convocatoria && (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[10px] font-['Arvo',_serif] ${getConvocatoriaBadgeClass(project.convocatoria)}`}>
                📅 {project.convocatoria}
              </span>
            </div>
          )}
          
          {/* Location Info with pin icon (Bottom) */}
          <div className="flex items-start gap-1.5 pt-1">
            <MapPin className="w-3 h-3 text-white text-opacity-70 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-['Arvo',_serif] text-[11px] leading-tight text-white text-opacity-70">
                {project.location.state}
                {project.location.city && `, ${project.location.city}`}
              </p>
              {project.isNationalProject ? (
                <p className="font-['Arvo',_serif] text-[10px] leading-tight text-yellow-300 text-opacity-90 mt-1 font-bold">
                  🇲🇽 Impacto Nacional
                </p>
              ) : project.implementationStates && project.implementationStates.length > 0 ? (
                <p className="font-['Arvo',_serif] text-[10px] leading-tight text-yellow-300 text-opacity-90 mt-1">
                  También en: {project.implementationStates.join(', ')}
                </p>
              ) : null}
            </div>
          </div>
          
          {/* Mobile-only hint text */}
          {onViewDetails && (
            <p className="md:hidden mt-2 text-xs text-white text-opacity-60 text-center font-['Arvo',_serif]">
              Toca para ver más información
            </p>
          )}
          
          {/* Mobile-only CTA button */}
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="md:hidden mt-2 w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-gray-900 px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 touch-feedback touch-smooth shadow-md animate-cta-pulse"
              style={{
                animation: 'ctaPulse 2s ease-in-out infinite'
              }}
            >
              <span className="font-['Arvo',_serif]">Ver detalles completos</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                className="transition-transform duration-200"
              >
                <path 
                  d="M6 3L11 8L6 13" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        
        {/* Triangular pointer at bottom center of dark tag */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full md:block hidden">
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-transparent border-t-[#2d3748] border-opacity-95"></div>
        </div>
      </div>
    </div>
  );
}