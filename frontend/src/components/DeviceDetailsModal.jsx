import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Settings, AlertTriangle, CheckCircle, PenTool, QrCode, Wrench, Plus, DollarSign, Loader, Edit, Save, XCircle, MapPin } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import Modal from './ui/Modal';
import Badge from './ui/Badge';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DeviceDetailsModal = ({ isOpen, onClose, device, onUpdate }) => {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'maintenance'
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedDevice, setEditedDevice] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [displayDevice, setDisplayDevice] = useState(device); // Added this line
    const [mobileModels, setMobileModels] = useState([]);
    const [isCustomModel, setIsCustomModel] = useState(false);

    // Maintenance State
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);
    const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
    const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
    const [newLog, setNewLog] = useState({ description: '', cost: 0, vendor: '', status: 'open' });

    const DEFAULT_SPECS = {
        "PROBOOK 440 G11": "Procesador: Intel(R) Core(TM) Ultra 7 155U (1.70 GHz)\nRAM instalada: 16.0 GB (15.5 GB utilizable)\nAlmacenamiento: 1TB SSD",
        "ELITEBOOK 640 G11": "Procesador: Intel(R) Core(TM) Ultra 7 155U (1.70 GHz)\nRAM instalada: 16.0 GB (15.5 GB utilizable)\nAlmacenamiento: 1TB SSD"
    };

    const getMetrics = (model) => {
        if (!model) return "";
        const upperModel = model.toUpperCase();
        if (upperModel.includes("PROBOOK 440 G11") || upperModel.includes("ELITEBOOK")) {
            return DEFAULT_SPECS["PROBOOK 440 G11"];
        }
        return "";
    };

    useEffect(() => {
        setDisplayDevice(device);
        if (isOpen && device) {
            setActiveTab('history');
            setShowMaintenanceForm(false);
            setIsEditMode(false);
            let parsedSpecs = {};
            let currentSpecs = device.specifications;

            // Apply default if empty
            if (!currentSpecs && device.device_type === 'laptop') {
                currentSpecs = getMetrics(device.model);
            }

            try {
                if (typeof currentSpecs === 'string' && currentSpecs.trim().startsWith('{')) {
                    parsedSpecs = JSON.parse(currentSpecs);
                } else if (typeof currentSpecs === 'object' && currentSpecs !== null) {
                    parsedSpecs = currentSpecs;
                }
            } catch (e) {
                console.error("Error parsing specs", e);
            }

            // For devices that store JSON in specifications (monitor, celular), the textarea
            // shows only the human-readable text (raw_notes), not the full JSON.
            const JSON_SPECS_TYPES = ['monitor', 'mobile', 'celular', 'smartphone', 'chip', 'sim'];
            let specsForTextarea = currentSpecs || '';
            if (JSON_SPECS_TYPES.includes((device.device_type || '').toLowerCase())) {
                try {
                    if (typeof specsForTextarea === 'string' && specsForTextarea.trim().startsWith('{')) {
                        specsForTextarea = JSON.parse(specsForTextarea).raw_notes || '';
                    }
                } catch {}
            }

            setEditedDevice({
                brand: device.brand || '',
                model: device.model || '',
                serial_number: device.serial_number || '',
                barcode: device.barcode || '',
                hostname: device.hostname || '',
                inventory_code: device.inventory_code || '',
                specifications: specsForTextarea,
                location: device.location || 'Callao',
                imei: device.imei || parsedSpecs.imei || '',
                chip_imei: device.chip_imei || parsedSpecs.chip_imei || '',
                phone_number: device.phone_number || parsedSpecs.phone_number || '',
                carrier: device.carrier || parsedSpecs.carrier || '',
                laptop_charger_brand: device.laptop_charger_brand || '',
                laptop_charger_model: device.laptop_charger_model || '',
                laptop_charger_serial: device.laptop_charger_serial || '',
                monitor_accessories: {
                    cable_poder: Boolean(parsedSpecs.cable_poder),
                    cable_hdmi: Boolean(parsedSpecs.cable_hdmi),
                    cable_dp: Boolean(parsedSpecs.cable_dp),
                    base_soporte: Boolean(parsedSpecs.base_soporte),
                },
                mobile_charger_brand: device.mobile_charger_brand || '',
                mobile_charger_model: device.mobile_charger_model || '',
                mobile_charger_serial: device.mobile_charger_serial || '',
                mobile_accessories: {
                    'Cable USB': Boolean(parsedSpecs['Cable USB']),
                    'Auriculares': Boolean(parsedSpecs['Auriculares']),
                    'Adaptador Auriculares': Boolean(parsedSpecs['Adaptador Auriculares']),
                    'Case': Boolean(parsedSpecs['Case']),
                    'Clip de SIM': Boolean(parsedSpecs['Clip de SIM']),
                }
            });
            fetchMaintenanceLogs();
        }
    }, [isOpen, device]);

    useEffect(() => {
        if (isEditMode && displayDevice && displayDevice.device_type === 'celular') {
            axios.get(`${API_URL}/devices/unique-models?device_type=celular`)
                .then(res => {
                    const models = res.data.filter(m => m && m.trim() !== '');
                    setMobileModels(models);
                })
                .catch(err => console.error("Error fetching mobile models:", err));
        }
    }, [isEditMode, displayDevice]);

    const fetchMaintenanceLogs = async () => {
        if (!displayDevice) return; // Changed from device to displayDevice
        setIsMaintenanceLoading(true);
        try {
            const res = await axios.get(`${API_URL}/maintenance/device/${displayDevice.id}`); // Changed from device to displayDevice
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
            await axios.put(`${API_URL}/devices/${displayDevice.id}/status`, { status: newStatus }); // Changed from device to displayDevice
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
            const { monitor_accessories, mobile_accessories, chip_imei, ...payload } = editedDevice;
            if (device.device_type === 'monitor' && monitor_accessories) {
                // payload.specifications contains the raw textarea text (not JSON)
                const textSpecs = (payload.specifications || '').trim();
                const newSpecs = { ...monitor_accessories };
                if (textSpecs) newSpecs.raw_notes = textSpecs;
                payload.specifications = JSON.stringify(newSpecs);
            }
            // Mobile devices: merge accessories into specifications JSON
            const MOBILE_TYPES_SAVE = ['mobile', 'celular', 'smartphone', 'chip', 'sim'];
            if (MOBILE_TYPES_SAVE.includes((device.device_type || '').toLowerCase()) && mobile_accessories) {
                // Parse existing specs to preserve unmanaged keys (e.g. Pantalla, RAM...)
                let existingSpecs = {};
                try {
                    const raw = device.specifications || '';
                    if (raw.trim().startsWith('{')) existingSpecs = JSON.parse(raw);
                } catch {}
                // Remove keys that now have dedicated columns or are managed separately
                const MANAGED_KEYS = ['Cable USB','Auriculares','Adaptador Auriculares','Case','Clip de SIM',
                    'chip_imei','phone_number','carrier','imei','raw_notes'];
                MANAGED_KEYS.forEach(k => delete existingSpecs[k]);
                const textSpecs = (payload.specifications || '').trim();
                const newSpecs = { ...existingSpecs, ...mobile_accessories };
                if (textSpecs) newSpecs.raw_notes = textSpecs;
                payload.specifications = JSON.stringify(newSpecs);
                // chip_imei va en su columna directa
                payload.chip_imei = chip_imei || null;
            }
            // Mochilas don't have serial numbers — exclude to avoid uniqueness conflicts
            if (device.device_type === 'mochila') {
                delete payload.serial_number;
            }
            const response = await axios.put(`${API_URL}/devices/${device.id}`, payload);
            setDisplayDevice(response.data);
            setIsEditMode(false);
            onUpdate();
            showNotification("Dispositivo actualizado correctamente", 'success');
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.detail || "Error al guardar cambios", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        const JSON_SPECS_TYPES_CANCEL = ['monitor', 'mobile', 'celular', 'smartphone', 'chip', 'sim'];
        let cancelParsedSpecs = {};
        let cancelSpecsForTextarea = device.specifications || '';
        try {
            const s = device.specifications;
            if (typeof s === 'string' && s.trim().startsWith('{')) {
                cancelParsedSpecs = JSON.parse(s);
                if (JSON_SPECS_TYPES_CANCEL.includes((device.device_type || '').toLowerCase())) {
                    cancelSpecsForTextarea = cancelParsedSpecs.raw_notes || '';
                }
            } else if (typeof s === 'object' && s !== null) {
                cancelParsedSpecs = s;
            }
        } catch {}
        setEditedDevice({
            brand: device.brand || '',
            model: device.model || '',
            serial_number: device.serial_number || '',
            barcode: device.barcode || '',
            hostname: device.hostname || '',
            inventory_code: device.inventory_code || '',
            specifications: cancelSpecsForTextarea,
            location: device.location || 'Callao',
            imei: device.imei || '',
            chip_imei: device.chip_imei || cancelParsedSpecs.chip_imei || '',
            phone_number: device.phone_number || '',
            carrier: device.carrier || '',
            monitor_accessories: {
                cable_poder: Boolean(cancelParsedSpecs.cable_poder),
                cable_hdmi: Boolean(cancelParsedSpecs.cable_hdmi),
                cable_dp: Boolean(cancelParsedSpecs.cable_dp),
                base_soporte: Boolean(cancelParsedSpecs.base_soporte),
            },
            mobile_charger_brand: device.mobile_charger_brand || '',
            mobile_charger_model: device.mobile_charger_model || '',
            mobile_charger_serial: device.mobile_charger_serial || '',
            mobile_accessories: {
                'Cable USB': Boolean(cancelParsedSpecs['Cable USB']),
                'Auriculares': Boolean(cancelParsedSpecs['Auriculares']),
                'Adaptador Auriculares': Boolean(cancelParsedSpecs['Adaptador Auriculares']),
                'Case': Boolean(cancelParsedSpecs['Case']),
                'Clip de SIM': Boolean(cancelParsedSpecs['Clip de SIM']),
            }
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

    const handleDownload = async (assignmentId, employeeName, assignedDate, isMobile) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/assignments/${assignmentId}/download-acta?token=${token}`, {
                responseType: 'blob',
            });
            const tipo = isMobile ? 'ACTA DE ENTREGA CELULAR' : 'ACTA DE ENTREGA EQUIPO COMPUTO';
            const nombre = (employeeName || '').toUpperCase();
            const fecha = assignedDate
                ? new Date(assignedDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                : '';
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${tipo} - ${nombre} - ${fecha}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Download failed", err);
            showNotification("Error downloading file", 'error');
        }
    };

    if (!isOpen || !device || !displayDevice) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy="device-details-title">
            <Modal.Header>
                <div>
                    <h2 id="device-details-title" className="text-2xl font-bold text-text">{displayDevice.model}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-accent font-mono bg-accent/10 px-2 py-0.5 rounded">{displayDevice.serial_number}</span>
                        <span className="text-muted text-sm">• {displayDevice.brand}</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </Modal.Header>

            <Modal.Body>
                    {/* Specs Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-accent uppercase tracking-wider">Detalles del equipo</h3>
                                {!isEditMode ? (
                                    <button
                                        onClick={() => setIsEditMode(true)}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-accent border border-blue-500/20 rounded text-xs transition-colors"
                                    >
                                        <Edit className="w-3 h-3" /> Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveDevice}
                                            disabled={isSaving}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20 rounded text-xs transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded text-xs transition-colors"
                                        >
                                            <XCircle className="w-3 h-3" /> Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-bg/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                                {!isEditMode ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-3">
                                            {displayDevice.device_type !== 'mochila' && (
                                                <div>
                                                    <p className="text-slate-500 text-xs uppercase">Serial Number</p>
                                                    <p className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.serial_number}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Barcode</p>
                                                <p className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.barcode || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Marca</p>
                                                <p className="text-slate-900 dark:text-white text-sm font-bold">{displayDevice.brand}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs uppercase">Modelo</p>
                                                <p className="text-slate-900 dark:text-white text-sm font-bold">{displayDevice.model}</p>
                                            </div>
                                            {displayDevice.device_type === 'chip' && (
                                                <div className="col-span-2">
                                                    <p className="text-slate-500 text-xs uppercase">IMEI</p>
                                                    <p className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.imei || "-"}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {displayDevice.hostname && !['monitor', 'mochila', 'auriculares', 'kit teclado/mouse'].includes(displayDevice.device_type) && !['mobile', 'celular', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase()) && (
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted text-sm flex items-center gap-2"><Settings className="w-3 h-3" /> Hostname</span>
                                                    <span className="text-green-600 dark:text-green-400 font-mono text-sm font-bold">{displayDevice.hostname}</span>
                                                </div>
                                            )}
                                            {['monitor', 'mochila', 'auriculares', 'kit teclado/mouse'].includes(displayDevice.device_type) && (
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted text-sm flex items-center gap-2"><Settings className="w-3 h-3" /> Código de Inventario</span>
                                                    <span className="text-green-600 dark:text-green-400 font-mono text-sm font-bold">{displayDevice.inventory_code || '-'}</span>
                                                </div>
                                            )}
                                            {displayDevice.device_type === 'celular' && (
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted text-sm flex items-center gap-2"><Settings className="w-3 h-3" /> IMEI</span>
                                                    <span className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.imei || "-"}</span>
                                                </div>
                                            )}
                                            {(['mobile', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase())) && (() => {
                                                let displaySpecs = {};
                                                try {
                                                    if (typeof displayDevice.specifications === 'string' && displayDevice.specifications.trim().startsWith('{')) {
                                                        displaySpecs = JSON.parse(displayDevice.specifications);
                                                    } else if (typeof displayDevice.specifications === 'object') {
                                                        displaySpecs = displayDevice.specifications || {};
                                                    }
                                                } catch (e) { }

                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-muted text-sm">IMEI</span>
                                                            <span className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.imei || displaySpecs.imei || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-muted text-sm">Phone Number</span>
                                                            <span className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.phone_number || displaySpecs.phone_number || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-muted text-sm">Carrier</span>
                                                            <span className="text-slate-900 dark:text-white text-sm">{displayDevice.carrier || displaySpecs.carrier || "-"}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted text-sm flex items-center gap-2"><MapPin className="w-3 h-3" /> Sede</span>
                                                <span className="text-accent font-medium text-sm">{displayDevice.location || 'Callao'}</span>
                                            </div>
                                        </div>
                                        {displayDevice.device_type !== 'celular' && (displayDevice.specifications || getMetrics(displayDevice.model)) && (
                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50 mt-3">
                                                <p className="text-accent text-sm font-bold uppercase mb-2 flex items-center gap-2">
                                                    <Settings className="w-4 h-4" /> Especificaciones
                                                </p>
                                                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                                                    {(() => {
                                                        const specsToDisplay = displayDevice.specifications || getMetrics(displayDevice.model);
                                                        try {
                                                            let specsObj = {};
                                                            if (typeof specsToDisplay === 'string' && specsToDisplay.trim().startsWith('{')) {
                                                                specsObj = JSON.parse(specsToDisplay);
                                                            } else if (typeof specsToDisplay === 'object') {
                                                                specsObj = specsToDisplay;
                                                            } else {
                                                                // Plain text fallback
                                                                return <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{specsToDisplay}</p>;
                                                            }

                                                            // Filter out metadata keys AND accessories (moved to right panel)
                                                            const keysToHide = ['imei', 'phone_number', 'carrier', 'chip_imei', 'raw_notes', 'Cable USB', 'Auriculares', 'Adaptador Auriculares', 'Case', 'Clip de SIM', 'cable_poder', 'cable_hdmi', 'cable_dp', 'base_soporte'];
                                                            const validEntries = Object.entries(specsObj).filter(([key]) => !keysToHide.includes(key));


                                                            if (validEntries.length === 0) {
                                                                // If only metadata existed, show nothing or raw notes
                                                                if (specsObj.raw_notes) return <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap">{specsObj.raw_notes}</p>;
                                                                return <p className="text-slate-500 text-sm italic">Sin detalles adicionales.</p>;
                                                            }

                                                            return (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                                    {validEntries.map(([key, value]) => (
                                                                        <div key={key} className="flex justify-between md:block border-b border-slate-200 dark:border-slate-700/50 md:border-0 pb-1 md:pb-0">
                                                                            <span className="text-muted text-xs uppercase block">{key}</span>
                                                                            <span className="text-slate-900 dark:text-white text-sm font-medium">{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        } catch (e) {
                                                            return <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{specsToDisplay}</p>;
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
                                                    className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Modelo</label>
                                                {displayDevice.device_type === 'celular' && !isCustomModel ? (
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                            value={editedDevice.model}
                                                            onChange={e => {
                                                                if (e.target.value === '___custom___') {
                                                                    setIsCustomModel(true);
                                                                    setEditedDevice({ ...editedDevice, model: '' });
                                                                } else {
                                                                    setEditedDevice({ ...editedDevice, model: e.target.value });
                                                                }
                                                            }}
                                                        >
                                                            <option value="" disabled>Seleccionar modelo</option>
                                                            {mobileModels.map(m => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                            <option value="___custom___" className="text-yellow-600 dark:text-yellow-400 font-bold">+ Personalizado...</option>
                                                        </select>
                                                    </div>
                                                ) : displayDevice.device_type === 'celular' && isCustomModel ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={editedDevice.model}
                                                            onChange={(e) => setEditedDevice({ ...editedDevice, model: e.target.value })}
                                                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder="e.g. Galaxy S24"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsCustomModel(false);
                                                                setEditedDevice({ ...editedDevice, model: mobileModels.length > 0 ? mobileModels[0] : '' });
                                                            }}
                                                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 rounded"
                                                            title="Volver a lista"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={editedDevice.model}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, model: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {displayDevice.device_type !== 'mochila' && (
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Serial Number</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.serial_number}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, serial_number: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Barcode</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.barcode}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, barcode: e.target.value })}
                                                    className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        {['monitor', 'mochila', 'auriculares', 'kit teclado/mouse'].includes(displayDevice.device_type) ? (
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Código de Inventario</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.inventory_code || ''}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, inventory_code: e.target.value })}
                                                    className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        ) : !['mobile', 'celular', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase()) ? (
                                            <div>
                                                <label className="text-slate-500 text-xs uppercase block mb-1">Hostname</label>
                                                <input
                                                    type="text"
                                                    value={editedDevice.hostname}
                                                    onChange={(e) => setEditedDevice({ ...editedDevice, hostname: e.target.value })}
                                                    className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        ) : null}
                                        {displayDevice.device_type === 'celular' && (
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">IMEI</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.imei || ''}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, imei: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {(['mobile', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase())) && (
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">IMEI</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.imei}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, imei: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Phone Number</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.phone_number}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, phone_number: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Carrier</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.carrier}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, carrier: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-slate-500 text-xs uppercase block mb-1">Sede / Ubicación</label>
                                            <select
                                                value={editedDevice.location}
                                                onChange={(e) => setEditedDevice({ ...editedDevice, location: e.target.value })}
                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
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

                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                            <label className="text-slate-500 text-xs uppercase block mb-1">Especificaciones</label>
                                            <textarea
                                                value={editedDevice.specifications}
                                                onChange={(e) => setEditedDevice({ ...editedDevice, specifications: e.target.value })}
                                                rows={3}
                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                                                placeholder="RAM, almacenamiento, procesador..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chip / SIM card — solo celular */}
                            {displayDevice.device_type === 'celular' && (() => {
                                let chipSpecs = {};
                                try {
                                    const s = displayDevice.specifications;
                                    if (typeof s === 'string' && s.trim().startsWith('{')) chipSpecs = JSON.parse(s);
                                } catch {}
                                return (
                                    <div className="bg-bg/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                                        <p className="text-accent text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Settings className="w-4 h-4" /> Chip / SIM
                                        </p>
                                        {!isEditMode ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted text-sm">IMEI Chip</span>
                                                    <span className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.chip_imei || chipSpecs.chip_imei || "-"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted text-sm">Número</span>
                                                    <span className="text-slate-900 dark:text-white font-mono text-sm">{displayDevice.phone_number || chipSpecs.phone_number || "-"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted text-sm">Operadora</span>
                                                    <span className="text-slate-900 dark:text-white text-sm">{displayDevice.carrier || chipSpecs.carrier || "-"}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">IMEI Chip</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.chip_imei || ''}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, chip_imei: e.target.value })}
                                                        className="w-full bg-bg border border-yellow-700/50 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm font-mono focus:border-yellow-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Número</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.phone_number || ''}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, phone_number: e.target.value })}
                                                        className="w-full bg-bg border border-yellow-700/50 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 text-xs uppercase block mb-1">Operadora</label>
                                                    <input
                                                        type="text"
                                                        value={editedDevice.carrier || ''}
                                                        onChange={(e) => setEditedDevice({ ...editedDevice, carrier: e.target.value })}
                                                        className="w-full bg-bg border border-yellow-700/50 rounded px-2 py-1.5 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-accent uppercase tracking-wider">Estado y acciones</h3>
                            <div className="bg-bg/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted">Estado actual:</span>
                                    <Badge variant={displayDevice.status}>{displayDevice.status}</Badge>
                                </div>

                                <a
                                    href={`${API_URL}/devices/${displayDevice.id}/qr`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2 rounded border border-slate-300 dark:border-slate-600 transition-colors mb-2 mt-3"
                                >
                                    <QrCode className="w-4 h-4" /> Imprimir etiqueta
                                </a>

                                {displayDevice.status === 'sold' && displayDevice.sale && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="text-sm font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Vendido a
                                        </div>
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-1.5 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted">Comprador:</span>
                                                <span className="text-slate-900 dark:text-white font-medium">{displayDevice.sale.buyer_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted">DNI:</span>
                                                <span className="text-slate-900 dark:text-white font-mono">{displayDevice.sale.buyer_dni}</span>
                                            </div>
                                            {displayDevice.sale.buyer_email && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted">Correo:</span>
                                                    <span className="text-slate-900 dark:text-white">{displayDevice.sale.buyer_email}</span>
                                                </div>
                                            )}
                                            {displayDevice.sale.buyer_phone && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted">Teléfono:</span>
                                                    <span className="text-slate-900 dark:text-white">{displayDevice.sale.buyer_phone}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted">Fecha de venta:</span>
                                                <span className="text-slate-900 dark:text-white">{formatDate(displayDevice.sale.sale_date)}</span>
                                            </div>
                                            {displayDevice.sale.sale_price != null && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted">Precio:</span>
                                                    <span className="text-slate-900 dark:text-white font-medium">{displayDevice.sale.sale_price}</span>
                                                </div>
                                            )}
                                            {displayDevice.sale.acta_path && (
                                                <a
                                                    href={`${API_URL}/sales/${displayDevice.sale.id}/download-acta`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-accent hover:underline text-xs pt-1"
                                                >
                                                    <FileText className="w-3 h-3" /> Ver acta de venta
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {displayDevice.status !== 'assigned' && (
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => handleStatusChange('maintenance')}
                                            disabled={statusUpdating || displayDevice.status === 'maintenance'}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <Settings className="w-4 h-4" /> Maintenance
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('retired')}
                                            disabled={statusUpdating || displayDevice.status === 'retired'}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Retire
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('available')}
                                            disabled={statusUpdating || displayDevice.status === 'available'}
                                            className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Mark Available
                                        </button>
                                    </div>
                                )}

                                {((displayDevice.device_type === 'laptop' || ['mobile', 'celular', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase()))) && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider mb-3">
                                            Cargador de {displayDevice.device_type === 'laptop' ? 'Laptop' : 'Celular'}
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-yellow-500/20 space-y-2">
                                            {displayDevice.device_type === 'laptop' ? (
                                                !isEditMode ? (
                                                    <>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted text-xs uppercase">Marca</span>
                                                            <span className="text-slate-900 dark:text-white text-sm font-medium">{displayDevice.laptop_charger_brand || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted text-xs uppercase">Modelo</span>
                                                            <span className="text-slate-900 dark:text-white text-sm font-medium">{displayDevice.laptop_charger_model || "-"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted text-xs uppercase">Serie</span>
                                                            <span className="text-slate-900 dark:text-white text-sm font-mono">{displayDevice.laptop_charger_serial || "-"}</span>
                                                        </div>
                                                        {!displayDevice.laptop_charger_brand && (
                                                            <div className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                                                                * No se ha asignado un cargador específico.
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-slate-500 text-xs uppercase block mb-1">Marca</label>
                                                            <input
                                                                type="text"
                                                                value={editedDevice.laptop_charger_brand || ''}
                                                                onChange={(e) => setEditedDevice({ ...editedDevice, laptop_charger_brand: e.target.value })}
                                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-slate-500 text-xs uppercase block mb-1">Modelo</label>
                                                            <input
                                                                type="text"
                                                                value={editedDevice.laptop_charger_model || ''}
                                                                onChange={(e) => setEditedDevice({ ...editedDevice, laptop_charger_model: e.target.value })}
                                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-slate-500 text-xs uppercase block mb-1">Serie</label>
                                                            <input
                                                                type="text"
                                                                value={editedDevice.laptop_charger_serial || ''}
                                                                onChange={(e) => setEditedDevice({ ...editedDevice, laptop_charger_serial: e.target.value })}
                                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            ) : !isEditMode ? (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted text-xs uppercase">Marca</span>
                                                        <span className="text-slate-900 dark:text-white text-sm font-medium">{displayDevice.mobile_charger_brand || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted text-xs uppercase">Modelo</span>
                                                        <span className="text-slate-900 dark:text-white text-sm font-medium">{displayDevice.mobile_charger_model || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted text-xs uppercase">Serie</span>
                                                        <span className="text-slate-900 dark:text-white text-sm font-mono">{displayDevice.mobile_charger_serial || "-"}</span>
                                                    </div>
                                                    {!displayDevice.mobile_charger_brand && (
                                                        <div className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                                                            * No se ha asignado un cargador específico.
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-slate-500 text-xs uppercase block mb-1">Marca</label>
                                                        <input
                                                            type="text"
                                                            value={editedDevice.mobile_charger_brand || ''}
                                                            onChange={(e) => setEditedDevice({ ...editedDevice, mobile_charger_brand: e.target.value })}
                                                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-xs uppercase block mb-1">Modelo</label>
                                                        <input
                                                            type="text"
                                                            value={editedDevice.mobile_charger_model || ''}
                                                            onChange={(e) => setEditedDevice({ ...editedDevice, mobile_charger_model: e.target.value })}
                                                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-xs uppercase block mb-1">Serie</label>
                                                        <input
                                                            type="text"
                                                            value={editedDevice.mobile_charger_serial || ''}
                                                            onChange={(e) => setEditedDevice({ ...editedDevice, mobile_charger_serial: e.target.value })}
                                                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Mobile Accessories Section */}
                                {(['mobile', 'celular', 'smartphone', 'chip', 'sim'].includes((displayDevice.device_type || '').toLowerCase())) && (() => {
                                    const MOBILE_ACCS = [
                                        'Cable USB', 'Auriculares', 'Adaptador Auriculares',
                                        'Case', 'Clip de SIM'
                                    ];
                                    if (!isEditMode) {
                                        let specs = {};
                                        try {
                                            const s = displayDevice.specifications;
                                            if (typeof s === 'string' && s.trim().startsWith('{')) specs = JSON.parse(s);
                                            else if (typeof s === 'object' && s !== null) specs = s;
                                        } catch {}
                                        const hasAny = MOBILE_ACCS.some(k => specs[k]);
                                        if (!hasAny) return null;
                                        return (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Accesorios Incluidos</div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 space-y-2">
                                                    {MOBILE_ACCS.map(key => (
                                                        <div key={key} className="flex items-center gap-2 text-sm">
                                                            {specs[key]
                                                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                                                : <XCircle className="w-4 h-4 text-slate-600" />
                                                            }
                                                            <span className={specs[key] ? 'text-slate-300' : 'text-slate-600'}>{key}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Accesorios Incluidos</div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 space-y-2">
                                                    {MOBILE_ACCS.map(key => (
                                                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(editedDevice.mobile_accessories?.[key])}
                                                                onChange={() => setEditedDevice(prev => ({
                                                                    ...prev,
                                                                    mobile_accessories: {
                                                                        ...prev.mobile_accessories,
                                                                        [key]: !prev.mobile_accessories?.[key]
                                                                    }
                                                                }))}
                                                                className="rounded accent-blue-400"
                                                            />
                                                            <span className="text-slate-300">{key}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}

                                {displayDevice.device_type === 'monitor' && (() => {
                                    const MONITOR_ACCS = [
                                        { key: 'cable_poder', label: 'Cable de Poder' },
                                        { key: 'cable_hdmi', label: 'Cable HDMI' },
                                    ];
                                    if (!isEditMode) {
                                        let specs = {};
                                        try {
                                            const s = displayDevice.specifications;
                                            if (typeof s === 'string' && s.trim().startsWith('{')) specs = JSON.parse(s);
                                            else if (typeof s === 'object' && s !== null) specs = s;
                                        } catch {}
                                        return (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-3">Accesorios del Monitor</div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg border border-purple-500/20 space-y-2">
                                                    {MONITOR_ACCS.map(acc => (
                                                        <div key={acc.key} className="flex items-center gap-2 text-sm">
                                                            {specs[acc.key]
                                                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                                                : <XCircle className="w-4 h-4 text-slate-600" />
                                                            }
                                                            <span className={specs[acc.key] ? 'text-slate-300' : 'text-slate-600'}>{acc.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-3">Accesorios del Monitor</div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg border border-purple-500/20 space-y-2">
                                                    {MONITOR_ACCS.map(acc => (
                                                        <label key={acc.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(editedDevice.monitor_accessories?.[acc.key])}
                                                                onChange={() => setEditedDevice(prev => ({
                                                                    ...prev,
                                                                    monitor_accessories: {
                                                                        ...prev.monitor_accessories,
                                                                        [acc.key]: !prev.monitor_accessories?.[acc.key]
                                                                    }
                                                                }))}
                                                                className="rounded accent-purple-400"
                                                            />
                                                            <span className="text-slate-300">{acc.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}

                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div>
                        <div className="flex space-x-4 border-b border-slate-700 mb-4">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-accent text-slate-900 dark:text-white' : 'border-transparent text-muted hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Assignment History
                            </button>
                            <button
                                onClick={() => setActiveTab('maintenance')}
                                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'maintenance' ? 'border-orange-500 text-slate-900 dark:text-white' : 'border-transparent text-muted hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Maintenance & Repairs
                            </button>
                        </div>

                        {activeTab === 'history' && (
                            <div className="bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm text-muted">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Employee</th>
                                            <th className="px-4 py-3 font-medium">Date Assigned</th>
                                            <th className="px-4 py-3 font-medium">Date Returned</th>
                                            <th className="px-4 py-3 font-medium">Acta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {device.assignments && device.assignments.length > 0 ? (
                                            device.assignments.map((assignment) => (
                                                <tr key={assignment.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{assignment.employee?.full_name}</td>
                                                    <td className="px-4 py-3">{formatDate(assignment.assigned_date)}</td>
                                                    <td className="px-4 py-3">{formatDate(assignment.returned_date) || "Active"}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            {assignment.pdf_acta_path ? (
                                                                <button
                                                                    onClick={() => handleDownload(
                                                                        assignment.id,
                                                                        assignment.employee?.full_name,
                                                                        assignment.assigned_date,
                                                                        ['mobile','chip','celular','smartphone','sim'].includes((device.device_type || '').toLowerCase())
                                                                    )}
                                                                    className="text-accent hover:underline flex items-center gap-1 text-xs whitespace-nowrap"
                                                                >
                                                                    <FileText className="w-3 h-3" /> Ingreso
                                                                </button>
                                                            ) : null}
                                                            {!assignment.pdf_acta_path && "-"}
                                                        </div>
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
                                    <form onSubmit={handleCreateTicket} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg space-y-3">
                                        <div className="flex justify-between">
                                            <h4 className="text-slate-900 dark:text-white font-bold">New Maintenance Ticket</h4>
                                            <button type="button" onClick={() => setShowMaintenanceForm(false)} className="text-muted hover:text-slate-900 dark:hover:text-white"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted uppercase">Description</label>
                                            <input
                                                required
                                                className="w-full bg-bg dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm"
                                                value={newLog.description}
                                                onChange={e => setNewLog({ ...newLog, description: e.target.value })}
                                                placeholder="Broken screen, battery replacement..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-muted uppercase">Vendor</label>
                                                <input
                                                    className="w-full bg-bg dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm"
                                                    value={newLog.vendor}
                                                    onChange={e => setNewLog({ ...newLog, vendor: e.target.value })}
                                                    placeholder="Official Store, Local..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted uppercase">Cost ($)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-bg dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm"
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

                                <div className="bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm text-muted">
                                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Date</th>
                                                <th className="px-4 py-3 font-medium">Description</th>
                                                <th className="px-4 py-3 font-medium">Vendor</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {maintenanceLogs.length > 0 ? (
                                                maintenanceLogs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-3">{formatDate(log.date)}</td>
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white">{log.description}</td>
                                                        <td className="px-4 py-3">{log.vendor || "-"}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${log.status === 'open' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-green-500/20 text-green-700 dark:text-green-400'}`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-mono">${log.cost}</td>
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
            </Modal.Body>
        </Modal>
    );
};

export default DeviceDetailsModal;
