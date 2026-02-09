import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Download, Upload, Laptop, Smartphone } from 'lucide-react';
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

    const fetchActaInfo = useCallback(async () => {
        console.log('Assignment object:', assignment);

        if (!assignment || !assignment.employee) {
            console.log('No assignment or employee');
            return;
        }

        const employeeId = assignment.employee.id;
        console.log('Employee ID:', employeeId);

        if (!employeeId) {
            console.log('No employee ID found');
            return;
        }

        try {
            // Use the new endpoint that returns structured acta information
            console.log(`Fetching acta info for employee ${employeeId}`);
            const response = await axios.get(`${API_URL}/employees/${employeeId}/acta-info`);
            const data = response.data;

            console.log('Acta info received:', data);

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

    const downloadGeneratedActa = () => {
        // Get assignment ID - handle different data structures
        const assignmentId = assignment?.id || assignment?.assignment_id;

        if (!assignmentId) {
            console.error('No assignment ID found:', assignment);
            // Fallback: use employee ID to get first assignment
            const employeeId = assignment?.employee?.id || assignment?.employee_id;
            if (employeeId) {
                // Use computer or mobile assignment ID from acta-info
                const fallbackId = computerAssignmentId || mobileAssignmentId;
                if (fallbackId) {
                    window.open(`${API_URL}/assignments/${fallbackId}/acta`, '_blank');
                    return;
                }
            }
            alert('No se pudo determinar el ID de asignación');
            return;
        }

        window.open(`${API_URL}/assignments/${assignmentId}/acta`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-4xl shadow-2xl border border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-blue-500/10 sticky top-0 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-400" />
                                Gestión de Actas
                            </h2>
                            <p className="text-slate-400 mt-1">
                                {assignment.employee?.full_name || 'Empleado'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Download Generated Acta */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">
                            Acta Generada Automáticamente
                        </h3>
                        <p className="text-xs text-slate-400 mb-3">
                            Descarga el acta generada por el sistema para imprimir y firmar
                        </p>
                        <button
                            onClick={downloadGeneratedActa}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Descargar Acta para Firmar
                        </button>
                    </div>

                    {/* Computer Devices Acta */}
                    {hasComputerDevices && computerAssignmentId && (
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-blue-500/30">
                            <h3 className="text-sm font-bold text-blue-300 uppercase mb-3 flex items-center gap-2">
                                <Laptop className="w-4 h-4" />
                                Acta de Asignación - Equipo de Cómputo
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                                Acta firmada para equipos de cómputo (laptop, monitor, teclado, mouse, etc.)
                            </p>
                            <PdfUploader
                                uploadUrl={`${API_URL}/assignments/${computerAssignmentId}/upload-acta`}
                                downloadUrl={`${API_URL}/assignments/${computerAssignmentId}/download-acta`}
                                deleteUrl={`${API_URL}/assignments/${computerAssignmentId}/delete-acta`}
                                currentPdfPath={computerActa}
                                label="Acta Firmada - Cómputo (PDF)"
                                onUploadSuccess={() => {
                                    fetchActaInfo(); // Refresh data
                                    if (onSuccess) onSuccess();
                                }}
                                onDeleteSuccess={() => {
                                    fetchActaInfo(); // Refresh data
                                    if (onSuccess) onSuccess();
                                }}
                            />
                        </div>
                    )}

                    {/* Mobile Devices Acta */}
                    {hasMobileDevices && mobileAssignmentId && (
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-green-500/30">
                            <h3 className="text-sm font-bold text-green-300 uppercase mb-3 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Acta de Asignación - Celular
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                                Acta firmada para dispositivos móviles (celular, chip, cargador)
                            </p>
                            <PdfUploader
                                uploadUrl={`${API_URL}/assignments/${mobileAssignmentId}/upload-acta`}
                                downloadUrl={`${API_URL}/assignments/${mobileAssignmentId}/download-acta`}
                                deleteUrl={`${API_URL}/assignments/${mobileAssignmentId}/delete-acta`}
                                currentPdfPath={mobileActa}
                                label="Acta Firmada - Celular (PDF)"
                                onUploadSuccess={() => {
                                    fetchActaInfo(); // Refresh data
                                    if (onSuccess) onSuccess();
                                }}
                                onDeleteSuccess={() => {
                                    fetchActaInfo(); // Refresh data
                                    if (onSuccess) onSuccess();
                                }}
                            />
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-200">
                                <p className="font-bold mb-1">Proceso:</p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-300">
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
                <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentActaModal;
