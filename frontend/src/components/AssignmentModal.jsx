import React, { useState, useEffect } from 'react';
import { X, User, Save, Loader, Mail, CheckCircle, Send } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AssignmentModal = ({ isOpen, onClose, devices = [], onSuccess }) => {
    const { showNotification, showConfirm } = useNotification();
    const [employeeId, setEmployeeId] = useState(''); // This will now serve as Search Query for Employee
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [notes, setNotes] = useState('');
    const [assignmentType, setAssignmentType] = useState('ASIGNACION');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Charger selection
    const [chargerOption, setChargerOption] = useState('default'); // 'none', 'default', 'custom'
    const [customChargerBrand, setCustomChargerBrand] = useState('HP');
    const [customChargerModel, setCustomChargerModel] = useState('');

    // Post-assignment email
    const [assignmentDone, setAssignmentDone] = useState(false);
    const [lastAssignedEmployee, setLastAssignedEmployee] = useState(null);
    const [emailTo, setEmailTo] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Check if assigning a laptop
    const hasLaptop = devices.some(d => d.device_type === 'laptop');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setEmployeeId('');
            setSelectedEmployee(null);
            setNotes('');
            setAssignmentType('ASIGNACION');
            setEmployees([]);
            setChargerOption('default');
            setCustomChargerBrand('HP');
            setCustomChargerModel('');
            setAssignmentDone(false);
            setLastAssignedEmployee(null);
            setEmailTo('');
            setEmailSent(false);
        }
    }, [isOpen, hasLaptop]);

    // Search employees debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (employeeId.length > 1 && !selectedEmployee) {
                setSearching(true);
                try {
                    const res = await axios.get(`${API_URL}/employees/?search=${employeeId}`);
                    setEmployees(res.data);
                } catch (err) {
                    console.error("Error searching employees", err);
                } finally {
                    setSearching(false);
                }
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [employeeId, selectedEmployee]);

    if (!isOpen) return null;

    const handleSendEmail = async () => {
        if (!emailTo) return;
        setSendingEmail(true);
        try {
            const deviceList = devices.map(d => `• ${d.device_type.toUpperCase()} — ${d.brand} ${d.model} (S/N: ${d.serial_number || '-'})`).join('<br/>');
            const body = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
                    <h2 style="color:#1d4ed8">Asignación de Equipos TI</h2>
                    <p>Estimado/a <strong>${lastAssignedEmployee?.full_name}</strong>,</p>
                    <p>Le informamos que se le han asignado los siguientes equipos:</p>
                    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
                        ${deviceList}
                    </div>
                    <p>Por favor, confirme la recepción de los equipos firmando el acta correspondiente.</p>
                    <p style="color:#6b7280;font-size:12px;margin-top:24px">Este correo fue generado automáticamente por el sistema IT Inventory.</p>
                </div>
            `;
            await axios.post(`${API_URL}/send-email`, {
                to_email: emailTo,
                subject: `Asignación de equipos TI — ${lastAssignedEmployee?.full_name}`,
                body_html: body
            });
            setEmailSent(true);
            showNotification('Correo enviado exitosamente', 'success');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Error al enviar correo';
            showNotification(msg, 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedEmployee) {
            showNotification("Please select an employee", 'warning');
            return;
        }

        // Check if assigning mobile to practicante
        const hasMobile = devices.some(d => d.device_type === 'mobile');
        const isPracticante = (selectedEmployee.position || '').toLowerCase().includes('practicante');

        if (hasMobile && isPracticante) {
            const confirmed = await showConfirm(
                "⚠️ Advertencia: Asignación de Celular a Practicante",
                `Estás asignando un celular a ${selectedEmployee.full_name} que tiene el cargo de practicante.\n\nNormalmente los practicantes no reciben celulares.\n\n¿Estás seguro de continuar con esta asignación?`
            );
            if (!confirmed) {
                return;
            }
        }

        // Check if laptop is being assigned without charger
        if (hasLaptop && chargerOption === 'none') {
            const confirmed = await showConfirm(
                "⚠️ You are assigning a laptop without a charger.\n\nAre you sure you want to continue?"
            );
            if (!confirmed) {
                return;
            }
        }

        // Validate custom charger
        if (chargerOption === 'custom' && !customChargerModel.trim()) {
            showNotification("Please enter the charger model", 'warning');
            return;
        }

        setLoading(true);
        try {
            let deviceIds = devices.map(d => d.id);

            // Build charger info based on selection
            let chargerInfo = null;
            if (chargerOption === 'default') {
                chargerInfo = { brand: 'HP', model: 'TPN-DA15', serial: '-' };
            } else if (chargerOption === 'custom') {
                chargerInfo = {
                    brand: customChargerBrand.trim() || 'HP',
                    model: customChargerModel.trim(),
                    serial: '-'
                };
            }

            // Use batch endpoint
            await axios.post(`${API_URL}/assignments/batch`, {
                device_ids: deviceIds,
                employee_id: selectedEmployee.id,
                notes: notes,
                charger_info: chargerInfo,
                assignment_type: assignmentType
            });

            onSuccess();
            // Show post-assignment email option instead of closing immediately
            setLastAssignedEmployee(selectedEmployee);
            setEmailTo(selectedEmployee?.email || '');
            setAssignmentDone(true);

        } catch (error) {
            console.error(error);
            showNotification("Failed to assign: " + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setEmployeeId(emp.full_name);
        setEmployees([]); // Hide results
    };

    // Post-assignment success screen
    if (assignmentDone) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20 mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">¡Asignación completada!</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            {devices.length} equipo{devices.length > 1 ? 's' : ''} asignado{devices.length > 1 ? 's' : ''} a <span className="text-white font-medium">{lastAssignedEmployee?.full_name}</span>
                        </p>

                        {emailSent ? (
                            <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-6">
                                <CheckCircle className="w-4 h-4" />
                                Correo enviado a {emailTo}
                            </div>
                        ) : (
                            <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left space-y-3">
                                <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-primary" />
                                    Enviar notificación por correo
                                </p>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    placeholder="correo@destinatario.com"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                                />
                                <button
                                    onClick={handleSendEmail}
                                    disabled={sendingEmail || !emailTo}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {sendingEmail ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sendingEmail ? 'Enviando...' : 'Enviar correo'}
                                </button>
                            </div>
                        )}

                        <button onClick={onClose}
                            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                            {emailSent ? 'Cerrar' : 'Omitir y cerrar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl border border-slate-700 overflow-hidden animation-fade-in relative">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">
                        Assign {devices.length} Device{devices.length > 1 ? 's' : ''}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Device List Summary */}
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 max-h-32 overflow-y-auto">
                        <div className="text-xs text-blue-300 uppercase font-semibold mb-2">Selected Equipment</div>
                        {devices.map(d => (
                            <div key={d.id} className="flex justify-between text-sm text-white border-b border-blue-500/10 last:border-0 py-1">
                                <span>{d.model}</span>
                                <span className="font-mono text-blue-200">{d.serial_number}</span>
                            </div>
                        ))}
                    </div>

                    {/* Employee Search */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Assign To (Employee)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                className={`w-full bg-slate-900 border ${selectedEmployee ? 'border-green-500' : 'border-slate-600'} rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary outline-none`}
                                placeholder="Search Name or Email..."
                                value={employeeId}
                                onChange={(e) => {
                                    setEmployeeId(e.target.value);
                                    setSelectedEmployee(null); // Reset selection on edit
                                }}
                                autoFocus
                            />
                            {searching && <Loader className="absolute right-3 top-3 w-5 h-5 text-slate-500 animate-spin" />}
                        </div>

                        {/* Search Results Dropdown */}
                        {employees.length > 0 && !selectedEmployee && (
                            <div className="absolute w-full max-w-[28rem] bg-slate-800 border border-slate-600 rounded-lg mt-1 shadow-xl z-10 max-h-48 overflow-y-auto">
                                {employees.map(emp => (
                                    <button
                                        key={emp.id}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-white border-b border-slate-700 last:border-0"
                                        onClick={() => selectEmployee(emp)}
                                    >
                                        <div className="font-bold">{emp.full_name}</div>
                                        <div className="text-xs text-slate-400">{emp.email} • {emp.department}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedEmployee && (
                            <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Selected: {selectedEmployee.full_name} ({selectedEmployee.department})
                            </div>
                        )}
                    </div>

                    {/* Charger Selection (only for laptops) */}
                    {hasLaptop && (
                        <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                            <label className="block text-sm font-medium text-yellow-300 mb-3">
                                Laptop Charger
                            </label>

                            {/* Charger Options */}
                            <div className="space-y-3">
                                {/* Default Charger Option */}
                                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${chargerOption === 'default' ? 'bg-green-500/20 border border-green-500/50' : 'bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50'}`}>
                                    <input
                                        type="radio"
                                        name="chargerOption"
                                        value="default"
                                        checked={chargerOption === 'default'}
                                        onChange={() => setChargerOption('default')}
                                        className="w-4 h-4 text-green-500"
                                    />
                                    <div>
                                        <span className="text-white font-medium">Cargador por defecto</span>
                                        <span className="text-sm text-green-400 ml-2">(HP TPN-DA15)</span>
                                    </div>
                                </label>

                                {/* Custom Charger Option */}
                                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${chargerOption === 'custom' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50'}`}>
                                    <input
                                        type="radio"
                                        name="chargerOption"
                                        value="custom"
                                        checked={chargerOption === 'custom'}
                                        onChange={() => setChargerOption('custom')}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white font-medium">Cargador personalizado</span>
                                </label>

                                {/* Custom Charger Fields */}
                                {chargerOption === 'custom' && (
                                    <div className="ml-7 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Marca</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="HP"
                                                value={customChargerBrand}
                                                onChange={(e) => setCustomChargerBrand(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Modelo *</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Modelo del cargador"
                                                value={customChargerModel}
                                                onChange={(e) => setCustomChargerModel(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* No Charger Option */}
                                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${chargerOption === 'none' ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50'}`}>
                                    <input
                                        type="radio"
                                        name="chargerOption"
                                        value="none"
                                        checked={chargerOption === 'none'}
                                        onChange={() => setChargerOption('none')}
                                        className="w-4 h-4 text-red-500"
                                    />
                                    <span className="text-white font-medium">Sin cargador</span>
                                </label>
                            </div>

                            {chargerOption === 'none' && (
                                <p className="text-xs text-yellow-400 mt-3">
                                    ⚠️ Se te avisará antes de asignar sin cargador
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tipo de asignación */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Asignación</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${assignmentType === 'ASIGNACION' ? 'bg-blue-500/20 border-blue-500/60 text-blue-300' : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                <input type="radio" name="assignmentType" value="ASIGNACION" checked={assignmentType === 'ASIGNACION'} onChange={() => setAssignmentType('ASIGNACION')} className="hidden" />
                                <span className="font-medium text-sm">Asignación</span>
                            </label>
                            <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${assignmentType === 'REEMPLAZO' ? 'bg-orange-500/20 border-orange-500/60 text-orange-300' : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                <input type="radio" name="assignmentType" value="REEMPLAZO" checked={assignmentType === 'REEMPLAZO'} onChange={() => setAssignmentType('REEMPLAZO')} className="hidden" />
                                <span className="font-medium text-sm">Reemplazo</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Notes (Optional)</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-primary outline-none h-20 resize-none"
                            placeholder="Condition, extra accessories, etc."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={loading || !selectedEmployee}
                        className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Assigning...' : 'Confirm Assignment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentModal;
