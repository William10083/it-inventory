import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const BUILTIN_TYPES = ['laptop','monitor','auriculares','teclado','mouse','mochila','soporte/stand','celular','charger','chip','kit teclado/mouse'];
const CUSTOM_TYPES_KEY = 'custom_device_types';

function loadCustomTypes() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_TYPES_KEY)) || []; } catch { return []; }
}
function saveCustomType(type) {
    const types = loadCustomTypes();
    if (!BUILTIN_TYPES.includes(type.toLowerCase()) && !types.includes(type)) {
        localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify([...types, type]));
    }
}

const ManualDeviceModal = ({ isOpen, onClose, onSuccess }) => {
    const { showNotification } = useNotification();
    const [customTypes, setCustomTypes] = useState(loadCustomTypes);
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

    const [mobileModels, setMobileModels] = useState([]);
    const [isCustomModel, setIsCustomModel] = useState(false);

    useEffect(() => {
        if (isOpen && formData.device_type === 'celular') {
            axios.get(`${API_URL}/devices/unique-models?device_type=celular`)
                .then(res => {
                    const models = res.data.filter(m => m && m.trim() !== '');
                    setMobileModels(models);
                })
                .catch(err => console.error("Error fetching mobile models:", err));
        }
    }, [isOpen, formData.device_type]);

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

                // Tipos que permiten serie vacía/nula
                const noSerialTypes = ['mochila', 'celular', 'mobile', 'smartphone'];
                const isNoSerial = noSerialTypes.includes((formData.device_type || '').toLowerCase());
                if (isNoSerial && !serialNumber) {
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

            // Guardar tipo personalizado si no es built-in
            if (!BUILTIN_TYPES.includes(formData.device_type.toLowerCase())) {
                saveCustomType(formData.device_type);
                setCustomTypes(loadCustomTypes());
            }

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
            <div className="glass-card w-full max-w-2xl p-5 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Registrar Nuevo Dispositivo</h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                        {/* Brand | Model */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Marca</label>
                            <input
                                required
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                placeholder="e.g. Dell"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Modelo</label>
                            {formData.device_type === 'celular' && !isCustomModel ? (
                                <div className="flex gap-2">
                                    <select
                                        required
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                        value={formData.model}
                                        onChange={e => {
                                            if (e.target.value === '___custom___') {
                                                setIsCustomModel(true);
                                                setFormData({ ...formData, model: '' });
                                            } else {
                                                setFormData({ ...formData, model: e.target.value });
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
                            ) : formData.device_type === 'celular' && isCustomModel ? (
                                <div className="flex gap-2">
                                    <input
                                        required
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        placeholder="e.g. Galaxy S24"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomModel(false);
                                            setFormData({ ...formData, model: mobileModels.length > 0 ? mobileModels[0] : '' });
                                        }}
                                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 rounded"
                                        title="Volver a lista"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <input
                                    required
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="e.g. Latitude 5420"
                                />
                            )}
                        </div>

                        {/* Serial | Barcode */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">N° Serie</label>
                            {formData.device_type === 'mochila' ? (
                                <input
                                    disabled
                                    className="w-full bg-bg/50 border border-slate-300/50 dark:border-slate-700/50 rounded px-3 py-1.5 text-sm text-slate-500 dark:text-slate-500 cursor-not-allowed"
                                    value=""
                                    placeholder="Se genera automáticamente"
                                />
                            ) : (
                                <input
                                    required={!['celular','mobile','smartphone'].includes((formData.device_type||'').toLowerCase())}
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.serial_number}
                                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                    placeholder={['celular','mobile','smartphone'].includes((formData.device_type||'').toLowerCase()) ? 'Opcional' : 'Serial / Service Tag'}
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Barcode (Opcional)</label>
                            <input
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="Vacío = usar Serial"
                            />
                        </div>

                        {/* Device Type | Sede */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Dispositivo</label>
                            <select
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                value={formData.device_type === 'laptop' || formData.device_type === 'monitor' || formData.device_type === 'auriculares' || formData.device_type === 'teclado' || formData.device_type === 'mouse' || formData.device_type === 'mochila' || formData.device_type === 'soporte/stand' || formData.device_type === 'celular' || formData.device_type === 'charger' || formData.device_type === 'chip' || formData.device_type === 'kit teclado/mouse' ? formData.device_type : '__custom__'}
                                onChange={e => {
                                    const newType = e.target.value;
                                    if (newType === '__custom__') {
                                        setFormData({ ...formData, device_type: '' });
                                    } else if (newType === 'auriculares') {
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
                                {customTypes.length > 0 && <>
                                    <option disabled>── Personalizados ──</option>
                                    {customTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </>}
                                <option value="__custom__">+ Nuevo tipo...</option>
                            </select>
                            {(formData.device_type === '' || (!BUILTIN_TYPES.includes(formData.device_type) && !customTypes.includes(formData.device_type))) && (
                                <input
                                    type="text"
                                    placeholder="Escribe el tipo de dispositivo..."
                                    value={formData.device_type}
                                    onChange={e => setFormData({ ...formData, device_type: e.target.value.toUpperCase() })}
                                    className="w-full mt-1.5 bg-bg border border-amber-500/50 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                    autoFocus
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sede / Ubicación</label>
                            <select
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            >
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

                        {bulkTypes.includes(formData.device_type) ? (
                            <div>
                                <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Cantidad a registrar</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full bg-bg border border-blue-500/50 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white text-center font-bold"
                                />
                            </div>
                        ) : <div />}

                        {/* Laptop: Hostname | Inventory Code */}
                        {formData.device_type === 'laptop' && (<>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hostname</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.hostname}
                                    onChange={e => setFormData({ ...formData, hostname: e.target.value })}
                                    placeholder="e.g. PETAMLIT0027"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Código de Inventario</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.inventory_code}
                                    onChange={e => setFormData({ ...formData, inventory_code: e.target.value })}
                                    placeholder="e.g. INV-LAP-001"
                                />
                            </div>
                        </>)}

                        {/* Personalizado: Código de Inventario */}
                        {!BUILTIN_TYPES.includes(formData.device_type) && formData.device_type !== '' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Código de Inventario</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.inventory_code}
                                    onChange={e => setFormData({ ...formData, inventory_code: e.target.value })}
                                    placeholder="e.g. INV-001"
                                />
                            </div>
                        )}

                        {/* Monitor: Inventory Code — full width */}
                        {formData.device_type === 'monitor' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Código de Inventario</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.inventory_code}
                                    onChange={e => setFormData({ ...formData, inventory_code: e.target.value })}
                                    placeholder="e.g. PETAMMON0027"
                                />
                            </div>
                        )}

                        {/* Celular / Chip: IMEI | Phone Number | Carrier */}
                        {(formData.device_type === 'celular' || formData.device_type === 'chip') && (<>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">IMEI</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white font-mono"
                                    value={formData.imei}
                                    onChange={e => setFormData({ ...formData, imei: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.phone_number}
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Operadora</label>
                                <input
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                                    value={formData.carrier}
                                    onChange={e => setFormData({ ...formData, carrier: e.target.value })}
                                    placeholder="e.g. Claro"
                                />
                            </div>
                        </>)}

                        {/* Celular: Charger details */}
                        {formData.device_type === 'celular' && (
                            <div className="col-span-2 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                                <label className="block text-orange-700 dark:text-orange-300 text-xs font-bold mb-2 uppercase">Cargador de Celular</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Marca</label>
                                        <input
                                            className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                                            value={formData.mobile_charger_brand || ''}
                                            onChange={e => setFormData({ ...formData, mobile_charger_brand: e.target.value })}
                                            placeholder="e.g. HONOR"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Modelo</label>
                                        <input
                                            className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                                            value={formData.mobile_charger_model || ''}
                                            onChange={e => setFormData({ ...formData, mobile_charger_model: e.target.value })}
                                            placeholder="e.g. HN-110320U00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Serie</label>
                                        <input
                                            className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                                            value={formData.mobile_charger_serial || ''}
                                            onChange={e => setFormData({ ...formData, mobile_charger_serial: e.target.value })}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Specs — full width */}
                        <div className="col-span-2">
                            {formData.device_type === 'laptop' ? (
                                <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                                    <label className="block text-yellow-700 dark:text-yellow-300 text-xs font-bold mb-1 uppercase">Especificaciones (Laptop)</label>
                                    <textarea
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white h-20"
                                        value={formData.specifications}
                                        onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                                        placeholder={"Procesador: Intel(R) Core(TM) Ultra 7 155U (1.70 GHz)\nRAM instalada: 16.0 GB (15.5 GB utilizable)"}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Especificaciones</label>
                                    <textarea
                                        className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white h-20"
                                        value={formData.specifications}
                                        onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                                        placeholder="Procesador, RAM, Color, etc."
                                    />
                                </div>
                            )}
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg disabled:opacity-50 transition-colors text-sm"
                    >
                        {loading ? 'Registrando...' : 'Registrar Dispositivo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManualDeviceModal;
