import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Loader, X, CheckCircle, Lock, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { downloadFileWithProgress } from '../utils/downloadFile';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PdfUploader = ({
    uploadUrl,
    downloadUrl,
    deleteUrl,
    currentPdfPath,
    label = "Subir Acta Firmada",
    onUploadSuccess,
    onDeleteSuccess
}) => {
    const { token } = useAuth(); // Get token from context
    const { showNotification, showConfirm, startDownload, updateDownloadProgress, finishDownload, failDownload } = useNotification();
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [file, setFile] = useState(null);
    const [hasPdf, setHasPdf] = useState(!!currentPdfPath);
    const [isDragging, setIsDragging] = useState(false);

    // Sync local state with prop changes
    useEffect(() => {
        setHasPdf(!!currentPdfPath);
        setFile(null); // Reset file selection when PDF changes
    }, [currentPdfPath]);

    // Si ya existe un PDF, bloquear la subida
    const hasExistingPdf = hasPdf;

    const validateAndSetFile = (selectedFile) => {
        if (!selectedFile) return;
        if (selectedFile.type !== 'application/pdf') {
            showNotification('Solo se permiten archivos PDF', 'error');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            showNotification('El archivo no debe superar 10MB', 'error');
            return;
        }
        setFile(selectedFile);
    };

    const handleFileChange = (e) => {
        validateAndSetFile(e.target.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (uploading || hasExistingPdf) return;
        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(uploadUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            showNotification('✓ Acta subida exitosamente', 'success');
            setFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            console.error('Error uploading PDF:', err);
            showNotification('Error al subir el acta: ' + (err.response?.data?.detail || err.message), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = () => {
        const filename = (currentPdfPath ? currentPdfPath.split('/').pop() : null) || 'acta.pdf';
        downloadFileWithProgress({
            url: downloadUrl,
            filename,
            label: filename,
            params: { token },
            notification: { startDownload, updateDownloadProgress, finishDownload, failDownload, showNotification },
        }).catch(() => {});
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm(
            '¿Estás seguro de eliminar el acta firmada?',
            'Esta acción no se puede deshacer. El archivo será eliminado permanentemente.'
        );

        if (!confirmed) return;

        setDeleting(true);
        try {
            await axios.delete(deleteUrl);
            showNotification('✓ Acta eliminada exitosamente', 'success');
            if (onDeleteSuccess) onDeleteSuccess();
        } catch (err) {
            console.error('Error deleting PDF:', err);
            showNotification('Error al eliminar el acta: ' + (err.response?.data?.detail || err.message), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
            </div>

            {/* Si ya existe un PDF, mostrar estado bloqueado */}
            {hasExistingPdf ? (
                <div className="space-y-3">
                    {/* Indicador de archivo existente */}
                    <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-green-700 dark:text-green-400">Acta Firmada Subida</p>
                                <p className="text-xs text-green-700/70 dark:text-green-300/70 mt-0.5">
                                    El archivo PDF firmado ya fue subido exitosamente
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                        {/* Botón de descarga */}
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-white px-4 py-3 rounded-lg font-medium transition-opacity"
                        >
                            <Download className="w-4 h-4" />
                            Descargar Acta
                        </button>

                        {/* Botón de eliminar */}
                        {deleteUrl && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                                title="Eliminar acta firmada"
                            >
                                {deleting ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Mensaje de bloqueo */}
                    <div className="bg-bg border border-slate-200 dark:border-slate-600 rounded-lg p-3 flex items-start gap-2">
                        <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            No se puede subir un nuevo archivo mientras exista uno. Elimina el actual si necesitas reemplazarlo.
                        </p>
                    </div>
                </div>
            ) : (
                /* Si NO existe PDF, mostrar formulario de subida */
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                            <div
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                    file
                                        ? 'border-green-500 bg-green-500/10'
                                        : isDragging
                                        ? 'border-blue-400 bg-blue-500/10'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-bg'
                                }`}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                <div className="flex items-center justify-center gap-2">
                                    {file ? (
                                        <>
                                            <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <span className="text-sm text-green-700 dark:text-green-400 truncate max-w-[200px]">
                                                {file.name}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setFile(null);
                                                }}
                                                className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 text-slate-400" />
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                Seleccionar PDF (máx 10MB)
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </label>

                        {file && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="px-4 py-2 bg-accent hover:opacity-90 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-opacity"
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Subir
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Info de ayuda */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Importante:</strong> Una vez subido el acta firmada, no podrá ser reemplazada directamente. Deberás eliminarla primero si necesitas cambiarla.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfUploader;
