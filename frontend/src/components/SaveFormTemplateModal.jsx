import React, { useState } from 'react';
import axios from 'axios';
import { Save, X, Loader } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SaveFormTemplateModal = ({ isOpen, onClose, formData, type = "DECOMMISSION", onSuccess }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            showNotification("Ingresa un nombre para la plantilla", "warning");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/form-templates/`, {
                name: name,
                type: type,
                content: JSON.stringify(formData)
            });

            showNotification("Plantilla guardada correctamente", "success");
            setName('');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving template:", error);
            showNotification("Error al guardar la plantilla", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Save className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                        Guardar como Plantilla
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                Nombre de la Plantilla
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Robo Estándar, Obsolescencia 2024..."
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Se guardarán: Motivo, Observaciones y Motivo de Compra actuales.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white font-bold flex items-center gap-2 transition-opacity disabled:opacity-50"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveFormTemplateModal;
