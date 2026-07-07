import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Download, Upload, Laptop, Smartphone, Mail } from 'lucide-react';
import PdfUploader from './PdfUploader';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AssignmentActaModal = ({ isOpen, onClose, assignment, onSuccess }) => {
    const [computerActa, setComputerActa] = useState(null);
    const [mobileActa, setMobileActa] = useState(null);
    const [hasComputerDevices, setHasComputerDevices] = useState(false);
    const [hasMobileDevices, setHasMobileDevices] = useState(false);
    const [computerAssignmentId, setComputerAssignmentId] = useState(null);
    const [mobileAssignmentId, setMobileAssignmentId] = useState(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const fetchActaInfo = useCallback(async () => {
        if (!assignment || !assignment.employee) {
            return;
        }

        const employeeId = assignment.employee.id;


        if (!employeeId) {

            return;
        }

        try {

            const response = await axios.get(`${API_URL}/employees/${employeeId}/acta-info`);
            const data = response.data;



            setHasComputerDevices(data.has_computer_devices);
            setHasMobileDevices(data.has_mobile_devices);
            setComputerActa(data.computer_acta_path);
            setMobileActa(data.mobile_acta_path);
            setComputerAssignmentId(data.computer_assignment_id);
            setMobileAssignmentId(data.mobile_assignment_id);
        } catch (error) {
            console.error('Error fetching acta info:', error);
        }
    }, [assignment]);

    useEffect(() => {
        fetchActaInfo();
    }, [fetchActaInfo]);

    if (!isOpen || !assignment) return null;

    const downloadGeneratedActa = async () => {
        // Get assignment ID - handle different data structures
        let assignmentId = assignment?.id || assignment?.assignment_id;

        if (!assignmentId) {
            const fallbackId = computerAssignmentId || mobileAssignmentId;
            if (!fallbackId) {
                alert('No se pudo determinar el ID de asignación');
                return;
            }
            assignmentId = fallbackId;
        }

        try {
            const response = await axios.get(`${API_URL}/assignments/${assignmentId}/acta`, {
                responseType: 'blob',
            });
            
            // Determinar la extensión basándose en el tipo MIME devuelto por el servidor
            const contentType = response.headers['content-type'] || response.data.type;
            const isZip = contentType === 'application/zip' || contentType === 'application/x-zip-compressed';
            const extension = isZip ? '.zip' : '.docx';
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const employeeName = assignment?.employee?.full_name || 'empleado';
            link.setAttribute('download', `ACTA DE ENTREGA - ${employeeName.toUpperCase()}${extension}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error descargando acta:', error);
            alert('Error al descargar el acta');
        }
    };

    const handleSendEmail = async () => {
        let assignmentId = assignment?.id || assignment?.assignment_id;
        if (!assignmentId) {
            const fallbackId = computerAssignmentId || mobileAssignmentId;
            if (!fallbackId) {
                alert('No se pudo determinar el ID de asignación');
                return;
            }
            assignmentId = fallbackId;
        }

        if (!window.confirm(`¿Estás seguro que deseas enviar el acta por correo a ${assignment?.employee?.full_name || 'este usuario'}?\n\nSi subiste el Acta Firmada en PDF, se le adjuntará esa versión. En caso contrario, recibirá el documento autogenerado original.`)) {
            return;
        }

        setIsSendingEmail(true);
        try {
            const { data } = await axios.post(`${API_URL}/assignments/${assignmentId}/send-email`);
            alert(data.message || 'Correo enviado exitosamente al empleado');
        } catch (error) {
            console.error('Error enviando correo:', error);
            alert(error.response?.data?.detail || 'Error al enviar el correo');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Acta de asignación">
            <div className="bg-surface rounded-xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-surface sticky top-0 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-accent" />
                                Gestión de Actas
                            </h2>
                            <p className="text-muted mt-1">
                                {assignment.employee?.full_name || 'Empleado'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Download Generated Acta */}
                    <div className="bg-bg/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase mb-3">
                            Acta Generada Automáticamente
                        </h3>
                        <p className="text-xs text-muted mb-3">
                            Descarga el acta generada por el sistema para imprimir y firmar, o envíala por correo.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={downloadGeneratedActa}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Descargar Acta para Firmar
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                                className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSendingEmail ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <Mail className="w-4 h-4" />
                                {isSendingEmail ? 'Enviando Correo...' : 'Enviar Correo al Usuario'}
                            </button>
                        </div>
                    </div>

                    {/* Computer Devices Acta */}
                    {hasComputerDevices && computerAssignmentId && (
                        <div className="bg-bg/50 p-4 rounded-lg border border-blue-500/30">
                            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-300 uppercase mb-3 flex items-center gap-2">
                                <Laptop className="w-4 h-4" />
                                Acta de Asignación - Equipo de Cómputo
                            </h3>
                            <p className="text-xs text-muted mb-4">
                                Acta firmada para equipos de cómputo (laptop, monitor, teclado, mouse, etc.)
                            </p>
                            <PdfUploader
                                uploadUrl={`${API_URL}/assignments/${computerAssignmentId}/upload-acta`}
                                downloadUrl={`${API_URL}/assignments/${computerAssignmentId}/download-acta`}
                                deleteUrl={`${API_URL}/assignments/${computerAssignmentId}/delete-acta`}
                                currentPdfPath={computerActa}
                                label="Acta Firmada - Cómputo (PDF)"
                                onUploadSuccess={() => fetchActaInfo()}
                                onDeleteSuccess={() => fetchActaInfo()}
                            />
                        </div>
                    )}

                    {/* Mobile Devices Acta */}
                    {hasMobileDevices && mobileAssignmentId && (
                        <div className="bg-bg/50 p-4 rounded-lg border border-green-500/30">
                            <h3 className="text-sm font-bold text-green-600 dark:text-green-300 uppercase mb-3 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Acta de Asignación - Celular
                            </h3>
                            <p className="text-xs text-muted mb-4">
                                Acta firmada para dispositivos móviles (celular, chip, cargador)
                            </p>
                            <PdfUploader
                                uploadUrl={`${API_URL}/assignments/${mobileAssignmentId}/upload-acta`}
                                downloadUrl={`${API_URL}/assignments/${mobileAssignmentId}/download-acta`}
                                deleteUrl={`${API_URL}/assignments/${mobileAssignmentId}/delete-acta`}
                                currentPdfPath={mobileActa}
                                label="Acta Firmada - Celular (PDF)"
                                onUploadSuccess={() => fetchActaInfo()}
                                onDeleteSuccess={() => fetchActaInfo()}
                            />
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                            <FileText className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-200">
                                <p className="font-bold mb-1">Proceso:</p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-300">
                                    <li>Descarga el acta generada automáticamente</li>
                                    <li>Imprime y haz firmar al empleado</li>
                                    <li>Escanea el acta firmada como PDF</li>
                                    <li>Sube el PDF firmado en la sección correspondiente arriba</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-bg/50 border-t border-slate-200 dark:border-slate-700 flex justify-end sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentActaModal;
