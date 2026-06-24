import React, { useState, useEffect, useRef } from 'react';
import { FileText, Search, AlertTriangle, Trash2, Archive, Download, X, Loader, Upload, Image as ImageIcon, Pencil, Save, List } from 'lucide-react';
import EditDecommissionModal from '../components/EditDecommissionModal';
import FormTemplateSelector from '../components/FormTemplateSelector';
import SaveFormTemplateModal from '../components/SaveFormTemplateModal';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { downloadFileWithProgress } from '../utils/downloadFile';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DecommissionPage = () => {
    const { showNotification, showConfirm, startDownload, updateDownloadProgress, finishDownload, failDownload } = useNotification();
    const searchInputRef = useRef(null);
    const deviceInputRef = useRef(null);
    const serialInputRef = useRef(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const obsRef = useRef(null);

    const formatSelectionAsBullets = () => {
        const el = obsRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end) return;

        const text = observations;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = text.indexOf('\n', end);
        const blockEnd = lineEnd === -1 ? text.length : lineEnd;

        const before = text.slice(0, lineStart);
        const selected = text.slice(lineStart, blockEnd);
        const after = text.slice(blockEnd);

        const formatted = selected
            .split('\n')
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) return line;
                return '• ' + trimmed;
            })
            .join('\n');

        const newValue = before + formatted + after;
        setObservations(newValue);

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(lineStart, lineStart + formatted.length);
        }, 0);
    };

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
    const [selectedIds, setSelectedIds] = useState(new Set());
    const lastClickedIdx = useRef(null);

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

    const handleImageFile = (file, type) => {
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

    const handleImageSelect = (e, type) => {
        handleImageFile(e.target.files[0], type);
    };

    const handleImageDrop = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        handleImageFile(e.dataTransfer.files?.[0], type);
    };

    const handleImagePaste = (e, type) => {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
        if (item) {
            e.preventDefault();
            handleImageFile(item.getAsFile(), type);
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

        const defaultFilename = `acta_baja_${item.id}.docx`;

        downloadFileWithProgress({
            url: `${API_URL}/decommission/${item.id}/download-acta`,
            filename: defaultFilename,
            label: defaultFilename,
            params: { t: new Date().getTime() },
            getFilename: (response) => {
                const contentDisposition = response.headers['content-disposition'];
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                    if (filenameMatch && filenameMatch[1]) {
                        return filenameMatch[1];
                    }
                }
                return defaultFilename;
            },
            notification: { startDownload, updateDownloadProgress, finishDownload, failDownload, showNotification },
        }).catch(() => {});
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-3 rounded-lg">
                    <Archive className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bajas de Equipos</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gestión de retiro y disposición final de activos tecnológicos</p>
                </div>
            </div>

            {/* Search Section */}
            <div className="bg-surface rounded-md shadow-sm p-6 overflow-visible relative z-10">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    Buscar Equipo para Dar de Baja
                </h3>

                <div className="relative" ref={searchInputRef}>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por serie, modelo, hostname..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md py-2.5 pl-9 pr-9 focus:outline-none focus:border-accent placeholder:text-slate-500"
                        />
                        {searching && (
                            <Loader className="w-4 h-4 text-slate-500 dark:text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                        {selectedDevice && !searching && (
                            <button onClick={handleClearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && !selectedDevice && (
                        <div className="absolute z-[200] w-full mt-1 bg-surface border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                            {searchResults.map((device) => (
                                <div
                                    key={device.id}
                                    onClick={() => handleSelectDevice(device)}
                                    className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-200 dark:border-slate-700/50 last:border-0"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-white text-sm">{device.brand} {device.model}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">SN: {device.serial_number}{device.hostname && ` · ${device.hostname}`}</div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                            device.status === 'available' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                                            device.status === 'assigned' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                                            'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                        }`}>{device.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Device Form */}
                {selectedDevice && (
                    <div className="mt-6 space-y-6">
                        {/* Device info */}
                        <div className="flex items-center justify-between p-4 bg-bg rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <Archive className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{selectedDevice.brand} {selectedDevice.model}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">SN: {selectedDevice.serial_number}</div>
                                </div>
                            </div>
                            <button onClick={handleClearSelection} className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleDecommission} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Motivo de Baja *</label>
                                        <FormTemplateSelector onSelect={handleTemplateSelect} />
                                    </div>
                                    <select
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
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

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Observaciones / Diagnóstico Técnico *</label>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={formatSelectionAsBullets}
                                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600"
                                        title="Selecciona las líneas que quieres convertir en viñetas y presiona este botón"
                                    >
                                        <List className="w-3 h-3" />
                                        • Viñeta a selección
                                    </button>
                                </div>
                                <textarea
                                    ref={obsRef}
                                    required
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    rows="5"
                                    placeholder={"• Pantalla rota\n• Batería sin carga\n• Teclado dañado"}
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent resize-y placeholder:text-slate-500 font-mono text-sm leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">Año de Fabricación</label>
                                    <select
                                        value={fabricationYear}
                                        onChange={(e) => setFabricationYear(e.target.value)}
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                    >
                                        <option value="">Seleccionar año...</option>
                                        {Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    {fabricationYear && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                            Tiempo de uso: <span className="text-blue-600 dark:text-blue-400 font-medium">{new Date().getFullYear() - parseInt(fabricationYear)} años</span>
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">Motivo de Compra Original</label>
                                    <input
                                        type="text"
                                        value={purchaseReason}
                                        onChange={(e) => setPurchaseReason(e.target.value)}
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                                        placeholder="Ej: Expansión de equipo, Reemplazo..."
                                    />
                                </div>
                            </div>

                            {/* Image uploads */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                {[
                                    { id: 'device-image-upload', ref: deviceInputRef, label: 'Foto del Equipo', type: 'device', preview: deviceImagePreview },
                                    { id: 'serial-image-upload', ref: serialInputRef, label: 'Foto de la Serie', type: 'serial', preview: serialImagePreview }
                                ].map(({ id, ref, label, type, preview }) => (
                                    <div key={id}>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{label}</label>
                                        <input type="file" ref={ref} accept="image/*" onChange={(e) => handleImageSelect(e, type)} className="hidden" id={id} />
                                        <label
                                            htmlFor={id}
                                            tabIndex={0}
                                            onDrop={(e) => handleImageDrop(e, type)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onPaste={(e) => handleImagePaste(e, type)}
                                            className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors outline-none focus:border-accent ${preview ? 'border-slate-400 dark:border-slate-500 bg-bg' : 'border-slate-300 dark:border-slate-700 bg-bg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            {preview ? (
                                                <img src={preview} alt="preview" className="w-full h-full object-contain rounded-lg p-1" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <Upload className="w-5 h-5 text-slate-500" />
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Clic, arrastra o pega (Ctrl+V) una imagen</p>
                                                    <p className="text-xs text-slate-500">JPG, PNG (Max 5MB)</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Warning */}
                            <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold text-red-600 dark:text-red-400">Acción irreversible.</span> El equipo pasará a estado <span className="font-mono text-xs bg-red-500/20 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300">RETIRED</span> y no podrá asignarse nuevamente. Se generará un acta automáticamente.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={handleClearSelection} className="px-4 py-2 rounded-lg bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 transition-colors">
                                    Cancelar
                                </button>
                                <button type="button" onClick={() => setIsSaveTemplateModalOpen(true)} className="px-4 py-2 rounded-lg bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-colors">
                                    <Save className="w-4 h-4" />
                                    Guardar Plantilla
                                </button>
                                <button type="submit" disabled={processing} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {processing ? <><Loader className="w-4 h-4 animate-spin" />Procesando...</> : <><Trash2 className="w-4 h-4" />Confirmar Baja</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* History Section */}
            <div className="bg-surface rounded-md shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-bg/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        Historial de Bajas
                    </h3>
                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 && (
                            <>
                                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                                    {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => {
                                        const defaultFilename = 'actas_baja.zip';
                                        downloadFileWithProgress({
                                            url: `${API_URL}/decommission/batch-download`,
                                            params: { ids: [...selectedIds].join(',') },
                                            filename: defaultFilename,
                                            label: defaultFilename,
                                            getFilename: (response) => {
                                                const contentDisposition = response.headers['content-disposition'];
                                                if (contentDisposition) {
                                                    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                                                    if (filenameMatch && filenameMatch[1]) {
                                                        return filenameMatch[1];
                                                    }
                                                }
                                                return defaultFilename;
                                            },
                                            notification: { startDownload, updateDownloadProgress, finishDownload, failDownload, showNotification },
                                        }).catch(() => {});
                                    }}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}
                                </button>
                            </>
                        )}
                        <span className="text-sm text-slate-500 dark:text-slate-400">Total: <span className="text-slate-900 dark:text-white font-medium">{history.length}</span></span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                                        checked={history.length > 0 && selectedIds.size === history.length}
                                        ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < history.length; }}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedIds(new Set(history.map(h => h.id)));
                                            else { setSelectedIds(new Set()); lastClickedIdx.current = null; }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Equipo</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Motivo</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Observaciones</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {loadingHistory ? (
                                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500"><Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />No hay registros de bajas</td></tr>
                            ) : history.map((item, idx) => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                <tr key={item.id}
                                    className={`transition-colors cursor-pointer select-none ${isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'}`}
                                    onClick={e => {
                                        if (e.target.type === 'checkbox' || e.target.closest('button') || e.target.closest('a')) return;
                                        const newSet = new Set(selectedIds);
                                        if (e.shiftKey && lastClickedIdx.current !== null) {
                                            const [from, to] = [Math.min(lastClickedIdx.current, idx), Math.max(lastClickedIdx.current, idx)];
                                            history.slice(from, to + 1).forEach(h => newSet.add(h.id));
                                        } else if (e.ctrlKey || e.metaKey) {
                                            isSelected ? newSet.delete(item.id) : newSet.add(item.id);
                                        } else {
                                            if (isSelected && selectedIds.size === 1) newSet.clear();
                                            else { newSet.clear(); newSet.add(item.id); }
                                        }
                                        lastClickedIdx.current = idx;
                                        setSelectedIds(newSet);
                                    }}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                                            checked={isSelected}
                                            onChange={e => {
                                                const newSet = new Set(selectedIds);
                                                e.target.checked ? newSet.add(item.id) : newSet.delete(item.id);
                                                lastClickedIdx.current = idx;
                                                setSelectedIds(newSet);
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const brand = item.device.brand && item.device.brand !== 'NA' ? item.device.brand : null;
                                            const model = item.device.model && item.device.model !== 'NA' ? item.device.model : null;
                                            const serial = item.device.serial_number && item.device.serial_number !== 'NA' ? item.device.serial_number : null;
                                            const dtype = item.device.device_type;
                                            const hasInfo = brand || model;
                                            return (
                                                <div className="flex flex-col gap-1">
                                                    {hasInfo ? (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-slate-900 dark:text-white">{[brand, model].filter(Boolean).join(' ')}</span>
                                                            {dtype && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 uppercase tracking-wide">{dtype}</span>}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 uppercase tracking-wide">{dtype || '—'}</span>
                                                        </div>
                                                    )}
                                                    <div className="text-xs font-mono text-slate-500">
                                                        {serial || <span className="italic text-slate-400 dark:text-slate-600">Sin serial</span>}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 font-medium">{item.reason}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        {new Date(item.decommission_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <div className="truncate" title={item.observations}>{item.observations || <span className="text-slate-400 dark:text-slate-600 italic">-</span>}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {item.acta_path && (
                                                <button onClick={() => handleDownloadActa(item)} title="Descargar Acta" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded hover:bg-blue-500/10 transition-colors">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(item)} title="Editar" className="text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-1.5 rounded hover:bg-amber-500/10 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(item)} title="Eliminar" className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
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

