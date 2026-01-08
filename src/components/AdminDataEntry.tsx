import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { X, Plus, Save, Database, Users, LogOut, Search } from 'lucide-react';
import { Project } from '../types';
import { MapCoordinatePicker } from './MapCoordinatePicker';
import { DataExportImport } from './DataExportImport';
import { ImageUploadInput } from './ImageUploadInput';
import { MarkdownEditor } from './MarkdownEditor';
import { STATE_MAP_POSITIONS, generateStateOffset } from '../data/stateMapCoordinates';
import { categoryOptions, thematicAreaOptions } from '../data/projects';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Use the percentage-based map coordinates
const MEXICAN_STATES_COORDS = STATE_MAP_POSITIONS;

interface AdminDataEntryProps {
  onSave: (project: Project) => void;
  onClose: () => void;
  existingProjects: Project[];
  onClearAll: () => void;
  onRemoveProject: (projectId: string) => void;
}

export function AdminDataEntry({ onSave, onClose, existingProjects, onClearAll, onRemoveProject }: AdminDataEntryProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 20;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Helper functions to get labels from values
  const getCategoryLabel = (value: string) => {
    return categoryOptions.find(opt => opt.value === value)?.label || value;
  };
  
  const getThematicAreaLabel = (value: string) => {
    return thematicAreaOptions.find(opt => opt.value === value)?.label || value;
  };
  
  const [formData, setFormData] = useState({
    folio: '',
    name: '',
    organization: '',
    category: '',
    thematicArea: '',
    state: '',
    municipality: '',
    objective: '',
    beneficiaries: '',
    riskFactors: '',
    methodology: '',
    results: '',
    evaluationCriteriaHighlights: '',
    totalScore: '',
    finalRankingPosition: '',
    imageUrl: '',
    // Coordinates (stored internally as numbers but converted for display)
    latitude: '' as string | number,
    longitude: '' as string | number,
    // Section-specific images
    beneficiariesImageUrl: '',
    riskFactorsImageUrl: '',
    methodologyImageUrl: '',
    resultsImageUrl: '',
    // Footer fields
    footerOrganizationName: '',
    footerContactEmail: '',
    footerContactPhone: '',
    footerContactEmail2: '',
    footerContactPhone2: '',
    footerWebsiteUrl: '',
    footerPhysicalAddress: '',
    footerInstagramUrl: '',
    footerFacebookUrl: '',
    footerXUrl: '',
    footerLinkedinUrl: '',
    footerTiktokUrl: '',
    footerYoutubeUrl: '',
    // Map position percentages (stored internally as numbers but converted for display)
    mapX: '' as string | number,
    mapY: '' as string | number,
    // Implementation states
    implementationStates: [] as string[],
    isNationalProject: false,
    // Convocatoria
    convocatoria: 'Primera Convocatoria 2025'
  });

  const generateCoordinates = (state: string, municipality: string) => {
    const statePosition = MEXICAN_STATES_COORDS[state];
    if (!statePosition) {
      return { x: 50, y: 50 }; // Default to center (percentage)
    }
    
    // Add small random offset for multiple projects in the same state
    const projectIndex = existingProjects.filter(p => p.state === state).length;
    return generateStateOffset(statePosition, projectIndex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate or use manual map position
    let mapPosition: { x: number, y: number };
    
    // Check if manual position was set (convert string to number if needed)
    const hasManualPosition = formData.mapX !== '' && formData.mapY !== '';
    
    if (hasManualPosition) {
      // User manually selected position - convert to numbers
      mapPosition = { 
        x: typeof formData.mapX === 'number' ? formData.mapX : parseFloat(formData.mapX as string), 
        y: typeof formData.mapY === 'number' ? formData.mapY : parseFloat(formData.mapY as string)
      };
    } else {
      // Auto-generate based on state
      mapPosition = generateCoordinates(formData.state, formData.municipality);
    }
    
    const newProject: Project = {
      id: formData.folio,
      name: formData.name,
      organization: formData.organization,
      category: formData.category,
      thematicArea: formData.thematicArea,
      state: formData.state,
      municipality: formData.municipality,
      objective: formData.objective,
      beneficiaries: formData.beneficiaries,
      riskFactors: formData.riskFactors,
      methodology: formData.methodology,
      results: formData.results,
      evaluationCriteriaHighlights: formData.evaluationCriteriaHighlights,
      totalScore: parseInt(formData.totalScore) || 0,
      finalRankingPosition: parseInt(formData.finalRankingPosition) || undefined,
      imageUrl: formData.imageUrl,
      latitude: undefined, // Not used with percentage system
      longitude: undefined, // Not used with percentage system
      // Section-specific images
      beneficiariesImageUrl: formData.beneficiariesImageUrl || undefined,
      riskFactorsImageUrl: formData.riskFactorsImageUrl || undefined,
      methodologyImageUrl: formData.methodologyImageUrl || undefined,
      resultsImageUrl: formData.resultsImageUrl || undefined,
      // Footer fields
      footerOrganizationName: formData.footerOrganizationName || undefined,
      footerContactEmail: formData.footerContactEmail || undefined,
      footerContactPhone: formData.footerContactPhone || undefined,
      footerContactEmail2: formData.footerContactEmail2 || undefined,
      footerContactPhone2: formData.footerContactPhone2 || undefined,
      footerWebsiteUrl: formData.footerWebsiteUrl || undefined,
      footerPhysicalAddress: formData.footerPhysicalAddress || undefined,
      footerInstagramUrl: formData.footerInstagramUrl || undefined,
      footerFacebookUrl: formData.footerFacebookUrl || undefined,
      footerXUrl: formData.footerXUrl || undefined,
      footerLinkedinUrl: formData.footerLinkedinUrl || undefined,
      footerTiktokUrl: formData.footerTiktokUrl || undefined,
      footerYoutubeUrl: formData.footerYoutubeUrl || undefined,
      // Implementation states (excluding main state to avoid duplication)
      implementationStates: formData.implementationStates.length > 0 ? formData.implementationStates : undefined,
      isNationalProject: formData.isNationalProject || undefined,
      // Convocatoria
      convocatoria: formData.convocatoria || 'Primera Convocatoria 2025',
      // Legacy compatibility
      description: formData.objective, // Use objective as description for legacy
      location: {
        state: formData.state,
        city: formData.municipality,
        x: mapPosition.x, // Map percentage position
        y: mapPosition.y  // Map percentage position
      }
    };

    // Only call onSave - it will handle the global state
    // The local projects state will be updated via props
    onSave(newProject);
    
    if (editingProject) {
      setEditingProject(null);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      folio: '',
      name: '',
      organization: '',
      category: '',
      thematicArea: '',
      state: '',
      municipality: '',
      objective: '',
      beneficiaries: '',
      riskFactors: '',
      methodology: '',
      results: '',
      evaluationCriteriaHighlights: '',
      totalScore: '',
      finalRankingPosition: '',
      imageUrl: '',
      latitude: '',
      longitude: '',
      mapX: '',
      mapY: '',
      beneficiariesImageUrl: '',
      riskFactorsImageUrl: '',
      methodologyImageUrl: '',
      resultsImageUrl: '',
      footerOrganizationName: '',
      footerContactEmail: '',
      footerContactPhone: '',
      footerContactEmail2: '',
      footerContactPhone2: '',
      footerWebsiteUrl: '',
      footerPhysicalAddress: '',
      footerInstagramUrl: '',
      footerFacebookUrl: '',
      footerXUrl: '',
      footerLinkedinUrl: '',
      footerTiktokUrl: '',
      footerYoutubeUrl: '',
      implementationStates: [],
      isNationalProject: false,
      convocatoria: 'Primera Convocatoria 2025'
    });
  };

  const editProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      folio: project.id,
      name: project.name,
      organization: project.organization || '',
      category: project.category,
      thematicArea: project.thematicArea,
      state: project.state,
      municipality: project.municipality,
      objective: project.objective,
      beneficiaries: project.beneficiaries || '',
      riskFactors: project.riskFactors || '',
      methodology: project.methodology || '',
      results: project.results,
      evaluationCriteriaHighlights: project.evaluationCriteriaHighlights || '',
      totalScore: project.totalScore.toString(),
      finalRankingPosition: project.finalRankingPosition ? project.finalRankingPosition.toString() : '',
      imageUrl: project.imageUrl,
      latitude: project.location?.x !== undefined ? project.location.x : '',
      longitude: project.location?.y !== undefined ? project.location.y : '',
      mapX: project.location?.x !== undefined ? project.location.x : '',
      mapY: project.location?.y !== undefined ? project.location.y : '',
      beneficiariesImageUrl: project.beneficiariesImageUrl || '',
      riskFactorsImageUrl: project.riskFactorsImageUrl || '',
      methodologyImageUrl: project.methodologyImageUrl || '',
      resultsImageUrl: project.resultsImageUrl || '',
      footerOrganizationName: project.footerOrganizationName || '',
      footerContactEmail: project.footerContactEmail || '',
      footerContactPhone: project.footerContactPhone || '',
      footerContactEmail2: project.footerContactEmail2 || '',
      footerContactPhone2: project.footerContactPhone2 || '',
      footerWebsiteUrl: project.footerWebsiteUrl || '',
      footerPhysicalAddress: project.footerPhysicalAddress || '',
      footerInstagramUrl: project.footerInstagramUrl || '',
      footerFacebookUrl: project.footerFacebookUrl || '',
      footerXUrl: project.footerXUrl || '',
      footerLinkedinUrl: project.footerLinkedinUrl || '',
      footerTiktokUrl: project.footerTiktokUrl || '',
      footerYoutubeUrl: project.footerYoutubeUrl || '',
      implementationStates: project.implementationStates || [],
      isNationalProject: project.isNationalProject || false,
      convocatoria: project.convocatoria || 'Primera Convocatoria 2025'
    });
    
    // Scroll to form panel when editing
    setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Scroll to top when editing mode changes
  useEffect(() => {
    if (editingProject && formPanelRef.current) {
      formPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingProject]);

  const deleteProject = (projectId: string) => {
    onRemoveProject(projectId);
  };

  const clearAllProjects = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los proyectos? Esta acción no se puede deshacer.')) {
      onClearAll();
    }
  };

  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleManageAdmins = () => {
    navigate('/admin/manage');
  };

  // Filter projects based on search query
  const filteredProjects = existingProjects.filter((project) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      project.id.toLowerCase().includes(query) ||
      project.name.toLowerCase().includes(query) ||
      (project.organization && project.organization.toLowerCase().includes(query)) ||
      project.state.toLowerCase().includes(query) ||
      project.municipality.toLowerCase().includes(query) ||
      getCategoryLabel(project.category).toLowerCase().includes(query) ||
      getThematicAreaLabel(project.thematicArea).toLowerCase().includes(query)
    );
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Arvo, serif' }}>
                Administrador de Proyectos
              </h1>
              <Badge variant="secondary">{existingProjects.length} proyectos</Badge>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button variant="outline" onClick={handleManageAdmins} size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Gestionar Admins
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout} size="sm" title="Cerrar Sesión">
                <LogOut className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={onClose} size="sm" title="Cerrar Panel">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex w-full pt-20">
          {/* Form Panel */}
          <div ref={formPanelRef} className="w-1/2 p-6 border-r overflow-y-auto">
            <Card className={editingProject ? 'border-2 border-blue-500 shadow-lg' : ''}>
              <CardHeader className={editingProject ? 'bg-blue-50' : ''}>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {editingProject ? '✏️ Editar Proyecto' : 'Nuevo Proyecto'}
                </CardTitle>
                {editingProject && (
                  <p className="text-sm text-blue-600 mt-1">
                    Editando: <strong>{editingProject.name}</strong>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* No registro */}
                  <div>
                    <label className="block mb-2 font-medium">No registro</label>
                    <Input
                      value={formData.folio}
                      onChange={(e) => setFormData({...formData, folio: e.target.value})}
                      placeholder="e.g., PRJ-2024-001"
                      required
                    />
                  </div>

                  {/* Nombre de la propuesta */}
                  <div>
                    <label className="block mb-2 font-medium">Nombre de la propuesta</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nombre oficial de la propuesta"
                      required
                    />
                  </div>

                  {/* Organización o entidad */}
                  <div>
                    <label className="block mb-2 font-medium">Organización o entidad</label>
                    <Input
                      value={formData.organization}
                      onChange={(e) => setFormData({...formData, organization: e.target.value})}
                      placeholder="Nombre de la organización responsable"
                      required
                    />
                  </div>

                  {/* Convocatoria */}
                  <div>
                    <label className="block mb-2 font-medium">📅 Convocatoria</label>
                    <Input
                      value={formData.convocatoria}
                      onChange={(e) => setFormData({...formData, convocatoria: e.target.value})}
                      placeholder="Ej: Primera Convocatoria 2025, Segunda Convocatoria 2026"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 El color del pin en el mapa se asignará automáticamente según la convocatoria
                    </p>
                  </div>

                  {/* Categoría de participación */}
                  <div>
                    <label className="block mb-2 font-medium">Categoría de participación</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ámbito Temático */}
                  <div>
                    <label className="block mb-2 font-medium">Ámbito Temático</label>
                    <Select value={formData.thematicArea} onValueChange={(value) => setFormData({...formData, thematicArea: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ámbito" />
                      </SelectTrigger>
                      <SelectContent>
                        {thematicAreaOptions.map(area => (
                          <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ubicación territorial */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium">Ubicación territorial - Estado(s)</label>
                      <p className="text-xs text-gray-600 mb-2">Estado donde se ubica la organización</p>
                      <Select value={formData.state} onValueChange={(value) => {
                        setFormData({...formData, state: value});
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(MEXICAN_STATES_COORDS).map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Ubicación territorial / Municipios implementación</label>
                      <Input
                        value={formData.municipality}
                        onChange={(e) => setFormData({...formData, municipality: e.target.value})}
                        placeholder="Nombre del municipio"
                        required
                      />
                    </div>
                  </div>

                  {/* Additional Implementation States */}
                  <div>
                    <label className="block mb-2 font-medium">Estados donde se implementa el proyecto (opcional)</label>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-600 mb-3">
                        Selecciona TODOS los estados donde se implementa este proyecto (puede incluir el estado de ubicación de la organización). El pin aparecerá en el estado principal seleccionado arriba, y estos estados se iluminarán al pasar el mouse o hacer clic.
                      </p>
                      
                      {/* Proyecto Nacional checkbox */}
                      <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isNationalProject}
                            onChange={(e) => {
                              const allStates = Object.keys(MEXICAN_STATES_COORDS);
                              
                              if (e.target.checked) {
                                // Select all states (including organization state) and mark as national project
                                setFormData({
                                  ...formData,
                                  implementationStates: allStates,
                                  isNationalProject: true
                                });
                              } else {
                                // Deselect all states and unmark as national project
                                setFormData({
                                  ...formData,
                                  implementationStates: [],
                                  isNationalProject: false
                                });
                              }
                            }}
                            className="rounded border-yellow-400 w-5 h-5"
                          />
                          <span className="font-bold text-yellow-800">
                            🇲🇽 Proyecto Nacional (Seleccionar todos los estados)
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {Object.keys(MEXICAN_STATES_COORDS)
                          .map(state => (
                            <label key={state} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.implementationStates.includes(state)}
                                onChange={(e) => {
                                  const allStates = Object.keys(MEXICAN_STATES_COORDS);
                                  
                                  if (e.target.checked) {
                                    const newStates = [...formData.implementationStates, state];
                                    setFormData({
                                      ...formData,
                                      implementationStates: newStates,
                                      // Check if all states are now selected
                                      isNationalProject: newStates.length === allStates.length
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      implementationStates: formData.implementationStates.filter(s => s !== state),
                                      isNationalProject: false // Uncheck national project if manually deselecting
                                    });
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className={`text-xs ${state === formData.state ? 'font-bold text-blue-600' : ''}`}>
                                {state === formData.state ? `${state} (Ubicación org.)` : state}
                              </span>
                            </label>
                          ))}
                      </div>
                      {formData.implementationStates.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-800">
                            <strong>Estados seleccionados ({formData.implementationStates.length}):</strong> {formData.implementationStates.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Map Position Picker */}
                  <div className="border-t pt-4">
                    <MapCoordinatePicker
                      percentX={formData.mapX}
                      percentY={formData.mapY}
                      onPositionChange={(x, y) => {
                        setFormData({...formData, mapX: x, mapY: y});
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Si no seleccionas una ubicación manualmente, se generará automáticamente basada en el estado seleccionado.
                    </p>
                  </div>

                  {/* Objetivo principal */}
                  <MarkdownEditor
                    value={formData.objective}
                    onChange={(value) => setFormData({...formData, objective: value})}
                    label="Objetivo principal"
                    placeholder="Objetivo principal del proyecto (usa Markdown para formato)"
                    rows={6}
                  />

                  {/* Beneficiarios/ Participantes directos */}
                  <MarkdownEditor
                    value={formData.beneficiaries}
                    onChange={(value) => setFormData({...formData, beneficiaries: value})}
                    label="Beneficiarios/ Participantes directos"
                    placeholder="Descripción de beneficiarios/participantes directos (usa Markdown para formato)"
                    rows={6}
                  />

                  {/* Factores de riesgo identificados */}
                  <MarkdownEditor
                    value={formData.riskFactors}
                    onChange={(value) => setFormData({...formData, riskFactors: value})}
                    label="Factores de riesgo identificados"
                    placeholder="Factores de riesgo identificados en la iniciativa (usa Markdown para formato)"
                    rows={6}
                  />

                  {/* Metodología */}
                  <MarkdownEditor
                    value={formData.methodology}
                    onChange={(value) => setFormData({...formData, methodology: value})}
                    label="Metodología"
                    placeholder="Metodología utilizada en el proyecto (usa Markdown para formato)"
                    rows={6}
                  />

                  {/* Resultados principales */}
                  <MarkdownEditor
                    value={formData.results}
                    onChange={(value) => setFormData({...formData, results: value})}
                    label="Resultados principales"
                    placeholder="Resultados y logros principales del proyecto (usa Markdown para formato)"
                    rows={6}
                  />

                  {/* Criterios de evaluación destacados */}
                  <div>
                    <label className="block mb-2 font-medium">Criterios de evaluación destacados</label>
                    <Textarea
                      value={formData.evaluationCriteriaHighlights}
                      onChange={(e) => setFormData({...formData, evaluationCriteriaHighlights: e.target.value})}
                      placeholder="Criterios de evaluación más destacados del proyecto"
                      rows={3}
                    />
                  </div>

                  {/* Score and Position */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium">Puntaje Acumulado total Evaluaciones</label>
                      <Input
                        type="number"
                        value={formData.totalScore}
                        onChange={(e) => setFormData({...formData, totalScore: e.target.value})}
                        placeholder="e.g., 85"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Lugar Ocupado en los Resultados Finales</label>
                      <Input
                        type="number"
                        value={formData.finalRankingPosition}
                        onChange={(e) => setFormData({...formData, finalRankingPosition: e.target.value})}
                        placeholder="Posición (1, 2, 3...)"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Image URL */}
                  <ImageUploadInput
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({...formData, imageUrl: url})}
                    label="URL con fotografías (Hero/Principal)"
                    placeholder="https://..."
                    required={true}
                    description="Imagen principal que aparece en el hero de la página"
                  />

                  {/* Section Images Header */}
                  <div className="pt-6 border-t">
                    <h3 className="font-bold text-lg mb-4 text-blue-600">Imágenes de Secciones</h3>
                    <p className="text-sm text-gray-600 mb-4">Sube imágenes específicas para cada sección. Si están vacías, se usará la imagen principal.</p>
                  </div>

                  {/* Section-specific Images */}
                  <div className="space-y-3">
                    <ImageUploadInput
                      value={formData.beneficiariesImageUrl}
                      onChange={(url) => setFormData({...formData, beneficiariesImageUrl: url})}
                      label="Imagen - Beneficiarios"
                      placeholder="https://... (opcional)"
                    />

                    <ImageUploadInput
                      value={formData.riskFactorsImageUrl}
                      onChange={(url) => setFormData({...formData, riskFactorsImageUrl: url})}
                      label="Imagen - Factores de Riesgo"
                      placeholder="https://... (opcional)"
                    />

                    <ImageUploadInput
                      value={formData.methodologyImageUrl}
                      onChange={(url) => setFormData({...formData, methodologyImageUrl: url})}
                      label="Imagen - Metodología"
                      placeholder="https://... (opcional)"
                    />

                    <ImageUploadInput
                      value={formData.resultsImageUrl}
                      onChange={(url) => setFormData({...formData, resultsImageUrl: url})}
                      label="Imagen - Resultados Principales"
                      placeholder="https://... (opcional)"
                    />
                  </div>

                  {/* Footer Section Header */}
                  <div className="pt-6 border-t">
                    <h3 className="font-bold text-lg mb-4 text-blue-600">Información del Footer (Contacto del Proyecto)</h3>
                    <p className="text-sm text-gray-600 mb-4">Esta información aparecerá en el pie de página de la vista detallada del proyecto.</p>
                  </div>

                  {/* Footer Organization Name */}
                  <div>
                    <label className="block mb-2 font-medium">Nombre de la Organización (Footer)</label>
                    <Input
                      value={formData.footerOrganizationName}
                      onChange={(e) => setFormData({...formData, footerOrganizationName: e.target.value})}
                      placeholder="Nombre de la organización para el footer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Si está vacío, se usará el nombre de la organización principal</p>
                  </div>

                  {/* Footer Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium">Email de Contacto</label>
                      <Input
                        type="email"
                        value={formData.footerContactEmail}
                        onChange={(e) => setFormData({...formData, footerContactEmail: e.target.value})}
                        placeholder="contacto@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Teléfono de Contacto</label>
                      <Input
                        value={formData.footerContactPhone}
                        onChange={(e) => setFormData({...formData, footerContactPhone: e.target.value})}
                        placeholder="+52 55 1234 5678"
                      />
                    </div>
                  </div>

                  {/* Additional Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium">Email de Contacto 2</label>
                      <Input
                        type="email"
                        value={formData.footerContactEmail2}
                        onChange={(e) => setFormData({...formData, footerContactEmail2: e.target.value})}
                        placeholder="contacto2@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Teléfono de Contacto 2</label>
                      <Input
                        value={formData.footerContactPhone2}
                        onChange={(e) => setFormData({...formData, footerContactPhone2: e.target.value})}
                        placeholder="+52 55 8765 4321"
                      />
                    </div>
                  </div>

                  {/* Website and Physical Address */}
                  <div>
                    <label className="block mb-2 font-medium">Sitio Web</label>
                    <Input
                      type="url"
                      value={formData.footerWebsiteUrl}
                      onChange={(e) => setFormData({...formData, footerWebsiteUrl: e.target.value})}
                      placeholder="https://www.ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Dirección de oficinas principales</label>
                    <Textarea
                      value={formData.footerPhysicalAddress}
                      onChange={(e) => setFormData({...formData, footerPhysicalAddress: e.target.value})}
                      placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">Si está vacío, se mostrará "No tiene ubicación física"</p>
                  </div>

                  {/* Social Media URLs */}
                  <div>
                    <label className="block mb-2 font-medium">Redes Sociales del Proyecto</label>
                    <div className="space-y-2">
                      <Input
                        type="url"
                        value={formData.footerInstagramUrl}
                        onChange={(e) => setFormData({...formData, footerInstagramUrl: e.target.value})}
                        placeholder="Instagram URL (https://instagram.com/...)"
                      />
                      <Input
                        type="url"
                        value={formData.footerFacebookUrl}
                        onChange={(e) => setFormData({...formData, footerFacebookUrl: e.target.value})}
                        placeholder="Facebook URL (https://facebook.com/...)"
                      />
                      <Input
                        type="url"
                        value={formData.footerXUrl}
                        onChange={(e) => setFormData({...formData, footerXUrl: e.target.value})}
                        placeholder="X URL (https://x.com/... o https://twitter.com/...)"
                      />
                      <Input
                        type="url"
                        value={formData.footerLinkedinUrl}
                        onChange={(e) => setFormData({...formData, footerLinkedinUrl: e.target.value})}
                        placeholder="LinkedIn URL (https://linkedin.com/...)"
                      />
                      <Input
                        type="url"
                        value={formData.footerTiktokUrl}
                        onChange={(e) => setFormData({...formData, footerTiktokUrl: e.target.value})}
                        placeholder="TikTok URL (https://tiktok.com/...)"
                      />
                      <Input
                        type="url"
                        value={formData.footerYoutubeUrl}
                        onChange={(e) => setFormData({...formData, footerYoutubeUrl: e.target.value})}
                        placeholder="YouTube URL (https://youtube.com/...)"
                      />
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      {editingProject ? 'Actualizar' : 'Guardar'} Proyecto
                    </Button>
                    {editingProject && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingProject(null);
                        resetForm();
                      }}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Projects List Panel */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {/* Export/Import Section - Only for Super Admins */}
            {isSuperAdmin && (
              <div className="mb-6">
                <DataExportImport 
                  projects={existingProjects}
                  onImport={(projects) => projects.forEach(p => onSave(p))}
                  onClearAll={onClearAll}
                />
              </div>
            )}

            {/* Projects List Section */}
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">Proyectos Registrados</h3>
                {isSuperAdmin && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={clearAllProjects}
                    disabled={existingProjects.length === 0}
                    className="text-xs"
                  >
                    🗑️ Eliminar Todos
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Administra los {existingProjects.length} proyectos en el sistema
              </p>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por folio, nombre, organización, estado, municipio, categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Search Results Info */}
              {searchQuery && (
                <p className="text-xs text-gray-500 mt-2">
                  {filteredProjects.length === 0 ? (
                    <span className="text-orange-600">No se encontraron resultados para "{searchQuery}"</span>
                  ) : (
                    <span>
                      Mostrando {filteredProjects.length} de {existingProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-3">
                {filteredProjects.slice((currentPage - 1) * projectsPerPage, currentPage * projectsPerPage).map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{project.name}</h4>
                          {project.organization && (
                            <p className="text-xs text-gray-500 mb-1">{project.organization}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs">{getCategoryLabel(project.category)}</Badge>
                            <Badge variant="secondary" className="text-xs" title={getThematicAreaLabel(project.thematicArea)}>
                              {getThematicAreaLabel(project.thematicArea).length > 40 
                                ? getThematicAreaLabel(project.thematicArea).substring(0, 40) + '...' 
                                : getThematicAreaLabel(project.thematicArea)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">
                            {project.state}, {project.municipality} • Puntaje: {project.totalScore} • Beneficiarios: {project.beneficiaries || 0}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => editProject(project)}
                            className="h-8 w-8 p-0"
                            title="Editar proyecto"
                          >
                            ✏️
                          </Button>
                          {/* Only show delete button for super admins */}
                          {isSuperAdmin && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteProject(project.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Eliminar proyecto"
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {filteredProjects.length > projectsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-6 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {Math.ceil(filteredProjects.length / projectsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProjects.length / projectsPerPage), prev + 1))}
                    disabled={currentPage >= Math.ceil(filteredProjects.length / projectsPerPage)}
                  >
                    Siguiente →
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}