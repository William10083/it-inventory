import React, { useState, useEffect, useRef } from 'react';
import { FileText, Search, AlertTriangle, Trash2, Archive, Download, X, Loader, Upload, Image as ImageIcon, Pencil, Save } from 'lucide-react';
import EditDecommissionModal from '../components/EditDecommissionModal';
import FormTemplateSelector from '../components/FormTemplateSelector';
import SaveFormTemplateModal from '../components/SaveFormTemplateModal';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DecommissionPage = () => {
    const { showNotification, showConfirm } = useNotification();
    const searchInputRef = useRef(null);
    const deviceInputRef = useRef(null);
    const serialInputRef = useRef(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Form State
    const [reason, setReason] = useState('');
    const [observations, setObservations] = useState('');
    const [fabricationYear, setFabricationYear] = useState('');
    const [purchaseReason, setPurchaseReason] = useState('');

    // Image State
    const [deviceImageFile, setDeviceImageFile] = useState(null);
    const [serialImageFile, setSerialImageFile] = useState(null);
    const [deviceImagePreview, setDeviceImagePreview] = useState(null);
    const [serialImagePreview, setSerialImagePreview] = useState(null);

    const [processing, setProcessing] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);

    // Template Modal State
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);

    const handleTemplateSelect = (content) => {
        if (content.reason) setReason(content.reason);
        if (content.observations) setObservations(content.observations);
        if (content.purchaseReason) setPurchaseReason(content.purchaseReason);
        if (content.fabricationYear) setFabricationYear(content.fabricationYear);
    };

    // Real-time search with debounce
    useEffect(() => {
        const searchDevices = async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            setSearching(true);
            try {
                const response = await axios.get(`${API_URL}/devices/`, {
                    params: { search: searchTerm, limit: 8 }
                });

                // Filter out RETIRED or SOLD devices
                const candidates = (response.data.items || []).filter(d =>
                    d.status !== 'retired' && d.status !== 'sold'
                );
                setSearchResults(candidates);
                setShowDropdown(candidates.length > 0);
            } catch (error) {
                console.error("Error searching devices:", error);
            } finally {
                setSearching(false);
            }
        };

        const timeoutId = setTimeout(searchDevices, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Load history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    // Cleanup previews
    useEffect(() => {
        return () => {
            if (deviceImagePreview) URL.revokeObjectURL(deviceImagePreview);
            if (serialImagePreview) URL.revokeObjectURL(serialImagePreview);
        };
    }, [deviceImagePreview, serialImagePreview]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await axios.get(`${API_URL}/decommission/`);
            setHistory(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
            showNotification("Error al cargar historial", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSelectDevice = (device) => {
        setSelectedDevice(device);
        setSearchTerm(`${device.brand} ${device.model} - ${device.serial_number}`);
        setShowDropdown(false);
    };

    const handleClearSelection = () => {
        setSelectedDevice(null);
        setSearchTerm('');
        setReason('');
        setObservations('');
        setFabricationYear('');
        setPurchaseReason('');

        // Clear images
        setDeviceImageFile(null);
        setSerialImageFile(null);
        setDeviceImagePreview(null);
        setSerialImagePreview(null);
        if (deviceInputRef.current) deviceInputRef.current.value = '';
        if (serialInputRef.current) serialInputRef.current.value = '';
    };

    const handleImageSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Solo se permiten imágenes', 'error');
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        if (type === 'device') {
            setDeviceImageFile(file);
            setDeviceImagePreview(previewUrl);
        } else {
            setSerialImageFile(file);
            setSerialImagePreview(previewUrl);
        }
    };

    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_URL}/decommission/upload-image`, formData);
        return res.data.file_path;
    };

    const handleDecommission = async (e) => {
        e.preventDefault();
        if (!selectedDevice || !reason) {
            showNotification("Seleccione un equipo e indique el motivo", "warning");
            return;
        }

        const confirmed = await showConfirm(
            `¿Confirmar baja del equipo ${selectedDevice.brand} ${selectedDevice.model} (SN: ${selectedDevice.serial_number})?`
        );
        if (!confirmed) return;

        setProcessing(true);
        try {
            // Upload images first if exist
            let deviceImagePath = null;
            let serialImagePath = null;

            if (deviceImageFile) {
                deviceImagePath = await uploadImage(deviceImageFile);
            }

            if (serialImageFile) {
                serialImagePath = await uploadImage(serialImageFile);
            }

            // Prepare decommission data
            const decommissionData = {
                device_id: selectedDevice.id,
                reason: reason,
                observations: observations,
                fabrication_year: fabricationYear ? parseInt(fabricationYear) : null,
                purchase_reason: purchaseReason || null,
                device_image_path: deviceImagePath,
                serial_image_path: serialImagePath
            };

            await axios.post(`${API_URL}/decommission/`, decommissionData);

            showNotification("✓ Equipo dado de baja correctamente", "success");

            // Reset and refresh
            handleClearSelection();
            fetchHistory();

        } catch (error) {
            console.error("Error creating decommission:", error);
            showNotification(
                error.response?.data?.detail || "Error al procesar la baja",
                "error"
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleDownloadActa = async (item) => {
        if (!item.acta_path) {
            showNotification("Acta no disponible", "warning");
            return;
        }

        try {
            // Use the new download endpoint with cache-buster
            const response = await axios.get(`${API_URL}/decommission/${item.id}/download-acta?t=${new Date().getTime()}`, {
                responseType: 'blob'
            });

            // Extract filename from response headers or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `acta_baja_${item.id}.docx`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob URL and download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showNotification("✓ Acta descargada correctamente", "success");
        } catch (error) {
            console.error("Error downloading acta:", error);
            showNotification(error.response?.data?.detail || "Error al descargar el acta", "error");
        }
    };

    const handleEdit = (item) => {
        setItemToEdit(item);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (item) => {
        const confirmed = await showConfirm(
            `¿Estás seguro de ELIMINAR la baja del equipo ${item.device?.brand} ${item.device?.model}?\n\n⚠️ El equipo volverá a estar DISPONIBLE.`
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/decommission/${item.id}`);
            showNotification("✓ Baja eliminada y equipo restaurado", "success");
            fetchHistory();
        } catch (error) {
            console.error("Error deleting decommission:", error);
            showNotification(error.response?.data?.detail || "Error al eliminar la baja", "error");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Archive className="w-8 h-8 text-red-500" />
                    Bajas de Equipos
                </h1>
                <p className="text-slate-400">
                    Gestión de retiro y disposición final de activos
                </p>
            </div>

            {/* Search Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-400" />
                    Buscar Equipo para Dar de Baja
                </h2>

                <div className="relative" ref={searchInputRef}>
                    <input
                        type="text"
                        placeholder="Escribe serie, modelo, hostname o marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-12 pr-12 py-4 text-white text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />

                    {searching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                        </div>
                    )}

                    {selectedDevice && (
                        <button
                            onClick={handleClearSelection}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && !selectedDevice && (
                        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                            {searchResults.map(device => (
                                <div
                                    key={device.id}
                                    onClick={() => handleSelectDevice(device)}
                                    className="p-4 hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-700 last:border-0"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-white text-lg">{device.brand} {device.model}</div>
                                            <div className="text-sm text-slate-400 font-mono">SN: {device.serial_number}</div>
                                            {device.hostname && (
                                                <div className="text-xs text-slate-500 mt-1">Hostname: {device.hostname}</div>
                                            )}
                                        </div>
                                        <span className={`text-xs px-3 py-1 rounded-full uppercase font-bold ${device.status === 'available' ? 'bg-green-500/20 text-green-400' :
                                            device.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {device.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Device Form */}
                {selectedDevice && (
                    <div className="mt-6 p-6 bg-slate-900 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="mb-6">
                            <div className="text-sm text-slate-400 mb-2">Equipo Seleccionado:</div>
                            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-blue-500/30">
                                <div>
                                    <div className="font-bold text-white text-lg">{selectedDevice.brand} {selectedDevice.model}</div>
                                    <div className="text-sm text-blue-400 font-mono">SN: {selectedDevice.serial_number}</div>
                                </div>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleDecommission} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300">Motivo de Baja *</label>
                                        <FormTemplateSelector onSelect={handleTemplateSelect} />
                                    </div>
                                    <select
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    >
                                        <option value="">Seleccionar motivo...</option>
                                        <option value="Obsolescencia Tecnológica">Obsolescencia Tecnológica</option>
                                        <option value="Daño Irreparable">Daño Irreparable</option>
                                        <option value="Pérdida / Robo">Pérdida / Robo</option>
                                        <option value="Donación">Donación</option>
                                        <option value="Venta como Chatarra">Venta como Chatarra</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Observaciones / Diagnóstico Técnico *</label>
                                <textarea
                                    required
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    rows="4"
                                    placeholder="Detalles sobre el estado del equipo, diagnóstico técnico, o circunstancias de la baja..."
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none"
                                ></textarea>
                            </div>

                            {/* New Fields Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Año de Fabricación</label>
                                    <input
                                        type="number"
                                        min="1990"
                                        max={new Date().getFullYear()}
                                        value={fabricationYear}
                                        onChange={(e) => setFabricationYear(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ej: 2020"
                                    />
                                    {fabricationYear && (
                                        <div className="text-xs text-blue-400 mt-1 font-medium">
                                            ⏱️ Tiempo de uso: {new Date().getFullYear() - parseInt(fabricationYear)} años
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Motivo de Compra</label>
                                    <input
                                        type="text"
                                        value={purchaseReason}
                                        onChange={(e) => setPurchaseReason(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ej: Expansión de equipo, Reemplazo..."
                                    />
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
                                {/* Device Image Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-blue-400" />
                                        Foto del Equipo
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            ref={deviceInputRef}
                                            accept="image/*"
                                            onChange={(e) => handleImageSelect(e, 'device')}
                                            className="hidden"
                                            id="device-image-upload"
                                        />
                                        <label
                                            htmlFor="device-image-upload"
                                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${deviceImagePreview
                                                ? 'border-blue-500 bg-slate-800'
                                                : 'border-slate-600 bg-slate-800 hover:border-blue-500 hover:bg-slate-700'
                                                }`}
                                        >
                                            {deviceImagePreview ? (
                                                <div className="relative w-full h-full p-2">
                                                    <img
                                                        src={deviceImagePreview}
                                                        alt="Device preview"
                                                        className="w-full h-full object-contain rounded"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                                        <span className="text-white text-sm font-medium">Cambiar imagen</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                                    <p className="text-xs text-slate-400">Clic para subir imagen</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Serial Image Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-green-400" />
                                        Foto de la Serie
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            ref={serialInputRef}
                                            accept="image/*"
                                            onChange={(e) => handleImageSelect(e, 'serial')}
                                            className="hidden"
                                            id="serial-image-upload"
                                        />
                                        <label
                                            htmlFor="serial-image-upload"
                                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${serialImagePreview
                                                ? 'border-green-500 bg-slate-800'
                                                : 'border-slate-600 bg-slate-800 hover:border-green-500 hover:bg-slate-700'
                                                }`}
                                        >
                                            {serialImagePreview ? (
                                                <div className="relative w-full h-full p-2">
                                                    <img
                                                        src={serialImagePreview}
                                                        alt="Serial preview"
                                                        className="w-full h-full object-contain rounded"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                                        <span className="text-white text-sm font-medium">Cambiar imagen</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                                    <p className="text-xs text-slate-400">Clic para subir imagen</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 flex gap-3 text-orange-200 text-sm">
                                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold mb-1">⚠️ Acción Irreversible</div>
                                    Al procesar la baja, el equipo cambiará a estado <strong>RETIRED</strong> y no podrá ser asignado nuevamente. Se generará un acta PDF automáticamente.
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsSaveTemplateModalOpen(true)}
                                    className="px-6 py-3 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 font-medium transition-colors border border-blue-800/50 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Plantilla
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-8 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-5 h-5" />
                                            Confirmar Baja
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* History Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        Historial de Bajas
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/30 text-xs uppercase text-slate-400 font-medium border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Equipo</th>
                                <th className="px-6 py-4">Motivo</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Observaciones</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {loadingHistory ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando historial...
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Archive className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        No hay registros de bajas
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{item.device.brand} {item.device.model}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">SN: {item.device.serial_number}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/50">
                                                {item.reason}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {new Date(item.decommission_date).toLocaleDateString('es-PE', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 max-w-xs">
                                            <div className="truncate" title={item.observations}>
                                                {item.observations || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {item.acta_path && (
                                                    <button
                                                        onClick={() => handleDownloadActa(item)}
                                                        title="Descargar Acta"
                                                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-900/20 transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    title="Editar Baja"
                                                    className="text-amber-400 hover:text-amber-300 p-2 rounded-lg hover:bg-amber-900/20 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    title="Eliminar Baja"
                                                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Edit Modal */}
            {isEditModalOpen && itemToEdit && (
                <EditDecommissionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    decommission={itemToEdit}
                    onUpdate={fetchHistory}
                />
            )}

            <SaveFormTemplateModal
                isOpen={isSaveTemplateModalOpen}
                onClose={() => setIsSaveTemplateModalOpen(false)}
                formData={{
                    reason,
                    observations,
                    purchaseReason,
                    fabricationYear
                }}
            />
        </div>
    );
};

export default DecommissionPage;

