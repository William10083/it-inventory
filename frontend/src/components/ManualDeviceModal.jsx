import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ManualDeviceModal = ({ isOpen, onClose, onSuccess }) => {
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        serial_number: '',
        barcode: '',
        device_type: 'laptop',
        hostname: '',
        inventory_code: '',
        specifications: '',
        location: 'Callao',  // Default location
        delivery_type: 'NUEVO',  // NUEVO, INGRESO, or REEMPLAZO
        imei: '',
        phone_number: '',
        carrier: '',
        mobile_charger_brand: '',
        mobile_charger_model: '',
        mobile_charger_serial: ''
    });
    const [loading, setLoading] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Types that support bulk registration
    const bulkTypes = ['mochila', 'auriculares', 'kit teclado/mouse'];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Helper to clean empty strings to null
            const clean = (val) => (val && val.trim() !== '' ? val.trim() : null);

            const isBulkType = bulkTypes.includes(formData.device_type);
            const count = isBulkType ? quantity : 1;

            // For bulk registration, create multiple devices
            const promises = [];
            for (let i = 0; i < count; i++) {
                // Generate serial number logic
                let serialNumber = clean(formData.serial_number);

                // For mochilas, allow null serial numbers (don't auto-generate)
                if (!serialNumber && formData.device_type === 'mochila') {
                    serialNumber = null;
                } else if (!serialNumber) {
                    // For other bulk types, auto-generate
                    const baseSerial = `AUTO-${formData.device_type.toUpperCase()}`;
                    serialNumber = count > 1 ? `${baseSerial}-${Date.now()}-${i + 1}` : baseSerial;
                } else if (count > 1) {
                    // If serial provided and bulk, append counter
                    serialNumber = `${serialNumber}-${Date.now()}-${i + 1}`;
                }

                const payload = {
                    ...formData,
                    brand: clean(formData.brand),
                    model: clean(formData.model),
                    serial_number: serialNumber,
                    barcode: serialNumber || `BARCODE-${Date.now()}-${i}`, // Generate barcode if no serial
                    hostname: clean(formData.hostname),
                    inventory_code: clean(formData.inventory_code),
                    specifications: clean(formData.specifications),
                    // Mobile fields
                    imei: clean(formData.imei),
                    phone_number: clean(formData.phone_number),
                    carrier: clean(formData.carrier),
                    status: 'available'
                };

                promises.push(axios.post(`${API_URL}/devices/`, payload));
            }

            await Promise.all(promises);

            if (count > 1) {
                showNotification(`✓ ${count} ${formData.device_type === 'mochila' ? 'mochilas' : formData.device_type === 'auriculares' ? 'auriculares' : 'kits'} registrados exitosamente`, 'success');
            } else {
                showNotification('✓ Dispositivo registrado exitosamente', 'success');
            }

            setQuantity(1); // Reset quantity
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            showNotification("Error registrando equipo: " + (err.response?.data?.detail || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Register New Device</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Brand</label>
                            <input
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                placeholder="e.g. Dell"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Model</label>
                            <input
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                placeholder="e.g. Latitude 5420"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">
                                Serial Number {bulkTypes.includes(formData.device_type) && <span className="text-slate-500">(Opcional)</span>}
                            </label>
                            <input
                                required={!bulkTypes.includes(formData.device_type)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                placeholder={bulkTypes.includes(formData.device_type) ? "Dejar vacío para auto-generar" : "Serial / Service Tag"}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Barcode (Optional)</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="Leave empty to use Serial"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Device Type</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            value={formData.device_type}
                            onChange={e => {
                                const newType = e.target.value;
                                // Auto-fill defaults for specific device types
                                if (newType === 'auriculares') {
                                    setFormData({ ...formData, device_type: newType, brand: 'HP', model: 'G2' });
                                } else if (newType === 'mochila') {
                                    setFormData({ ...formData, device_type: newType, brand: 'HP', model: 'TRAVEL 18L' });
                                } else if (newType === 'kit teclado/mouse') {
                                    setFormData({ ...formData, device_type: newType, brand: 'HP', model: '320MK' });
                                } else {
                                    setFormData({ ...formData, device_type: newType });
                                }
                            }}
                        >
                            <option value="laptop">Laptop</option>
                            <option value="monitor">Monitor</option>
                            <option value="auriculares">Auriculares</option>
                            <option value="teclado">Teclado</option>
                            <option value="mouse">Mouse</option>
                            <option value="mochila">Mochila</option>
                            <option value="soporte/stand">Soporte/Stand</option>
                            <option value="celular">Celular</option>
                            <option value="charger">Cargador</option>
                            <option value="chip">Chip / SIM</option>
                            <option value="kit teclado/mouse">Kit Teclado/Mouse</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Sede / Ubicación</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })} >
                            <option value="Callao">Callao</option>
                            <option value="San Isidro">San Isidro</option>
                            <option value="Mollendo">Mollendo</option>
                            <option value="Ilo">Ilo</option>
                            <option value="Pucallpa">Pucallpa</option>
                            <option value="Chimbote">Chimbote</option>
                            <option value="Supe">Supe</option>
                            <option value="Tacna">Tacna</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Tipo de Entrega</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            value={formData.delivery_type}
                            onChange={e => setFormData({ ...formData, delivery_type: e.target.value })}
                        >
                            <option value="NUEVO">NUEVO (Equipo nuevo)</option>
                            <option value="INGRESO">INGRESO</option>
                            <option value="REEMPLAZO">REEMPLAZO</option>
                        </select>
                    </div>

                    {/* Quantity field for bulk types */}
                    {bulkTypes.includes(formData.device_type) && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <label className="block text-blue-400 text-sm mb-2 font-medium">
                                Cantidad a registrar
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-24 bg-slate-900 border border-blue-500/50 rounded p-2 text-white text-center text-lg font-bold"
                                />
                                <span className="text-slate-400 text-sm">
                                    {quantity > 1
                                        ? `Se crearán ${quantity} ${formData.device_type === 'mochila' ? 'mochilas' : formData.device_type === 'auriculares' ? 'auriculares' : 'kits'} con números de serie automáticos`
                                        : 'Puedes cambiar la cantidad para registrar múltiples unidades'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Laptop: Show both Hostname AND Inventory Code */}
                    {formData.device_type === 'laptop' && (
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">Hostname</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                    value={formData.hostname}
                                    onChange={e => setFormData({ ...formData, hostname: e.target.value })}
                                    placeholder="e.g. PETAMLIT0027"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">Código de Inventario</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                    value={formData.inventory_code}
                                    onChange={e => setFormData({ ...formData, inventory_code: e.target.value })}
                                    placeholder="e.g. INV-LAP-001"
                                />
                            </div>
                        </div>
                    )}

                    {/* Monitor: Show only Inventory Code */}
                    {formData.device_type === 'monitor' && (
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <label className="block text-slate-400 text-sm mb-1">Código de Inventario</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                value={formData.inventory_code}
                                onChange={e => setFormData({ ...formData, inventory_code: e.target.value })}
                                placeholder="e.g. PETAMMON0027"
                            />
                        </div>
                    )}

                    {(formData.device_type === 'celular' || formData.device_type === 'chip') && (
                        <div className="grid grid-cols-3 gap-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <div>
                                <label className="block text-slate-400 text-xs mb-1">IMEI</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    value={formData.imei}
                                    onChange={e => setFormData({ ...formData, imei: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs mb-1">Phone Number</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    value={formData.phone_number}
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs mb-1">Carrier</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    value={formData.carrier}
                                    onChange={e => setFormData({ ...formData, carrier: e.target.value })}
                                    placeholder="e.g. Telcel"
                                />
                            </div>
                        </div>
                    )}

                    {formData.device_type === 'celular' && (
                        <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                            <label className="block text-orange-300 text-sm mb-2 font-bold">Detalles del Cargador</label>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-400 text-xs mb-1">Marca</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={formData.mobile_charger_brand || ''}
                                        onChange={e => setFormData({ ...formData, mobile_charger_brand: e.target.value })}
                                        placeholder="e.g. HONOR"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs mb-1">Modelo</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={formData.mobile_charger_model || ''}
                                        onChange={e => setFormData({ ...formData, mobile_charger_model: e.target.value })}
                                        placeholder="e.g. HN-110320U00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs mb-1">Serie</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={formData.mobile_charger_serial || ''}
                                        onChange={e => setFormData({ ...formData, mobile_charger_serial: e.target.value })}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.device_type === 'laptop' && (
                        <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                            <label className="block text-yellow-300 text-sm mb-1 font-bold">Especificaciones (Laptop)</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-24"
                                value={formData.specifications}
                                onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                                placeholder="Procesador: Intel(R) Core(TM) Ultra 7 155U (1.70 GHz)&#10;RAM instalada: 16.0 GB (15.5 GB utilizable)"
                            />
                        </div>
                    )}

                    {formData.device_type !== 'laptop' && (
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Specifications</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-24"
                                value={formData.specifications}
                                onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                                placeholder="Processor, RAM, Color, etc."
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg mt-4 disabled:opacity-50"
                    >
                        {loading ? 'Registering...' : 'Register Device'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManualDeviceModal;
