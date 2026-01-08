import { X, Share2, MapPin, Building2, Calendar } from 'lucide-react';
import { Project } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ShareButton } from './ShareButton';
import { getConvocatoriaBadgeClass } from '../utils/convocatoriaColors';

interface ProjectHeroSectionProps {
  project: Project;
  onClose: () => void;
}

/**
 * Hero section for project detail page
 * Features: Full-width image, project title, metadata, close button, share button
 */
export function ProjectHeroSection({ project, onClose }: ProjectHeroSectionProps) {
  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: `
          linear-gradient(to bottom, 
            rgba(12, 65, 89, 0.6) 0%, 
            rgba(12, 65, 89, 0.8) 50%, 
            rgba(12, 65, 89, 1) 100%
          ),
          url(${project.imageUrl})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#0c4159'
      }}
    >
      {/* Share Button now handled by parent component as fixed overlay - top right */}

      {/* Content - Centered - Mobile optimized padding - Always on top */}
      <div 
        className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-12 lg:px-20 pb-16 sm:pb-20"
        style={{
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Project Badge - Mobile optimized */}
        {project.isNationalProject && (
          <div 
            className="
              mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
              bg-[#ff8012]/20 backdrop-blur-sm
              border border-[#ff8012]/30
              animate-hero-fade-in
            "
          >
            <span className="text-white text-xs sm:text-sm font-['Arvo',_serif]">
              🇲🇽 Impacto Nacional
            </span>
          </div>
        )}

        {/* Project Title - Mobile optimized sizes */}
        <h1 
          className="
            text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl
            text-white text-center
            font-['Arvo',_serif]
            mb-4 sm:mb-6
            max-w-4xl
            leading-tight
            animate-hero-fade-in
          "
          style={{ animationDelay: '100ms' }}
        >
          {project.name}
        </h1>

        {/* Project Metadata - Mobile optimized */}
        <div 
          className="
            flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6
            text-white/90 text-xs sm:text-sm md:text-base
            mb-6 sm:mb-8
            animate-hero-fade-in
            max-w-full px-2
          "
          style={{ animationDelay: '200ms' }}
        >
          {/* Organization */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#ff8012]" />
            <span className="font-['Arvo',_serif]">{project.organization}</span>
          </div>

          {/* State/Location */}
          {!project.isNationalProject && project.state && (
            <>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#ff8012]" />
                <span className="font-['Arvo',_serif]">{project.state}</span>
              </div>
            </>
          )}

          {/* Category */}
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <span className="font-['Arvo',_serif]">
              {project.category
                .replace(/[-/]/g, ' ')
                .charAt(0).toUpperCase() + project.category.replace(/[-/]/g, ' ').slice(1)}
            </span>
          </div>
        </div>

        {/* Convocatoria Badge - centered below metadata */}
        {project.convocatoria && (
          <div className="mb-6 sm:mb-8 animate-hero-fade-in" style={{ animationDelay: '250ms' }}>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-['Arvo',_serif] ${getConvocatoriaBadgeClass(project.convocatoria)} shadow-lg`}>
              📅 {project.convocatoria}
            </span>
          </div>
        )}

        {/* Quick Description */}
        {project.objective && (
          <p 
            className="
              text-white/80 text-center text-base md:text-lg
              max-w-2xl
              line-clamp-3
              font-['Arvo',_serif]
              mb-8
              animate-hero-fade-in
            "
            style={{ animationDelay: '300ms' }}
          >
            {project.objective.substring(0, 200)}
            {project.objective.length > 200 && '...'}
          </p>
        )}

        {/* Scroll indicator */}
        <div 
          className="
            flex flex-col items-center gap-2
            text-white/60 text-sm
            animate-scroll-persuade
          "
          style={{ animationDelay: '500ms' }}
        >
          <span className="font-['Arvo',_serif]">Desliza para explorar</span>
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </div>
      </div>

      {/* Bottom gradient fade to cards */}
      <div 
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '128px',
          background: 'linear-gradient(to top, rgba(12, 65, 89, 1) 0%, rgba(12, 65, 89, 0) 100%)',
          zIndex: 15,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}