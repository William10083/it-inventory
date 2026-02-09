import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader, Upload, Image as ImageIcon, FileText, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EditDecommissionModal = ({ decommission, isOpen, onClose, onUpdate }) => {
    if (!isOpen || !decommission) return null;

    const { showNotification } = useNotification();
    const deviceInputRef = useRef(null);
    const serialInputRef = useRef(null);

    // Form State
    const [reason, setReason] = useState(decommission.reason || '');
    const [observations, setObservations] = useState(decommission.observations || '');
    const [fabricationYear, setFabricationYear] = useState(decommission.fabrication_year || '');
    const [purchaseReason, setPurchaseReason] = useState(decommission.purchase_reason || '');

    // Image State
    const [deviceImageFile, setDeviceImageFile] = useState(null);
    const [serialImageFile, setSerialImageFile] = useState(null);
    const [deviceImagePreview, setDeviceImagePreview] = useState(null);
    const [serialImagePreview, setSerialImagePreview] = useState(null);

    // Keep track of existing paths
    const [existingDevicePath, setExistingDevicePath] = useState(decommission.device_image_path);
    const [existingSerialPath, setExistingSerialPath] = useState(decommission.serial_image_path);

    const [processing, setProcessing] = useState(false);

    // Initialize state when decommission changes
    useEffect(() => {
        if (decommission) {
            setReason(decommission.reason || '');
            setObservations(decommission.observations || '');
            setFabricationYear(decommission.fabrication_year || '');
            setPurchaseReason(decommission.purchase_reason || '');
            setExistingDevicePath(decommission.device_image_path);
            setExistingSerialPath(decommission.serial_image_path);

            // Clear new files
            setDeviceImageFile(null);
            setSerialImageFile(null);
            setDeviceImagePreview(null);
            setSerialImagePreview(null);
        }
    }, [decommission]);

    // Cleanup previews
    useEffect(() => {
        return () => {
            if (deviceImagePreview) URL.revokeObjectURL(deviceImagePreview);
            if (serialImagePreview) URL.revokeObjectURL(serialImagePreview);
        };
    }, [deviceImagePreview, serialImagePreview]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);

        try {
            // Upload new images if selected
            let newDevicePath = existingDevicePath;
            let newSerialPath = existingSerialPath;

            if (deviceImageFile) {
                newDevicePath = await uploadImage(deviceImageFile);
            }

            if (serialImageFile) {
                newSerialPath = await uploadImage(serialImageFile);
            }

            const updateData = {
                reason,
                observations,
                fabrication_year: fabricationYear ? parseInt(fabricationYear) : null,
                purchase_reason: purchaseReason || null,
                device_image_path: newDevicePath,
                serial_image_path: newSerialPath
            };

            await axios.put(`${API_URL}/decommission/${decommission.id}`, updateData);

            showNotification("✓ Baja actualizada correctamente", "success");
            onUpdate();
            onClose();

        } catch (error) {
            console.error("Error updating decommission:", error);
            showNotification(
                error.response?.data?.detail || "Error al actualizar la baja",
                "error"
            );
        } finally {
            setProcessing(false);
        }
    };

    // Construct full image URL if path strictly exists and is not absolute/http
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API_URL}/${path.replace(/\\/g, '/')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Editar Baja: {decommission.device?.brand} {decommission.device?.model}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Motivo de Baja *</label>
                            <select
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        ></textarea>
                    </div>

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
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Motivo de Compra</label>
                            <input
                                type="text"
                                value={purchaseReason}
                                onChange={(e) => setPurchaseReason(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
                        {/* Device Image */}
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
                                    id="edit-device-image-upload"
                                />
                                <label
                                    htmlFor="edit-device-image-upload"
                                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${(deviceImagePreview || existingDevicePath)
                                            ? 'border-blue-500 bg-slate-800'
                                            : 'border-slate-600 bg-slate-800 hover:border-blue-500 hover:bg-slate-700'
                                        }`}
                                >
                                    {(deviceImagePreview || existingDevicePath) ? (
                                        <div className="relative w-full h-full p-2">
                                            <img
                                                src={deviceImagePreview || getImageUrl(existingDevicePath)}
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

                        {/* Serial Image */}
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
                                    id="edit-serial-image-upload"
                                />
                                <label
                                    htmlFor="edit-serial-image-upload"
                                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${(serialImagePreview || existingSerialPath)
                                            ? 'border-green-500 bg-slate-800'
                                            : 'border-slate-600 bg-slate-800 hover:border-green-500 hover:bg-slate-700'
                                        }`}
                                >
                                    {(serialImagePreview || existingSerialPath) ? (
                                        <div className="relative w-full h-full p-2">
                                            <img
                                                src={serialImagePreview || getImageUrl(existingSerialPath)}
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

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex gap-3 text-blue-200 text-sm">
                        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold mb-1">ℹ️ Actualización de Acta</div>
                            Al guardar los cambios, se regenerará automáticamente el documento PDF del acta con la nueva información.
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditDecommissionModal;
