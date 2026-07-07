import React, { useState, useEffect } from 'react';
import { X, Download, Loader, Mail } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SignatureModal = ({ employee, onClose }) => {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${API_URL}/employees/${employee.id}/signature`, {
                    responseType: 'text',
                });
                setHtml(res.data);
            } catch {
                setHtml('<p style="color:red">Error al generar la firma.</p>');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [employee.id]);

    const downloadHtml = () => {
        const safeName = employee.full_name.replace(/\s+/g, '_').toUpperCase();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `FIRMA_${safeName}.html`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-slate-900 dark:text-white font-semibold">Firma de correo</h2>
                            <p className="text-muted text-xs">{employee.full_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader className="w-8 h-8 text-accent animate-spin" />
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                            <iframe
                                srcDoc={html}
                                title="Firma preview"
                                className="w-full border-0"
                                style={{ height: '260px' }}
                                sandbox="allow-same-origin"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-3">
                    <p className="text-xs text-muted">
                        Descarga el archivo <strong className="text-slate-600 dark:text-slate-300">.html</strong> y ábrelo en el navegador para copiar la firma a Outlook o Gmail (Configuración → Firma).
                    </p>
                    <button
                        onClick={downloadHtml}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:opacity-90 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition-opacity text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Descargar firma (.html)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
