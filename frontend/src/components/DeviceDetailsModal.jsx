import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Settings, AlertTriangle, CheckCircle, PenTool, QrCode, Wrench, Plus, DollarSign, Loader, Edit, Save, XCircle, MapPin } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DeviceDetailsModal = ({ isOpen, onClose, device, onUpdate }) => {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'maintenance'
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedDevice, setEditedDevice] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Maintenance State
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);
    const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
    const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
    const [newLog, setNewLog] = useState({ description: '', cost: 0, vendor: '', status: 'open' });

    useEffect(() => {
        if (isOpen && device) {
            setActiveTab('history');
            setShowMaintenanceForm(false);
            setIsEditMode(false);
            let parsedSpecs = {};
            try {
                if (typeof device.specifications === 'string' && device.specifications.trim().startsWith('{')) {
                    parsedSpecs = JSON.parse(device.specifications);
                } else if (typeof device.specifications === 'object' && device.specifications !== null) {
                    parsedSpecs = device.specifications;
                }
            } catch (e) {
                console.error("Error parsing specs", e);
            }

            setEditedDevice({
                brand: device.brand || '',
                model: device.model || '',
                serial_number: device.serial_number || '',
                barcode: device.barcode || '',
                hostname: device.hostname || '',
                specifications: device.specifications || '',
                location: device.location || 'Callao',
                imei: device.imei || parsedSpecs.imei || '',
                phone_number: device.phone_number || parsedSpecs.phone_number || '',
                carrier: device.carrier || parsedSpecs.carrier || ''
            });
            fetchMaintenanceLogs();
        }
    }, [isOpen, device]);



    const fetchMaintenanceLogs = async () => {
        if (!device) return;
        setIsMaintenanceLoading(true);
        try {
            const res = await axios.get(`${API_URL}/maintenance/device/${device.id}`);
            setMaintenanceLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch maintenance logs", err);
        } finally {
            setIsMaintenanceLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setStatusUpdating(true);
        try {
            await axios.put(`${API_URL}/devices/${device.id}/status`, { status: newStatus });
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            showNotification("Failed to update status", 'error');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleSaveDevice = async () => {
        setIsSaving(true);
        try {
            await axios.put(`${API_URL}/devices/${device.id}`, editedDevice);
            setIsEditMode(false);
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.detail || "Error al guardar cambios", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditedDevice({
            brand: device.brand || '',
            model: device.model || '',
            serial_number: device.serial_number || '',
            barcode: device.barcode || '',
            hostname: device.hostname || '',
            specifications: device.specifications || '',
            location: device.location || 'Callao',
            imei: device.imei || '',
            phone_number: device.phone_number || '',
            carrier: device.carrier || ''
        });
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/maintenance/`, {
                device_id: device.id,
                ...newLog
            });
            setShowMaintenanceForm(false);
            setNewLog({ description: '', cost: 0, vendor: '', status: 'open' });
            fetchMaintenanceLogs();
            onUpdate();
        } catch (err) {
            showNotification("Failed to create ticket", 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString();
    };

    const handleDownload = async (assignmentId) => {
        try {
            const response = await axios.get(`${API_URL}/assignments/${assignmentId}/pdf`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Acta_Entrega_${assignmentId}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Download failed", err);
            showNotification("Error downloading file", 'error');
        }
    };

    if (!isOpen || !device) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-5xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{device.model}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{device.serial_number}</span>
                            <span className="text-slate-400 text-sm">• {device.brand}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Specs Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Device Details</h3>
                                {!isEditMode ? (
                                    <button
                                        onClick={() => setIsEditMode(true)}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-xs transition-colors"
                                    >
                                        <Edit className="w-3 h-3" /> Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveDevice}
                                            disabled={isSaving}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded text-xs transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-xs transition-colors"
                                        >
                                            <XCircle className="w-3 h-3" /> Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
                                {!isEditMode ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-700/50 pb-3">
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Serial Number</p>
                                                <p className="text-white font-mono text-sm">{device.serial_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Barcode</p>
                                                <p className="text-white font-mono text-sm">{device.barcode || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Marca</p>
                                                <p className="text-white text-sm font-bold">{device.brand}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Modelo</p>
                                                <p className="text-white text-sm font-bold">{device.model}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {device.hostname && (
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-slate-400 text-sm flex items-center gap-2"><Settings className="w-3 h-3" /> Hostname</span>
                                                    <span className="text-green-400 font-mono text-sm font-bold">{device.hostname}</span>
                                                </div>
                                            )}
                                            {(device.device_type === 'mobile' || device.device_type === 'chip') && (() => {
                                                let displaySpecs = {};
                                                try {
                                                    if (typeof device.specifications === 'string' && device.specifications.trim().startsWith('{')) {
                                                        displaySpecs = JSON.parse(device.specifications);
                                                    } else if (typeof device.specifications === 'object') {
                                                        displaySpecs = device.specifications || {};
                                                    }
                                                } catch (e) { }

                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-slate-400 text-sm">IMEI</span>
                                                            <span className="text-white font-mono text-sm">{device.imei || displaySpecs.imei || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-slate-400 text-sm">Phone Number</span>
                                                            <span className="text-white font-mono text-sm">{device.phone_number || displaySpecs.phone_number || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-slate-400 text-sm">Carrier</span>
                                                            <span className="text-white text-sm">{device.carrier || displaySpecs.carrier || "-"}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-slate-400 text-sm flex items-center gap-2"><MapPin className="w-3 h-3" /> Sede</span>
                                                <span className="text-blue-400 font-medium text-sm">{device.location || 'Callao'}</span>
                                            </div>
                                        </div>
                                        {device.specifications && (
                                            <div className="pt-3 border-t border-slate-700/50 mt-3">
                                                <p className="text-yellow-400 text-sm font-bold uppercase mb-2 flex items-center gap-2">
                                                    <Settings className="w-4 h-4" /> Especificaciones
                                                </p>
                                                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                                                    {(() => {
                                                        try {
                                                            let specsObj = {};
                                                            if (typeof device.specifications === 'string' && device.specifications.trim().startsWith('{')) {
                                                                specsObj = JSON.parse(device.specifications);
                                                            } else if (typeof device.specifications === 'object') {
                                                                specsObj = device.specifications;
                                                            } else {
                                                                // Plain text fallback
                                                                return <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{device.specifications}</p>;
                                                            }

                                                            // Filter out metadata keys AND accessories (moved to right panel)
                                                            const keysToHide = ['imei', 'phone_number', 'carrier', 'raw_notes', 'Cable USB', 'Auriculares', 'Adaptador Auriculares', 'Case'];
                                                            const validEntries = Object.entries(specsObj).filter(([key]) => !keysToHide.includes(key));

                                                            if (validEntries.length === 0) {
                                                                // If only metadata existed, show nothing or raw notes
                                                                if (specsObj.raw_notes) return <p className="text-slate-200 text-sm whitespace-pre-wrap">{specsObj.raw_notes}</p>;
                                                                return <p className="text-slate-500 text-sm italic">Sin detalles adicionales.</p>;
                                                            }

                                                            return (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                                    {validEntries.map(([key, value]) => (
                                                                        <div key={key} className="flex justify-between md:block border-b border-slate-700/50 md:border-0 pb-1 md:pb-0">
                                                                            <span className="text-slate-400 text-xs uppercase block">{key}</span>
                                                                            <span className="text-white text-sm font-medium">{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        } catch (e) {
                                                            return <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{device.specifications}</p>;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Marca</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.brand}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, brand: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Modelo</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.model}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, model: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Serial Number</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.serial_number}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, serial_number: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Barcode</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.barcode}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, barcode: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-xs uppercase block mb-1">Hostname</label>
                                            <input
                                                type="text"
                                                value={editedDevice.hostname}
                                                onChange={(e) => setEditedDevice({ ...editedDevice, hostname: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        {(device.device_type === 'mobile' || device.device_type === 'chip') && (
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">IMEI</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.imei}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, imei: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Phone Number</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.phone_number}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, phone_number: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Carrier</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.carrier}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, carrier: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-slate-500 text-xs uppercase block mb-1">Sede / Ubicación</label>
                                            <select
                                                value={editedDevice.location}
                                                onChange={(e) => setEditedDevice({ ...editedDevice, location: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="Callao">Callao</option>
                                                <option value="San Isidro">San Isidro</option>
                                                <option value="Mollendo">Mollendo</option>
                                                <option value="Ilo">Ilo</option>
                                                <option value="Pucallpa">Pucallpa</option>
                                                <option value="Chimbote">Chimbote</option>
                                                <option value="Supe">Supe</option>
                                                <option value="Tacna">Tacna</option>
                                                <option value="Casa">Casa (Remoto)</option>
                                                <option value="Oficina">Oficina Central</option>
                                            </select>
                                        </div>
                                        <div className="pt-2 border-t border-slate-700/50">
                                            <label className="text-slate-500 text-xs uppercase block mb-1">Especificaciones</label>
                                            <textarea
                                                value={editedDevice.specifications}
                                                onChange={(e) => setEditedDevice({ ...editedDevice, specifications: e.target.value })}
                                                rows={3}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                                                placeholder="RAM, almacenamiento, procesador..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Status & Actions</h3>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Current Status:</span>
                                    <span className={`px-2 py-1 rounded text-sm font-bold uppercase ${device.status === 'available' ? 'text-green-400 bg-green-500/10' :
                                        device.status === 'assigned' ? 'text-blue-400 bg-blue-500/10' :
                                            'text-red-400 bg-red-500/10'
                                        }`}>
                                        {device.status}
                                    </span>
                                </div>

                                <a
                                    href={`${API_URL}/devices/${device.id}/qr`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded border border-slate-600 transition-colors mb-2 mt-3"
                                >
                                    <QrCode className="w-4 h-4" /> Print Asset Tag
                                </a>

                                {device.status !== 'assigned' && (
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => handleStatusChange('maintenance')}
                                            disabled={statusUpdating || device.status === 'maintenance'}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <Settings className="w-4 h-4" /> Maintenance
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('retired')}
                                            disabled={statusUpdating || device.status === 'retired'}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Retire
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('available')}
                                            disabled={statusUpdating || device.status === 'available'}
                                            className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Mark Available
                                        </button>
                                    </div>
                                )}

                                {((device.device_type === 'laptop' || device.device_type === 'mobile') && device.status === 'assigned') && (
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="text-sm font-bold text-yellow-300 uppercase tracking-wider mb-3">
                                            Cargador de {device.device_type === 'laptop' ? 'Laptop' : 'Celular'}
                                        </div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-500/20 space-y-2">
                                            {device.device_type === 'laptop' ? (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Marca</span>
                                                        <span className="text-white text-sm font-medium">{device.laptop_charger_brand || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Modelo</span>
                                                        <span className="text-white text-sm font-medium">{device.laptop_charger_model || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Serie</span>
                                                        <span className="text-white text-sm font-mono">{device.laptop_charger_serial || "-"}</span>
                                                    </div>
                                                    {!device.laptop_charger_brand && (
                                                        <div className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-700/50">
                                                            * No se ha asignado un cargador específico.
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Marca</span>
                                                        <span className="text-white text-sm font-medium">{device.mobile_charger_brand || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Modelo</span>
                                                        <span className="text-white text-sm font-medium">{device.mobile_charger_model || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-xs uppercase">Serie</span>
                                                        <span className="text-white text-sm font-mono">{device.mobile_charger_serial || "-"}</span>
                                                    </div>
                                                    {!device.mobile_charger_brand && (
                                                        <div className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-700/50">
                                                            * No se ha asignado un cargador específico.
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Mobile Accessories Section */}
                                {(device.device_type === 'mobile' || device.device_type === 'chip') && (() => {
                                    let specs = {};
                                    try {
                                        if (typeof device.specifications === 'string' && device.specifications.trim().startsWith('{')) {
                                            specs = JSON.parse(device.specifications);
                                        } else if (typeof device.specifications === 'object') {
                                            specs = device.specifications || {};
                                        }
                                    } catch (e) { }

                                    const accKeys = ['Cable USB', 'Auriculares', 'Adaptador Auriculares', 'Case'];
                                    const accessories = Object.entries(specs).filter(([key]) => accKeys.includes(key));

                                    if (accessories.length > 0) {
                                        return (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Accesorios Incluidos</div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 space-y-2">
                                                    {accessories.map(([key, value]) => (
                                                        <div key={key} className="flex justify-between items-center">
                                                            <span className="text-slate-400 text-xs uppercase">{key}</span>
                                                            <span className="text-white text-sm font-medium">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {device.device_type === 'monitor' && device.status === 'assigned' && (
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-3">Accesorios del Monitor</div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-purple-500/20 space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-slate-300">Cable de Poder</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-slate-300">Cable HDMI</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div>
                        <div className="flex space-x-4 border-b border-slate-700 mb-4">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                                Assignment History
                            </button>
                            <button
                                onClick={() => setActiveTab('maintenance')}
                                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'maintenance' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                                Maintenance & Repairs
                            </button>
                        </div>

                        {activeTab === 'history' && (
                            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-800 text-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Employee</th>
                                            <th className="px-4 py-3 font-medium">Date Assigned</th>
                                            <th className="px-4 py-3 font-medium">Date Returned</th>
                                            <th className="px-4 py-3 font-medium">Acta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {device.assignments && device.assignments.length > 0 ? (
                                            device.assignments.map((assignment) => (
                                                <tr key={assignment.id} className="hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 text-white font-medium">{assignment.employee.full_name}</td>
                                                    <td className="px-4 py-3">{formatDate(assignment.assigned_date)}</td>
                                                    <td className="px-4 py-3">{formatDate(assignment.returned_date) || "Active"}</td>
                                                    <td className="px-4 py-3">
                                                        {assignment.pdf_acta_path ? (
                                                            <button
                                                                onClick={() => handleDownload(assignment.id)}
                                                                className="text-primary hover:underline flex items-center gap-1"
                                                            >
                                                                <FileText className="w-3 h-3" /> Descargar
                                                            </button>
                                                        ) : "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500 italic">
                                                    No assignment history found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'maintenance' && (
                            <div className="space-y-4">
                                {!showMaintenanceForm ? (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowMaintenanceForm(true)}
                                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Create Ticket
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleCreateTicket} className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-3">
                                        <div className="flex justify-between">
                                            <h4 className="text-white font-bold">New Maintenance Ticket</h4>
                                            <button type="button" onClick={() => setShowMaintenanceForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase">Description</label>
                                            <input
                                                required
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                                value={newLog.description}
                                                onChange={e => setNewLog({ ...newLog, description: e.target.value })}
                                                placeholder="Broken screen, battery replacement..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 uppercase">Vendor</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                                    value={newLog.vendor}
                                                    onChange={e => setNewLog({ ...newLog, vendor: e.target.value })}
                                                    placeholder="Official Store, Local..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 uppercase">Cost ($)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                                    value={newLog.cost}
                                                    onChange={e => setNewLog({ ...newLog, cost: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 rounded font-medium">Create Ticket</button>
                                        </div>
                                    </form>
                                )}

                                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm text-slate-400">
                                        <thead className="bg-slate-800 text-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Date</th>
                                                <th className="px-4 py-3 font-medium">Description</th>
                                                <th className="px-4 py-3 font-medium">Vendor</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {maintenanceLogs.length > 0 ? (
                                                maintenanceLogs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-slate-800/50">
                                                        <td className="px-4 py-3">{formatDate(log.date)}</td>
                                                        <td className="px-4 py-3 text-white">{log.description}</td>
                                                        <td className="px-4 py-3">{log.vendor || "-"}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${log.status === 'open' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-white font-mono">${log.cost}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500 italic">
                                                        No maintenance records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetailsModal;
