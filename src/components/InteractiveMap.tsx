import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import { ProjectPreviewPanel } from './ProjectPreviewPanel';
import { ProjectHoverTooltip } from './ProjectHoverTooltip';
import { ClusterMarker } from './ClusterMarker';
import { ClusterTooltip } from './ClusterTooltip';
import { Project } from '../types';
import { getCategoryColor } from '../utils/categoryColors';
import { getConvocatoriaColor, registerConvocatorias } from '../utils/convocatoriaColors';
import { clusterMarkers, Cluster } from '../utils/markerClustering';
import { STATE_SVG_IDS } from '../data/stateMapCoordinates';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import svgPaths from "../imports/svg-v5k32ff4er";

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface InteractiveMapProps {
  onInteractionChange?: (isInteracting: boolean) => void;
}

// Memoize component to prevent unnecessary re-renders
export const InteractiveMap = memo(function InteractiveMap({ onInteractionChange }: InteractiveMapProps = {}) {
  const navigate = useNavigate();
  const { 
    filteredProjects, 
    setSelectedProject, 
    selectedProject 
  } = useProjects();
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<Cluster | null>(null);
  const [hoveredMarkerPosition, setHoveredMarkerPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isMobileTooltipVisible, setIsMobileTooltipVisible] = useState(false);
  const [tappedMarkerId, setTappedMarkerId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout>();
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Get the project whose implementation states should be highlighted (hover or selected)
  const highlightedProject = hoveredProject || (showPreview ? previewProject : null);

  // Calculate clusters based on zoom level
  const clusters = useMemo(() => {
    return clusterMarkers(filteredProjects, transform.scale);
  }, [filteredProjects, transform.scale]);

  // Register convocatorias for consistent color assignment
  useEffect(() => {
    const convocatorias = filteredProjects
      .map(p => p.convocatoria)
      .filter((c): c is string => !!c);
    registerConvocatorias(convocatorias);
  }, [filteredProjects]);

  // Notify parent of map interaction
  const notifyInteraction = useCallback(() => {
    onInteractionChange?.(true);
    
    // Clear existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Set new timeout to mark as not interacting after 300ms
    interactionTimeoutRef.current = setTimeout(() => {
      onInteractionChange?.(false);
    }, 300);
  }, [onInteractionChange]);

  // Auto-hide tooltip after 3 seconds of hovering
  useEffect(() => {
    if (!hoveredCluster) return;

    const timeout = setTimeout(() => {
      setHoveredCluster(null);
    }, 3000); // Hide after 3 seconds

    return () => clearTimeout(timeout);
  }, [hoveredCluster]);



  // Detect if device supports hover (not a touch device)
  const isHoverDevice = useCallback(() => {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  // Handle mobile tap on marker - show tooltip
  const handleMarkerTap = useCallback((project: Project, markerX: number, markerY: number, e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default to avoid triggering other events
    e.stopPropagation();
    
    if (!isHoverDevice()) {
      // On mobile: tap to show/hide tooltip
      if (tappedMarkerId === project.id) {
        // Already showing tooltip for this marker, tapping again opens details
        handleMarkerClick(project);
      } else {
        // Show tooltip for this marker
        setTappedMarkerId(project.id);
        setHoveredProject(project);
        setHoveredMarkerPosition({ x: markerX, y: markerY });
        setIsMobileTooltipVisible(true);
        
        // Auto-hide after 4 seconds
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
        tooltipTimeoutRef.current = setTimeout(() => {
          setTappedMarkerId(null);
          setHoveredProject(null);
          setHoveredMarkerPosition(null);
          setIsMobileTooltipVisible(false);
        }, 4000);
      }
    }
  }, [tappedMarkerId, isHoverDevice]);

  // Handle clicking outside to close mobile tooltip
  const handleMapClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isHoverDevice() && isMobileTooltipVisible) {
      // Close tooltip when tapping on map (not on a marker)
      setTappedMarkerId(null);
      setHoveredProject(null);
      setHoveredMarkerPosition(null);
      setIsMobileTooltipVisible(false);
      
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    }
  }, [isMobileTooltipVisible, isHoverDevice]);

  // Sync context's selectedProject with local preview state
  // This allows external components (like SearchFilterBar) to open the preview panel
  useEffect(() => {
    if (selectedProject) {
      setPreviewProject(selectedProject);
      setShowPreview(true);
    } else if (!selectedProject && showPreview) {
      // Only close if there's no selected project and preview is showing
      setShowPreview(false);
      setPreviewProject(null);
    }
  }, [selectedProject]);

  // Utility function to calculate and apply pan boundaries
  const constrainToBounds = useCallback((x: number, y: number, scale: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    
    // The map structure:
    // - Outer container: 2638px × 1822px positioned at left: -455px, top: -521px
    // - This creates a visible map area starting from the offsets
    const mapWidth = 2638;
    const mapHeight = 1822;
    const mapOffsetX = 455; // How much the map extends to the left
    const mapOffsetY = 521; // How much the map extends to the top
    
    // Calculate the actual boundaries based on the blue background
    // When scale = 1, the map should show the blue area properly positioned
    const scaledMapWidth = mapWidth * scale;
    const scaledMapHeight = mapHeight * scale;
    const scaledOffsetX = mapOffsetX * scale;
    const scaledOffsetY = mapOffsetY * scale;
    
    // Boundary calculations:
    // The map can be panned such that:
    // - The leftmost content (at -455px when scaled) doesn't go beyond the right edge of viewport
    // - The rightmost content doesn't go beyond the left edge of viewport  
    // - The topmost content (at -521px when scaled) doesn't go beyond the bottom edge of viewport
    // - The bottommost content doesn't go beyond the top edge of viewport
    
    const minX = rect.width - scaledMapWidth; // Don't let right edge of map go past left edge of viewport
    const maxX = scaledOffsetX; // Don't let left edge of map go past right edge of viewport
    const minY = rect.height - scaledMapHeight; // Don't let bottom edge of map go past top edge of viewport  
    const maxY = scaledOffsetY; // Don't let top edge of map go past bottom edge of viewport
    
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }, []);

  // Center map on initial load
  useEffect(() => {
    const centerMap = () => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Calculate optimal initial scale to show whole map centered
      const mapWidth = 2638;
      const mapHeight = 1822;
      const mapOffsetX = 455;
      const mapOffsetY = 521;
      const effectiveMapWidth = mapWidth - mapOffsetX;
      const effectiveMapHeight = mapHeight - mapOffsetY;
      const scaleToFitWidth = rect.width / effectiveMapWidth;
      const scaleToFitHeight = rect.height / effectiveMapHeight;
      const optimalScale = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.95; // 0.95 for slight padding
      const initialScale = Math.max(optimalScale, 0.6);
      
      // Center the map horizontally and vertically
      const centerX = (rect.width - effectiveMapWidth * initialScale) / 2;
      const centerY = (rect.height - effectiveMapHeight * initialScale) / 2;
      
      // Apply constraints to keep within bounds
      const constrainedPosition = constrainToBounds(centerX, centerY, initialScale);
      
      setTransform({ 
        x: constrainedPosition.x, 
        y: constrainedPosition.y, 
        scale: initialScale 
      });
    };

    // Slight delay to ensure mapRef is ready
    const timer = setTimeout(centerMap, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [constrainToBounds]); // Run only on mount

  const handleMarkerClick = (project: Project) => {
    setPreviewProject(project);
    setSelectedProject(project);
    setShowPreview(true);
  };

  const handleClusterClick = (cluster: Cluster) => {
    // Hide the tooltip immediately when clicking
    setHoveredCluster(null);
    
    // If cluster has only one project, open it directly
    if (cluster.projects.length === 1) {
      handleMarkerClick(cluster.projects[0]);
      return;
    }

    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    // The cluster coordinates are in map space (0-2638, 0-1822)
    // But the markers container is offset by (-455, -521)
    const mapOffsetX = 455;
    const mapOffsetY = 521;
    
    // Calculate the actual position of the cluster accounting for the offset
    const actualClusterX = cluster.x - mapOffsetX;
    const actualClusterY = cluster.y - mapOffsetY;

    // More aggressive zoom to better separate clustered markers
    const newScale = Math.min(transform.scale * 2.5, 3);
    
    // Calculate the new transform to center the cluster
    // We want: actualClusterX * newScale + newX = rect.width / 2
    // Solving for newX: newX = rect.width / 2 - actualClusterX * newScale
    const newX = rect.width / 2 - actualClusterX * newScale;
    const newY = rect.height / 2 - actualClusterY * newScale;
    
    const constrainedPosition = constrainToBounds(newX, newY, newScale);
    setTransform({
      x: constrainedPosition.x,
      y: constrainedPosition.y,
      scale: newScale
    });
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewProject(null);
    setSelectedProject(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.project-marker')) {
      return; // Don't start dragging if clicking on a marker
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    notifyInteraction();
    const rawNewX = e.clientX - dragStart.x;
    const rawNewY = e.clientY - dragStart.y;
    
    const constrainedPosition = constrainToBounds(rawNewX, rawNewY, transform.scale);
    
    setTransform(prev => ({
      ...prev,
      x: constrainedPosition.x,
      y: constrainedPosition.y
    }));
  }, [isDragging, dragStart, transform.scale, constrainToBounds, notifyInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    notifyInteraction();
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Calculate minimum scale to fit the whole map
    // Map dimensions: 2638px × 1822px, positioned at left: -455px, top: -521px
    const mapWidth = 2638;
    const mapHeight = 1822;
    const mapOffsetX = 455;
    const mapOffsetY = 521;
    
    // Effective visible map dimensions
    const effectiveMapWidth = mapWidth - mapOffsetX;
    const effectiveMapHeight = mapHeight - mapOffsetY;
    
    // Calculate scale needed to fit map in viewport (with some padding)
    const scaleToFitWidth = rect.width / effectiveMapWidth;
    const scaleToFitHeight = rect.height / effectiveMapHeight;
    const minZoomScale = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9; // 0.9 for slight padding
    
    // Ensure minimum zoom doesn't go below what shows the whole map
    const absoluteMinZoom = Math.max(minZoomScale, 0.6);
    
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, absoluteMinZoom), 3);
    
    const rawNewX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const rawNewY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
    const constrainedPosition = constrainToBounds(rawNewX, rawNewY, newScale);
    
    setTransform({
      x: constrainedPosition.x,
      y: constrainedPosition.y,
      scale: newScale
    });
  }, [transform, constrainToBounds, notifyInteraction]);

  // Touch event handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    notifyInteraction();
    if (e.touches.length === 1) {
      // Single touch - start dragging
      if ((e.target as HTMLElement).closest('.project-marker')) {
        return;
      }
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y });
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      setIsDragging(false);
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    }
  }, [transform, notifyInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    notifyInteraction();
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const rawNewX = e.touches[0].clientX - dragStart.x;
      const rawNewY = e.touches[0].clientY - dragStart.y;
      
      const constrainedPosition = constrainToBounds(rawNewX, rawNewY, transform.scale);
      
      setTransform(prev => ({
        ...prev,
        x: constrainedPosition.x,
        y: constrainedPosition.y
      }));
    } else if (e.touches.length === 2 && lastTouchDistance) {
      // Pinch zoom
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentDistance = getTouchDistance(e.touches);
      if (!currentDistance) return;

      const scaleFactor = currentDistance / lastTouchDistance;
      const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.6), 3);

      // Get center point between two touches
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      const rawNewX = centerX - (centerX - transform.x) * (newScale / transform.scale);
      const rawNewY = centerY - (centerY - transform.y) * (newScale / transform.scale);

      const constrainedPosition = constrainToBounds(rawNewX, rawNewY, newScale);

      setTransform({
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        scale: newScale
      });

      setLastTouchDistance(currentDistance);
    }
  }, [isDragging, dragStart, transform, lastTouchDistance, constrainToBounds, notifyInteraction]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouchDistance(null);
  }, []);

  // Get highlighted state IDs based on implementation states
  const getHighlightedStateIds = (): Set<string> => {
    if (!highlightedProject) return new Set();
    
    const stateIds = new Set<string>();
    
    // If it's a national project, highlight all states
    if (highlightedProject.isNationalProject) {
      Object.values(STATE_SVG_IDS).forEach((stateId) => {
        if (stateId) {
          stateIds.add(stateId as string);
        }
      });
      return stateIds;
    }
    
    // Otherwise, highlight only implementation states
    if (highlightedProject.implementationStates) {
      highlightedProject.implementationStates.forEach(stateName => {
        const stateId = STATE_SVG_IDS[stateName];
        if (stateId) {
          stateIds.add(stateId);
        }
      });
    }
    
    return stateIds;
  };

  const highlightedStateIds = getHighlightedStateIds();

  // Features component from the imported Figma design
  function Features() {
    return (
      <div className="absolute inset-[4.54%_4.55%_4.57%_4.55%]" data-name="features">
        <div className="absolute inset-[-0.02%_-0.01%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2400 1658">
            <g id="features">
              <path d={svgPaths.p282afa00} fill={highlightedStateIds.has('MXSON') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXSON" stroke={highlightedStateIds.has('MXSON') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXSON') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXSON') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p8de2500} fill={highlightedStateIds.has('MXBCN') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXBCN" stroke={highlightedStateIds.has('MXBCN') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXBCN') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXBCN') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p3253b780} fill={highlightedStateIds.has('MXCHH') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCHH" stroke={highlightedStateIds.has('MXCHH') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCHH') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCHH') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2da1a600} fill={highlightedStateIds.has('MXCOA') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCOA" stroke={highlightedStateIds.has('MXCOA') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCOA') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCOA') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2f46e800} fill={highlightedStateIds.has('MXTAM') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXTAM" stroke={highlightedStateIds.has('MXTAM') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXTAM') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXTAM') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p38eb17b0} fill={highlightedStateIds.has('MXNLE') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXNLE" stroke={highlightedStateIds.has('MXNLE') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXNLE') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXNLE') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p1b2b9b00} fill={highlightedStateIds.has('MXROO') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXROO" stroke={highlightedStateIds.has('MXROO') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXROO') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXROO') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.pe0b2e80} fill={highlightedStateIds.has('MXCAM') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCAM" stroke={highlightedStateIds.has('MXCAM') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCAM') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCAM') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p31270280} fill={highlightedStateIds.has('MXTAB') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXTAB" stroke={highlightedStateIds.has('MXTAB') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXTAB') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXTAB') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2f5800c0} fill={highlightedStateIds.has('MXCHP') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCHP" stroke={highlightedStateIds.has('MXCHP') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCHP') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCHP') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p3709c380} fill={highlightedStateIds.has('MXCOL') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCOL" stroke={highlightedStateIds.has('MXCOL') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCOL') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCOL') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2b241f80} fill={highlightedStateIds.has('MXNAY') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXNAY" stroke={highlightedStateIds.has('MXNAY') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXNAY') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXNAY') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p24a5a00} fill={highlightedStateIds.has('MXBCS') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXBCS" stroke={highlightedStateIds.has('MXBCS') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXBCS') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXBCS') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p20579e00} fill={highlightedStateIds.has('MXSIN') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXSIN" stroke={highlightedStateIds.has('MXSIN') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXSIN') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXSIN') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p3df966c0} fill={highlightedStateIds.has('MXYUC') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXYUC" stroke={highlightedStateIds.has('MXYUC') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXYUC') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXYUC') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p7b69280} fill={highlightedStateIds.has('MXVER') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXVER" stroke={highlightedStateIds.has('MXVER') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXVER') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXVER') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.pf594e80} fill={highlightedStateIds.has('MXJAL') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXJAL" stroke={highlightedStateIds.has('MXJAL') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXJAL') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXJAL') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p37a8880} fill={highlightedStateIds.has('MXMIC') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXMIC" stroke={highlightedStateIds.has('MXMIC') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXMIC') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXMIC') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p210f4000} fill={highlightedStateIds.has('MXGRO') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXGRO" stroke={highlightedStateIds.has('MXGRO') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXGRO') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXGRO') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p36ce1e00} fill={highlightedStateIds.has('MXOAX') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXOAX" stroke={highlightedStateIds.has('MXOAX') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXOAX') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXOAX') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p1a4ea820} fill={highlightedStateIds.has('MXMEX') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXMEX" stroke={highlightedStateIds.has('MXMEX') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXMEX') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXMEX') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p15f9d880} fill={highlightedStateIds.has('MXPUE') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXPUE" stroke={highlightedStateIds.has('MXPUE') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXPUE') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXPUE') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p38919bf0} fill={highlightedStateIds.has('MXMOR') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXMOR" stroke={highlightedStateIds.has('MXMOR') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXMOR') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXMOR') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p3e4afa80} fill={highlightedStateIds.has('MXQUE') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXQUE" stroke={highlightedStateIds.has('MXQUE') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXQUE') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXQUE') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2cfb2d00} fill={highlightedStateIds.has('MXHID') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXHID" stroke={highlightedStateIds.has('MXHID') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXHID') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXHID') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p92bf200} fill={highlightedStateIds.has('MXGUA') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXGUA" stroke={highlightedStateIds.has('MXGUA') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXGUA') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXGUA') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p262c7600} fill={highlightedStateIds.has('MXSLP') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXSLP" stroke={highlightedStateIds.has('MXSLP') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXSLP') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXSLP') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p3ca23580} fill={highlightedStateIds.has('MXZAC') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXZAC" stroke={highlightedStateIds.has('MXZAC') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXZAC') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXZAC') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p32b46e00} fill={highlightedStateIds.has('MXAGU') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXAGU" stroke={highlightedStateIds.has('MXAGU') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXAGU') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXAGU') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p28fa54f0} fill={highlightedStateIds.has('MXDUR') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXDUR" stroke={highlightedStateIds.has('MXDUR') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXDUR') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXDUR') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p2826ee80} fill={highlightedStateIds.has('MXTLA') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXTLA" stroke={highlightedStateIds.has('MXTLA') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXTLA') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXTLA') ? 'transition-all duration-300' : ''} />
              <path d={svgPaths.p10649200} fill={highlightedStateIds.has('MXCMX') ? 'rgba(251, 191, 36, 0.25)' : '#0E5271'} id="MXCMX" stroke={highlightedStateIds.has('MXCMX') ? '#FCD34D' : '#8FA1A9'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={highlightedStateIds.has('MXCMX') ? '1.5' : '0.5'} className={highlightedStateIds.has('MXCMX') ? 'transition-all duration-300' : ''} />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // Map container with Figma design
  function Mx1() {
    return (
      <div className="absolute bg-[#0c4159] h-[1822px] left-[-455px] overflow-clip top-[-521px] w-[2638px]" data-name="mx 1">
        <Features />
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop overlay - positioned outside main container for proper layering */}
      {isMobileTooltipVisible && !isHoverDevice() && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-15 z-[25] animate-fade-in pointer-events-auto"
          onClick={handleMapClick}
        />
      )}
      
      <div className="relative w-full h-full overflow-hidden touch-none bg-[#0c4159]">
        <div
          ref={mapRef}
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none bg-[#0c4159]`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleMapClick}
          onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Map content with transform */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="w-full h-full"
        >
          {/* Figma imported map */}
          <div className="relative size-full bg-[#0c4159]">
            <Mx1 />
            
            {/* Project markers and clusters overlay - positioned relative to map's fixed dimensions */}
            <div className="absolute" style={{ width: '2638px', height: '1822px', left: '-455px', top: '-521px' }}>
              {/* Cluster tooltip - rendered inside the transformed container */}
              {hoveredCluster && hoveredCluster.projects.length > 1 && (
                <ClusterTooltip
                  cluster={hoveredCluster}
                  position={{
                    x: hoveredCluster.x,
                    y: hoveredCluster.y
                  }}
                  scale={transform.scale}
                />
              )}
              
              {/* Render clusters */}
              {clusters.map((cluster, index) => {
                // If cluster has multiple projects, render as cluster
                if (cluster.projects.length > 1) {
                  return (
                    <ClusterMarker
                      key={cluster.id}
                      cluster={cluster}
                      scale={transform.scale}
                      onClick={() => handleClusterClick(cluster)}
                      onMouseEnter={() => setHoveredCluster(cluster)}
                      onMouseLeave={() => setHoveredCluster(null)}
                      isHovered={hoveredCluster?.id === cluster.id}
                    />
                  );
                }

                // Single project in cluster - render as individual marker
                const project = cluster.projects[0];
                const isHovered = hoveredProject?.id === project.id;
                const convocatoriaColor = getConvocatoriaColor(project.convocatoria);
                
                // Convert percentage coordinates to absolute pixel coordinates
                // relative to the map's fixed size (2638px × 1822px)
                let markerX: number, markerY: number;
                
                if (project.location && typeof project.location.x === 'number') {
                  // Convert percentage to pixels relative to map size
                  markerX = (project.location.x / 100) * 2638;
                  markerY = (project.location.y / 100) * 1822;
                } else {
                  // Fallback to center of map if no location data
                  markerX = 2638 / 2;
                  markerY = 1822 / 2;
                }
                
                return (
                  <div
                    key={project.id}
                    className="project-marker absolute transform -translate-x-1/2 -translate-y-1/2 z-10 animate-marker-appear"
                    style={{ 
                      left: `${markerX}px`, 
                      top: `${markerY}px`,
                      animationDelay: `${index * 0.02}s`
                    }}
                  >
                    {/* Hover effect background - uses convocatoria color */}
                    {isHovered && (
                      <div 
                        className="absolute inset-0 w-8 h-8 rounded-full opacity-60 animate-pulse-glow transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                          backgroundColor: convocatoriaColor.glow,
                          boxShadow: `0 0 20px ${convocatoriaColor.glow}`
                        }}
                      />
                    )}
                    
                    {/* Main marker - convocatoria colored with smooth animations */}
                    <div
                      className="relative cursor-pointer touch-feedback touch-smooth mobile-tap-target"
                      style={{
                        transform: `scale(${1 / transform.scale}) scale(1)`,
                        transformOrigin: 'center',
                        filter: isHovered ? `drop-shadow(0 0 6px ${convocatoriaColor.glow})` : 'none'
                      }}
                      onClick={() => {
                        // On hover devices, clicking opens details immediately
                        if (isHoverDevice()) {
                          handleMarkerClick(project);
                        }
                      }}
                      onTouchEnd={(e) => handleMarkerTap(project, markerX, markerY, e)}
                      onMouseEnter={() => {
                        // Only show hover tooltip on hover-capable devices
                        if (isHoverDevice()) {
                          setHoveredProject(project);
                          setHoveredMarkerPosition({ x: markerX, y: markerY });
                        }
                      }}
                      onMouseLeave={() => {
                        if (isHoverDevice()) {
                          setHoveredProject(null);
                          setHoveredMarkerPosition(null);
                        }
                      }}
                    >
                      <div className="transform hover:scale-125 active:scale-110 transition-transform duration-200">
                        <svg width="20" height="20" viewBox="0 0 14 14" fill="none" className="transition-all duration-300">
                          {/* Outer pin shape */}
                          <path 
                            d={svgPaths.p1a33c0f0} 
                            fill={isHovered ? convocatoriaColor.hover : convocatoriaColor.primary}
                            className="transition-colors duration-300"
                            style={{
                              filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`
                            }}
                          />
                          {/* Inner circle */}
                          <circle 
                            cx="6.99994" 
                            cy="7.00001" 
                            fill="white"
                            r="2.17647" 
                            className="transition-all duration-300"
                            style={{
                              opacity: isHovered ? 1 : 0.9
                            }}
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={() => {
            notifyInteraction();
            const newScale = Math.min(transform.scale * 1.2, 3);
            const constrainedPosition = constrainToBounds(transform.x, transform.y, newScale);
            setTransform({ 
              x: constrainedPosition.x, 
              y: constrainedPosition.y, 
              scale: newScale 
            });
          }}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 w-12 h-12 md:w-10 md:h-10 rounded-lg shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 touch-feedback touch-smooth"
        >
          +
        </button>
        <button
          onClick={() => {
            notifyInteraction();
            const rect = mapRef.current?.getBoundingClientRect();
            if (!rect) return;
            
            // Calculate minimum scale same way as in handleWheel
            const mapWidth = 2638;
            const mapHeight = 1822;
            const mapOffsetX = 455;
            const mapOffsetY = 521;
            const effectiveMapWidth = mapWidth - mapOffsetX;
            const effectiveMapHeight = mapHeight - mapOffsetY;
            const scaleToFitWidth = rect.width / effectiveMapWidth;
            const scaleToFitHeight = rect.height / effectiveMapHeight;
            const minZoomScale = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9;
            const absoluteMinZoom = Math.max(minZoomScale, 0.6);
            
            const newScale = Math.max(transform.scale * 0.8, absoluteMinZoom);
            const constrainedPosition = constrainToBounds(transform.x, transform.y, newScale);
            setTransform({ 
              x: constrainedPosition.x, 
              y: constrainedPosition.y, 
              scale: newScale 
            });
          }}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 w-12 h-12 md:w-10 md:h-10 rounded-lg shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 touch-feedback touch-smooth"
        >
          −
        </button>
        <button
          onClick={() => {
            notifyInteraction();
            const rect = mapRef.current?.getBoundingClientRect();
            if (!rect) return;
            
            // Calculate optimal initial scale to show whole map
            const mapWidth = 2638;
            const mapHeight = 1822;
            const mapOffsetX = 455;
            const mapOffsetY = 521;
            const effectiveMapWidth = mapWidth - mapOffsetX;
            const effectiveMapHeight = mapHeight - mapOffsetY;
            const scaleToFitWidth = rect.width / effectiveMapWidth;
            const scaleToFitHeight = rect.height / effectiveMapHeight;
            const optimalScale = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.95; // 0.95 for slight padding
            const resetScale = Math.max(optimalScale, 0.6);
            
            // Center the map
            const centerX = (rect.width - effectiveMapWidth * resetScale) / 2;
            const centerY = (rect.height - effectiveMapHeight * resetScale) / 2;
            
            const constrainedPosition = constrainToBounds(centerX, centerY, resetScale);
            setTransform({ 
              x: constrainedPosition.x, 
              y: constrainedPosition.y, 
              scale: resetScale 
            });
          }}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-4 py-3 md:px-3 md:py-2 rounded-lg shadow-lg text-sm transition-all duration-200 hover:scale-110 active:scale-95 touch-feedback touch-smooth"
        >
          Reset
        </button>
        
        {/* Admin button */}
        <Button
          onClick={() => navigate('/admin')}
          className="bg-gray-800 hover:bg-gray-900 text-white w-12 h-12 md:w-10 md:h-10 rounded-lg shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 p-0 touch-feedback touch-smooth"
          size="sm"
          title="Admin Panel"
        >
          <Settings className="w-5 h-5 md:w-4 md:h-4" />
        </Button>
      </div>

      {/* Hover tooltip for individual markers */}
      {hoveredProject && hoveredMarkerPosition && (
        <ProjectHoverTooltip
          project={hoveredProject}
          markerPosition={hoveredMarkerPosition}
          mapTransform={transform}
          containerRect={mapRef.current?.getBoundingClientRect() || null}
          onViewDetails={() => {
            // Open the full preview panel on mobile
            handleMarkerClick(hoveredProject);
            // Clear the tooltip
            setTappedMarkerId(null);
            setHoveredProject(null);
            setHoveredMarkerPosition(null);
            setIsMobileTooltipVisible(false);
          }}
        />
      )}

      {/* Project Preview Panel */}
      {showPreview && previewProject && (
        <ProjectPreviewPanel
          project={previewProject}
          onClose={handleClosePreview}
        />
      )}
      </div>
    </>
  );
});