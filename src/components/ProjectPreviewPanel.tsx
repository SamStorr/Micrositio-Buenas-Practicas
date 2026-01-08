import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Target, Triangle } from 'lucide-react';
import { Project } from '../types';
import { categoryOptions, thematicAreaOptions } from '../data/projects';
import { useProjects } from '../contexts/ProjectContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ShareButton } from './ShareButton';
import { getConvocatoriaBadgeClass } from '../utils/convocatoriaColors';

interface ProjectPreviewPanelProps {
  project: Project;
  onClose: () => void;
}

// Helper function to format URL to display format (www.example.com)
const formatWebsiteUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove 'www.' prefix if it exists for cleaner display, then add it back
    let hostname = urlObj.hostname;
    // If hostname doesn't start with www., add it
    if (!hostname.startsWith('www.')) {
      hostname = 'www.' + hostname;
    }
    return hostname;
  } catch {
    // If URL parsing fails, try to extract domain manually
    const cleaned = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return cleaned.startsWith('www.') ? cleaned : 'www.' + cleaned;
  }
};

// Memoize to prevent re-renders when hovering different projects
export const ProjectPreviewPanel = memo(function ProjectPreviewPanel({ project, onClose }: ProjectPreviewPanelProps) {
  const navigate = useNavigate();
  const { setShowFullDetails } = useProjects();
  const categoryLabel = categoryOptions.find(c => c.value === project.category)?.label || project.category;
  const thematicAreaLabel = thematicAreaOptions.find(t => t.value === project.thematicArea)?.label || project.thematicArea;

  const handleViewFullDetails = () => {
    navigate(`/proyecto/${project.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:flex-row">
      {/* Background overlay - subtle blur without dark tint - Hidden on mobile for full screen experience */}
      <div 
        className="hidden sm:block flex-1 cursor-pointer backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        onClick={onClose}
      />
      
      {/* Side panel - Full screen on mobile, side panel on desktop */}
      <div className="w-full h-full sm:w-[420px] md:w-[480px] sm:h-auto bg-[#1a202c] text-white overflow-y-auto shadow-2xl flex flex-col animate-slide-in-right">
        {/* Hero Image Header - Responsive height */}
        <div className="relative w-full h-[280px] sm:h-[280px] bg-gray-800 flex-shrink-0">
          {project.imageUrl && (
            <ImageWithFallback
              src={project.imageUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Top right buttons - Matching ProjectDetailPage style */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-3 sm:p-4 md:p-6">
            {/* Close button - Top Left - Matching ProjectDetailPage */}
            <button
              onClick={onClose}
              className="
                w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 
                rounded-full bg-white/90 backdrop-blur-sm text-[#0c4159] 
                hover:bg-white active:scale-95 
                transition-all duration-300 ease-in-out
                shadow-lg hover:shadow-xl 
                flex items-center justify-center group
              "
              aria-label="Cerrar panel"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:scale-110"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Share button - Top Right - Matching ProjectDetailPage */}
            <ShareButton project={project} variant="hero" />
          </div>
        </div>

        {/* Content Area - Mobile optimized padding */}
        <div className="p-4 sm:p-6 flex-1">
          {/* Tags Row - Mobile optimized */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
            {project.category && (
              <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#374151] text-white text-xs rounded-full font-['Arvo',_serif]">
                {categoryLabel}
              </span>
            )}
            {project.thematicArea && (
              <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#374151] text-white text-xs rounded-full font-['Arvo',_serif]">
                {thematicAreaLabel}
              </span>
            )}
            {project.state && (
              <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#374151] text-white text-xs rounded-full font-['Arvo',_serif]">
                {project.state}
              </span>
            )}
          </div>

          {/* Convocatoria Badge */}
          {project.convocatoria && (
            <div className="mb-3 sm:mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-['Arvo',_serif] ${getConvocatoriaBadgeClass(project.convocatoria)}`}>
                📅 {project.convocatoria}
              </span>
            </div>
          )}

          {/* Title Block - Project Title + Organization Name grouped closely - Mobile optimized */}
          <div className="mb-4 sm:mb-5">
            {/* Project Title - Large & Bold - Responsive sizing */}
            <h2 className="font-['Arvo',_serif] text-lg sm:text-[22px] leading-tight text-white mb-2">
              {project.name}
            </h2>

            {/* Organization Name - Regular - Responsive sizing */}
            <p className="font-['Arvo',_serif] text-sm sm:text-[15px] text-white text-opacity-80">
              {project.organization}
            </p>

            {/* Website Link - Discrete and subtle */}
            {project.footerWebsiteUrl && (
              <a
                href={project.footerWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Arvo',_serif] text-xs text-white text-opacity-30 hover:text-opacity-90 hover:text-[#ff8012] transition-colors duration-200 inline-block mt-1.5"
              >
                {formatWebsiteUrl(project.footerWebsiteUrl)}
              </a>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white bg-opacity-20 mb-4 sm:mb-5" />

          {/* Location & Implementation States - Mobile optimized */}
          {(project.location || project.implementationStates) && (
            <div className="mb-4 sm:mb-5">
              {/* Main Location */}
              {project.location && (
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#ff8012] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-['Arvo',_serif] text-xs sm:text-[13px] text-white text-opacity-90">
                      {project.location.state}
                      {project.location.city && `, ${project.location.city}`}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Implementation States - Mobile optimized */}
              {project.isNationalProject ? (
                <div className="mt-3 p-2.5 sm:p-3 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg border-2 border-yellow-400 shadow-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">🇲🇽</span>
                    <div className="flex-1">
                      <p className="font-['Arvo',_serif] text-sm sm:text-base font-bold text-white mb-1">
                        Impacto Nacional
                      </p>
                      <p className="font-['Arvo',_serif] text-[10px] sm:text-[11px] text-white text-opacity-90">
                        Este proyecto se implementa en todos los estados de México
                      </p>
                      <p className="hidden sm:block font-['Arvo',_serif] text-[10px] text-white text-opacity-70 mt-2 italic">
                        Pasa el mouse sobre el pin o mantén el panel abierto para ver todos los estados iluminados en el mapa
                      </p>
                    </div>
                  </div>
                </div>
              ) : project.implementationStates && project.implementationStates.length > 0 ? (
                <div className="mt-3 p-2.5 sm:p-3 bg-[#2d3748] rounded-lg border border-yellow-500 border-opacity-30">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-['Arvo',_serif] text-[10px] sm:text-[11px] uppercase tracking-wider text-yellow-400 mb-1.5">
                        También implementado en:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.implementationStates.map((state, index) => (
                          <span 
                            key={index} 
                            className="px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-300 text-[10px] sm:text-[11px] rounded font-['Arvo',_serif] border border-yellow-500 border-opacity-30"
                          >
                            {state}
                          </span>
                        ))}
                      </div>
                      <p className="hidden sm:block font-['Arvo',_serif] text-[10px] text-white text-opacity-50 mt-2 italic">
                        Pasa el mouse sobre el pin o mantén el panel abierto para ver los estados iluminados en el mapa
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Divider after location section */}
              <div className="w-full h-px bg-white bg-opacity-20 mt-4 sm:mt-5" />
            </div>
          )}

          {/* Summary Section - Mobile optimized */}
          <div>
            {/* Description Summary */}
            <div>
              <h3 className="font-['Arvo',_serif] text-[10px] sm:text-[11px] uppercase tracking-wider text-white text-opacity-60 mb-2">
                Objetivo Principal
              </h3>
              <p className="font-['Arvo',_serif] text-sm sm:text-[14px] leading-relaxed text-white text-opacity-90 line-clamp-3">
                {project.objective}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button - Full width at bottom - Mobile optimized */}
        <div className="p-4 sm:p-6 pt-0 flex-shrink-0 pb-safe">
          <button 
            onClick={handleViewFullDetails}
            className="w-full bg-[#ff8012] hover:bg-[#e67310] active:bg-[#d66810] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-['Arvo',_serif] text-sm sm:text-[15px] transition-all duration-200 shadow-lg hover:shadow-xl active:scale-98 touch-manipulation"
          >
            Explorar Propuesta
          </button>
        </div>
      </div>
    </div>
  );
});