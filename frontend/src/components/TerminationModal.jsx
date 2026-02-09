import React, { useState } from 'react';
import { X, AlertTriangle, Package, Smartphone, Monitor, Laptop, Loader } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TerminationModal = ({ isOpen, onClose, employee, onSuccess }) => {
    const { showNotification, showConfirm } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        termination_date: new Date().toISOString().split('T')[0],
        reason: '',
        observations: ''
    });

    if (!isOpen || !employee) return null;

    // Group equipment by type
    const computerEquipment = employee.assets?.filter(d =>
        ['laptop', 'monitor', 'charger', 'keyboard', 'mouse', 'keyboard_mouse_kit', 'backpack', 'stand'].includes(d.device_type)
    ) || [];

    const mobileEquipment = employee.assets?.filter(d =>
        ['mobile', 'chip'].includes(d.device_type)
    ) || [];

    const handleTerminate = async () => {
        if (!formData.reason.trim()) {
            showNotification("Por favor ingrese la razón del cese", 'warning');
            return;
        }

        const confirmed = await showConfirm(
            `¿Está seguro de marcar a ${employee.full_name} como cesado?\n\n` +
            `Esto devolverá ${employee.assets?.length || 0} equipo(s) al stock y generará las actas de recepción.`
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/terminations/`, {
                employee_id: employee.id,
                termination_date: formData.termination_date,
                reason: formData.reason,
                observations: formData.observations
            });

            showNotification(`Cese procesado exitosamente.\n\nID de Terminación: ${response.data.id}`, 'success');

            // Download actas if available
            if (computerEquipment.length > 0) {
                window.open(`${API_URL}/terminations/${response.data.id}/acta-computer`, '_blank');
            }
            if (mobileEquipment.length > 0) {
                window.open(`${API_URL}/terminations/${response.data.id}/acta-mobile`, '_blank');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showNotification("Error al procesar el cese: " + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-3xl shadow-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-red-500/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                Marcar como Cesado
                            </h2>
                            <p className="text-slate-400 mt-1">{employee.full_name}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Employee Info */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Información del Empleado</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">DNI:</span>
                                <span className="text-white ml-2">{employee.dni || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Email:</span>
                                <span className="text-white ml-2">{employee.email}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Departamento:</span>
                                <span className="text-white ml-2">{employee.department || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Empresa:</span>
                                <span className="text-white ml-2">{employee.company || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Equipment to Return */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Equipos a Devolver</h3>

                        {computerEquipment.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 text-blue-400 mb-2">
                                    <Laptop className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Equipos de Cómputo ({computerEquipment.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {computerEquipment.map(device => (
                                        <div key={device.id} className="text-sm text-slate-300 pl-6">
                                            • {device.brand} {device.model} - {device.serial_number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mobileEquipment.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-green-400 mb-2">
                                    <Smartphone className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Equipos Móviles ({mobileEquipment.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {mobileEquipment.map(device => (
                                        <div key={device.id} className="text-sm text-slate-300 pl-6">
                                            • {device.brand} {device.model} - {device.phone_number || device.serial_number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {employee.assets?.length === 0 && (
                            <p className="text-sm text-slate-500 italic">No hay equipos asignados</p>
                        )}
                    </div>

                    {/* Termination Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Fecha de Cese</label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={formData.termination_date}
                                onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Razón del Cese *</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                            >
                                <option value="">Seleccione una razón...</option>
                                <option value="Renuncia Voluntaria">Renuncia Voluntaria</option>
                                <option value="Despido">Despido</option>
                                <option value="Fin de Contrato">Fin de Contrato</option>
                                <option value="Mutuo Acuerdo">Mutuo Acuerdo</option>
                                <option value="Jubilación">Jubilación</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Observaciones</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                                placeholder="Estado de los equipos, observaciones adicionales..."
                                value={formData.observations}
                                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <p className="font-bold mb-1">Esta acción:</p>
                                <ul className="list-disc list-inside space-y-1 text-red-300">
                                    <li>Marcará al empleado como inactivo</li>
                                    <li>Devolverá todos los equipos al stock (estado: AVAILABLE)</li>
                                    <li>Generará actas de recepción automáticamente</li>
                                    <li>No se puede deshacer fácilmente</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleTerminate}
                        disabled={loading || !formData.reason}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4" />
                                Confirmar Cese
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TerminationModal;
