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
            <div className="mb-8 relative">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-500/10 blur-3xl -z-10 rounded-full opacity-20 transform -translate-x-1/2"></div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 mb-2 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Archive className="w-8 h-8 text-blue-400" />
                    </div>
                    Bajas de Equipos
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl border-l-2 border-blue-500/30 pl-4 ml-2">
                    Gestión de retiro y disposición final de activos tecnológicos.
                </p>
            </div>

            {/* Search Section */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8 shadow-2xl relative overflow-visible group z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-blue-500/20 rounded-lg shadow-inner">
                        <Search className="w-5 h-5 text-blue-400" />
                    </div>
                    Buscar Equipo para Dar de Baja
                </h2>

                <div className="relative z-10 max-w-3xl mx-auto" ref={searchInputRef}>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar por serie, modelo, hostname..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            className="w-full bg-slate-950/50 border border-slate-600/50 text-white text-lg rounded-full py-4 pl-14 pr-14 focus:outline-none focus:border-blue-500/50 focus:bg-slate-950/80 transition-all duration-300 placeholder:text-slate-500 shadow-inner group-hover:border-slate-500/50"
                        />
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
                        </div>

                        {searching && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                            </div>
                        )}

                        {selectedDevice && (
                            <button
                                onClick={handleClearSelection}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all duration-200"
                                title="Limpiar búsqueda"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && !selectedDevice && (
                        <div className="absolute z-[100] w-full mt-3 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl max-h-96 overflow-y-auto overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.map((device, index) => (
                                <div
                                    key={device.id}
                                    onClick={() => handleSelectDevice(device)}
                                    className={`p-4 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0 group ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{device.brand} {device.model}</div>
                                            <div className="text-sm text-slate-400 font-mono flex items-center gap-2 mt-1">
                                                <span className="bg-slate-900 px-2 py-0.5 rounded text-xs border border-slate-700">SN</span>
                                                {device.serial_number}
                                            </div>
                                            {device.hostname && (
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {device.hostname}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-xs px-3 py-1.5 rounded-full uppercase font-bold tracking-wider ${device.status === 'available' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            device.status === 'assigned' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
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
                    <div className="mt-8 p-8 bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>

                        <div className="mb-8">
                            <div className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                Equipo Seleccionado
                            </div>
                            <div className="flex items-center justify-between p-6 bg-slate-900/50 rounded-xl border border-blue-500/20 shadow-inner group transition-all hover:border-blue-500/40">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                                        <Archive className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-xl group-hover:text-blue-400 transition-colors">{selectedDevice.brand} {selectedDevice.model}</div>
                                        <div className="text-sm text-slate-400 font-mono mt-1 flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs border border-slate-700">SN</span>
                                            {selectedDevice.serial_number}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-slate-500 hover:text-white p-3 hover:bg-red-500/20 hover:border-red-500/50 border border-transparent rounded-xl transition-all duration-300 group/close"
                                    title="Cancelar selección"
                                >
                                    <X className="w-5 h-5 group-hover/close:rotate-90 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleDecommission} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300">Motivo de Baja *</label>
                                        <FormTemplateSelector onSelect={handleTemplateSelect} />
                                    </div>
                                    <div className="relative">
                                        <select
                                            required
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-slate-900/80"
                                        >
                                            <option value="">Seleccionar motivo...</option>
                                            <option value="Obsolescencia Tecnológica">Obsolescencia Tecnológica</option>
                                            <option value="Daño Irreparable">Daño Irreparable</option>
                                            <option value="Pérdida / Robo">Pérdida / Robo</option>
                                            <option value="Donación">Donación</option>
                                            <option value="Venta como Chatarra">Venta como Chatarra</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300">Observaciones / Diagnóstico Técnico *</label>
                                <textarea
                                    required
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    rows="4"
                                    placeholder="Detalles sobre el estado del equipo, diagnóstico técnico, o circunstancias de la baja..."
                                    className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all resize-none placeholder:text-slate-600 hover:bg-slate-900/80"
                                ></textarea>
                            </div>

                            {/* New Fields Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-700/50">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-300">Año de Fabricación</label>
                                    <input
                                        type="number"
                                        min="1990"
                                        max={new Date().getFullYear()}
                                        value={fabricationYear}
                                        onChange={(e) => setFabricationYear(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all hover:bg-slate-900/80"
                                        placeholder="Ej: 2020"
                                    />
                                    {fabricationYear && (
                                        <div className="text-xs text-blue-400 mt-2 font-medium flex items-center gap-1.5 bg-blue-500/10 p-2 rounded-lg w-fit">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                            Tiempo de uso: {new Date().getFullYear() - parseInt(fabricationYear)} años
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-300">Motivo de Compra</label>
                                    <input
                                        type="text"
                                        value={purchaseReason}
                                        onChange={(e) => setPurchaseReason(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all hover:bg-slate-900/80"
                                        placeholder="Ej: Expansión de equipo, Reemplazo..."
                                    />
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-700/50">
                                {/* Device Image Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <div className="p-1 bg-blue-500/20 rounded">
                                            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        Foto del Equipo
                                    </label>
                                    <div className="relative group perspective-1000">
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
                                            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 transform group-hover:scale-[1.02] ${deviceImagePreview
                                                ? 'border-blue-500/50 bg-slate-900/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                                : 'border-slate-600/50 bg-slate-900/30 hover:border-blue-500/50 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            {deviceImagePreview ? (
                                                <div className="relative w-full h-full p-2 group/preview">
                                                    <img
                                                        src={deviceImagePreview}
                                                        alt="Device preview"
                                                        className="w-full h-full object-contain rounded-xl"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover/preview:opacity-100 flex flex-col items-center justify-center transition-all duration-300 rounded-xl backdrop-blur-sm">
                                                        <ImageIcon className="w-8 h-8 text-blue-400 mb-2" />
                                                        <span className="text-white text-sm font-medium">Cambiar imagen</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
                                                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium">Clic para subir imagen</p>
                                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG (Max 5MB)</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Serial Image Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <div className="p-1 bg-green-500/20 rounded">
                                            <FileText className="w-3.5 h-3.5 text-green-400" />
                                        </div>
                                        Foto de la Serie
                                    </label>
                                    <div className="relative group perspective-1000">
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
                                            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 transform group-hover:scale-[1.02] ${serialImagePreview
                                                ? 'border-green-500/50 bg-slate-900/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                                                : 'border-slate-600/50 bg-slate-900/30 hover:border-green-500/50 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            {serialImagePreview ? (
                                                <div className="relative w-full h-full p-2 group/preview">
                                                    <img
                                                        src={serialImagePreview}
                                                        alt="Serial preview"
                                                        className="w-full h-full object-contain rounded-xl"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover/preview:opacity-100 flex flex-col items-center justify-center transition-all duration-300 rounded-xl backdrop-blur-sm">
                                                        <ImageIcon className="w-8 h-8 text-green-400 mb-2" />
                                                        <span className="text-white text-sm font-medium">Cambiar imagen</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-green-500/20 transition-colors">
                                                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-green-400 transition-colors" />
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium">Clic para subir imagen</p>
                                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG (Max 5MB)</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 rounded-xl p-5 flex gap-4 text-orange-100 text-sm shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -z-10"></div>
                                <div className="p-2 bg-red-500/20 h-fit rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                </div>
                                <div>
                                    <div className="font-bold mb-1 text-red-400 text-lg">⚠️ Acción Irreversible</div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Al procesar la baja, el equipo cambiará a estado <strong className="text-white bg-red-500/30 px-1.5 py-0.5 rounded text-xs border border-red-500/50">RETIRED</strong> y no podrá ser asignado nuevamente. Se generará un acta PDF automáticamente.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all duration-300 hover:shadow-lg border border-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsSaveTemplateModalOpen(true)}
                                    className="px-6 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-all duration-300 border border-blue-500/30 flex items-center gap-2 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Plantilla
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold shadow-lg shadow-red-900/40 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-8 py-6 bg-slate-900/50 border-b border-slate-700/50 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        Historial de Bajas
                    </h2>
                    <div className="text-sm text-slate-400">
                        Total: <span className="font-mono text-white">{history.length}</span> registros
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/30 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700/50 tracking-wider">
                            <tr>
                                <th className="px-8 py-5">Equipo</th>
                                <th className="px-6 py-5">Motivo</th>
                                <th className="px-6 py-5">Fecha</th>
                                <th className="px-6 py-5">Observaciones</th>
                                <th className="px-6 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30 text-sm">
                            {loadingHistory ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                                            <p className="text-slate-400">Cargando historial...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <Archive className="w-16 h-16 mb-4 text-slate-600" />
                                            <p className="text-lg font-medium text-slate-400">No hay registros de bajas</p>
                                            <p className="text-sm mt-1">Los equipos dados de baja aparecerán aquí</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-slate-700/30 transition-all duration-200 group ${index % 2 === 0 ? 'bg-slate-800/10' : ''}`}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">{item.device.brand} {item.device.model}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                {item.device.serial_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                                                {item.reason}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-slate-300 font-mono">
                                            {new Date(item.decommission_date).toLocaleDateString('es-PE', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 max-w-xs">
                                            <div className="truncate" title={item.observations}>
                                                {item.observations || <span className="text-slate-600 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {item.acta_path && (
                                                    <button
                                                        onClick={() => handleDownloadActa(item)}
                                                        title="Descargar Acta"
                                                        className="text-blue-400 hover:text-white p-2.5 rounded-lg hover:bg-blue-500 transition-all shadow-sm hover:shadow-blue-500/20"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    title="Editar Baja"
                                                    className="text-amber-400 hover:text-white p-2.5 rounded-lg hover:bg-amber-500 transition-all shadow-sm hover:shadow-amber-500/20"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    title="Eliminar Baja"
                                                    className="text-red-400 hover:text-white p-2.5 rounded-lg hover:bg-red-500 transition-all shadow-sm hover:shadow-red-500/20"
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

