import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookTemplate, ChevronDown, Trash2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const FormTemplateSelector = ({ onSelect, type = "DECOMMISSION", onTemplateDeleted }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { showNotification, showConfirm } = useNotification();

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/form-templates/`, {
                params: { type }
            });
            setTemplates(response.data);
        } catch (error) {
            console.error("Error fetching templates:", error);
            showNotification("Error al cargar plantillas", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const handleSelect = (template) => {
        try {
            const content = JSON.parse(template.content);
            onSelect(content);
            setIsOpen(false);
            showNotification("Plantilla cargada correctamente", "success");
        } catch (error) {
            console.error("Error parsing template content:", error);
            showNotification("Error al procesar la plantilla", "error");
        }
    };

    const handleDelete = async (e, templateId) => {
        e.stopPropagation();
        const confirmed = await showConfirm("¿Estás seguro de eliminar esta plantilla?");
        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/form-templates/${templateId}`);
            showNotification("Plantilla eliminada", "success");
            fetchTemplates(); // Refresh list
            if (onTemplateDeleted) onTemplateDeleted();
        } catch (error) {
            console.error("Error deleting template:", error);
            showNotification("Error al eliminar la plantilla", "error");
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
                <BookTemplate className="w-4 h-4" />
                Cargar Plantilla
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500 text-xs">Cargando...</div>
                        ) : templates.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-xs">No hay plantillas guardadas</div>
                        ) : (
                            <ul className="py-1">
                                {templates.map(template => (
                                    <li key={template.id} className="group">
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(template)}
                                            className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex justify-between items-center"
                                        >
                                            <span className="text-sm text-slate-300 truncate pr-2">{template.name}</span>
                                            <div
                                                onClick={(e) => handleDelete(e, template.id)}
                                                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-slate-600"
                                                title="Eliminar plantilla"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default FormTemplateSelector;
