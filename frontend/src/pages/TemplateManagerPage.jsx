import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Star, Eye, Settings, Pencil, Download } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import TemplateUploadModal from '../components/TemplateUploadModal';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TemplateManagerPage = () => {
    const { showNotification, showConfirm } = useNotification();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [filterType, setFilterType] = useState('all');

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${API_URL}/templates/`);
            setTemplates(Array.isArray(res.data) ? res.data : (res.data.templates || []));
        } catch (error) {
            showNotification('Error al cargar templates', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSetDefault = async (templateId) => {
        try {
            await axios.post(`${API_URL}/templates/${templateId}/set-default`);
            showNotification('Template establecido como predeterminado', 'success');
            fetchTemplates();
        } catch (error) {
            showNotification('Error al establecer como predeterminado', 'error');
        }
    };

    const handleDelete = async (templateId, templateName) => {
        const confirmed = await showConfirm(`¿Eliminar el template "${templateName}"?`);
        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/templates/${templateId}`);
            showNotification('Template eliminado', 'success');
            fetchTemplates();
        } catch (error) {
            showNotification('Error al eliminar template', 'error');
        }
    };

    const filteredTemplates = filterType === 'all'
        ? templates
        : templates.filter(t => t.template_type === filterType);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Gestión de Templates</h1>
                    <p className="text-muted">Administra los templates de documentos del sistema</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-accent hover:opacity-90 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-opacity"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Template
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-lg font-medium ${filterType === 'all' ? 'bg-accent text-white' : 'bg-surface text-slate-600 dark:text-slate-300'
                        }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterType('acta_entrega')}
                    className={`px-4 py-2 rounded-lg font-medium ${filterType === 'acta_entrega' ? 'bg-accent text-white' : 'bg-surface text-slate-600 dark:text-slate-300'
                        }`}
                >
                    Actas de Entrega
                </button>
                <button
                    onClick={() => setFilterType('acta_devolucion')}
                    className={`px-4 py-2 rounded-lg font-medium ${filterType === 'acta_devolucion' ? 'bg-accent text-white' : 'bg-surface text-slate-600 dark:text-slate-300'
                        }`}
                >
                    Actas de Devolución
                </button>
                <button
                    onClick={() => setFilterType('acta_baja')}
                    className={`px-4 py-2 rounded-lg font-medium ${filterType === 'acta_baja' ? 'bg-accent text-white' : 'bg-surface text-slate-600 dark:text-slate-300'
                        }`}
                >
                    Actas de Baja
                </button>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="text-center text-slate-900 dark:text-white py-12">Cargando templates...</div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-muted mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay templates</h3>
                    <p className="text-muted mb-6">Comienza creando tu primer template</p>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-accent hover:opacity-90 text-white px-6 py-3 rounded-lg font-bold inline-flex items-center gap-2 transition-opacity"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.id}
                            className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{template.name}</h3>
                                        {template.is_default && (
                                            <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400 fill-current" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted line-clamp-2">
                                        {template.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <FileText className="w-8 h-8 text-accent flex-shrink-0" />
                            </div>

                            {/* Type Badge */}
                            <div className="mb-4">
                                <span className="inline-block bg-blue-500/10 text-accent text-xs px-3 py-1 rounded-full font-medium">
                                    {template.template_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                            </div>

                            {/* Variables Count */}
                            <div className="mb-4 text-sm text-muted">
                                {template.variables ? JSON.parse(template.variables).length : 0} variables configuradas
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {!template.is_default && (
                                    <button
                                        onClick={() => handleSetDefault(template.id)}
                                        className="flex-1 bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                                        title="Establecer como predeterminado"
                                    >
                                        <Star className="w-4 h-4" />
                                        Predeterminar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setEditingTemplate(template);
                                        setIsUploadModalOpen(true);
                                    }}
                                    className="bg-accent hover:opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium transition-opacity"
                                    title="Editar"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <a
                                    href={`${API_URL}/templates/${template.id}/download`}
                                    download
                                    className="bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center border border-slate-200 dark:border-slate-700"
                                    title="Descargar plantilla"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => handleDelete(template.id, template.name)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm font-medium"
                                    title="Eliminar template"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                                Creado: {new Date(template.created_at).toLocaleDateString('es-PE')}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <TemplateUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    setEditingTemplate(null);
                }}
                onSuccess={() => {
                    fetchTemplates();
                    setEditingTemplate(null);
                }}
                templateToEdit={editingTemplate}
            />
        </div>
    );
};

export default TemplateManagerPage;
