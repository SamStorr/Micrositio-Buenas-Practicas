import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Project, FilterState } from '../types';
import { projects as initialProjectsData } from '../data/projects';
import * as api from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface ProjectContextType {
  projects: Project[];
  filteredProjects: Project[];
  filters: FilterState;
  selectedProject: Project | null;
  showFullDetails: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedProject: (project: Project | null) => void;
  setShowFullDetails: (show: boolean) => void;
  resetFilters: () => void;
  addProject: (project: Project) => void;
  clearAllProjects: () => void;
  removeProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const initialFilters: FilterState = {
  searchQuery: '',
  selectedCategories: [],
  selectedThematicAreas: [],
  selectedLocations: []
};

// LocalStorage keys for migration
const PROJECTS_STORAGE_KEY = 'mexico-social-projects';
const MIGRATION_FLAG_KEY = 'projects-migrated-to-supabase';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFiltersState] = useState<FilterState>(initialFilters);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFullDetails, setShowFullDetails] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  /**
   * Load projects from Supabase on mount
   * Also handles migration from localStorage
   */
  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setIsLoading(true);
        
        // Check if we need to migrate from localStorage
        const hasMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
        
        if (!hasMigrated) {
          console.log('🔄 First-time setup: Migrating projects to cloud storage...');
          await migrateFromLocalStorage();
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        }
        
        // Fetch projects from server
        const serverProjects = await api.fetchProjects();
        
        if (mounted) {
          if (serverProjects.length > 0) {
            console.log(`✅ Loaded ${serverProjects.length} projects from cloud`);
            // Ensure all projects without convocatoria get "Primera Convocatoria 2025"
            const migratedProjects = serverProjects.map(project => ({
              ...project,
              convocatoria: project.convocatoria || 'Primera Convocatoria 2025'
            }));
            setProjects(migratedProjects);
          } else {
            // If no projects on server, initialize with sample data
            console.log('📦 Initializing with sample projects...');
            await initializeWithSampleData();
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        if (mounted) {
          toast.error('Failed to load projects. Please refresh the page.');
          // Fallback to initial data with convocatoria
          const migratedProjects = initialProjectsData.map(project => ({
            ...project,
            convocatoria: project.convocatoria || 'Primera Convocatoria 2025'
          }));
          setProjects(migratedProjects);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Migrate projects from localStorage to Supabase
   */
  async function migrateFromLocalStorage() {
    try {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      
      if (stored) {
        const localProjects = JSON.parse(stored);
        
        if (Array.isArray(localProjects) && localProjects.length > 0) {
          console.log(`📤 Migrating ${localProjects.length} projects from local storage...`);
          await api.bulkImportProjects(localProjects);
          console.log('✅ Migration complete!');
          toast.success(`Successfully synced ${localProjects.length} projects to cloud`);
          return;
        }
      }
      
      // No local projects found, use initial data
      console.log('No local projects to migrate, will use sample data');
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      toast.error('Failed to migrate local projects');
    }
  }

  /**
   * Initialize with sample data
   */
  async function initializeWithSampleData() {
    try {
      console.log('Importing sample data to cloud...');
      await api.bulkImportProjects(initialProjectsData);
      const serverProjects = await api.fetchProjects();
      setProjects(serverProjects);
      toast.success('Sample projects loaded successfully');
    } catch (error) {
      console.error('Error initializing sample data:', error);
      // Fallback to local sample data
      setProjects(initialProjectsData);
    }
  }

  /**
   * Add or update a project (with cloud sync)
   */
  const addProject = async (project: Project) => {
    try {
      setIsSyncing(true);
      
      // Optimistic update
      setProjects(prev => {
        const existingIndex = prev.findIndex(p => p.id === project.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = project;
          return updated;
        } else {
          return [...prev, project];
        }
      });
      
      // Sync to server
      await api.saveProject(project);
      
      toast.success(
        project.id ? 'Project updated successfully' : 'Project created successfully'
      );
    } catch (error) {
      console.error('Error adding/updating project:', error);
      toast.error('Failed to save project. Please try again.');
      
      // Revert optimistic update by refetching
      try {
        const serverProjects = await api.fetchProjects();
        setProjects(serverProjects);
      } catch (refetchError) {
        console.error('Error refetching projects:', refetchError);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Remove a project (with cloud sync)
   */
  const removeProject = async (projectId: string) => {
    try {
      setIsSyncing(true);
      
      // Optimistic update
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      
      // Sync to server
      await api.deleteProject(projectId);
      
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Failed to delete project. Please try again.');
      
      // Revert optimistic update by refetching
      try {
        const serverProjects = await api.fetchProjects();
        setProjects(serverProjects);
      } catch (refetchError) {
        console.error('Error refetching projects:', refetchError);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Clear all projects (with cloud sync)
   */
  const clearAllProjects = async () => {
    try {
      setIsSyncing(true);
      
      // Optimistic update
      const previousProjects = projects;
      setProjects([]);
      setSelectedProject(null);
      
      // Sync to server
      const deletedCount = await api.clearAllProjects();
      
      toast.success(`Deleted ${deletedCount} projects`);
    } catch (error) {
      console.error('Error clearing projects:', error);
      toast.error('Failed to clear projects. Please try again.');
      
      // Revert optimistic update by refetching
      try {
        const serverProjects = await api.fetchProjects();
        setProjects(serverProjects);
      } catch (refetchError) {
        console.error('Error refetching projects:', refetchError);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(initialFilters);
  };

  // Memoize filtered projects to prevent unnecessary recalculations
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(query);
        const matchesDescription = (project.description || '').toLowerCase().includes(query);
        const locationCity = project.location?.city || project.municipality || '';
        const locationState = project.location?.state || project.state || '';
        const matchesLocation = `${locationCity} ${locationState}`.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Category filter
      if (filters.selectedCategories.length > 0) {
        if (!filters.selectedCategories.includes(project.category)) {
          return false;
        }
      }

      // Thematic area filter
      if (filters.selectedThematicAreas.length > 0) {
        if (!filters.selectedThematicAreas.includes(project.thematicArea)) {
          return false;
        }
      }

      // Location filter (by state)
      if (filters.selectedLocations.length > 0) {
        const projectState = project.location?.state || project.state || '';
        if (!filters.selectedLocations.includes(projectState)) {
          return false;
        }
      }

      return true;
    });
  }, [projects, filters]);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      projects,
      filteredProjects,
      filters,
      selectedProject,
      showFullDetails,
      isLoading,
      isSyncing,
      setFilters,
      setSelectedProject,
      setShowFullDetails,
      resetFilters,
      addProject,
      clearAllProjects,
      removeProject
    }),
    [projects, filteredProjects, filters, selectedProject, showFullDetails, isLoading, isSyncing]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}