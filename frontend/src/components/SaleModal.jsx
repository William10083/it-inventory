import React, { useState, useEffect, useCallback } from 'react';
import { X, DollarSign, User, Phone, Mail, CreditCard, FileText, Plus, Users, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import DeviceChip from './DeviceChip';
import PdfUploader from './PdfUploader';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Precios predeterminados
const DEFAULT_PRICES = {
    laptop: 400,
    monitor: 50
};

const SaleModal = ({ isOpen, onClose, onSuccess }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [availableDevices, setAvailableDevices] = useState([]);
    const [selectedDevicesData, setSelectedDevicesData] = useState([]); // Array of {device, price}
    const [devicePrices, setDevicePrices] = useState({});

    // Autocomplete states
    const [activeField, setActiveField] = useState(null); // 'name', 'dni', 'email', 'phone'
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Add device modal
    const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
    const [deviceSearch, setDeviceSearch] = useState('');

    // Success screen states
    const [saleSuccess, setSaleSuccess] = useState(false);
    const [createdSaleId, setCreatedSaleId] = useState(null);
    const [createdSaleData, setCreatedSaleData] = useState(null);

    const [formData, setFormData] = useState({
        buyer_name: '',
        buyer_dni: '',
        buyer_email: '',
        buyer_phone: '',
        sale_price: '',
        payment_method: 'Efectivo',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchAvailableDevices();
        }
    }, [isOpen]);

    // Calcular precio total automáticamente
    useEffect(() => {
        const total = selectedDevicesData.reduce((sum, item) => sum + item.price, 0);
        setFormData(prev => ({ ...prev, sale_price: total.toString() }));
    }, [selectedDevicesData]);

    const fetchAvailableDevices = async () => {
        try {
            const response = await axios.get(`${API_URL}/devices/`, {
                params: { limit: 1000 }
            });
            const devices = response.data.items || response.data;
            // Filtrar solo laptops y monitores disponibles
            const filtered = devices.filter(d =>
                d.status === 'available' &&
                (d.device_type === 'laptop' || d.device_type === 'monitor')
            );
            setAvailableDevices(filtered);
        } catch (error) {
            console.error('Error fetching devices:', error);
            showNotification('Error al cargar dispositivos', 'error');
        }
    };

    // Unified search function for autocomplete
    const searchPeople = useCallback(async (query, field) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            // Search employees
            const empResponse = await axios.get(`${API_URL}/sales/employees/search`, {
                params: { q: query }
            });

            // Search previous buyers
            const buyerResponse = await axios.get(`${API_URL}/sales/buyers/search`, {
                params: { q: query }
            });

            const combinedSuggestions = [
                ...empResponse.data.map(emp => ({ ...emp, type: 'employee' })),
                ...buyerResponse.data.map(buyer => ({ ...buyer, type: 'buyer' }))
            ];

            setSuggestions(combinedSuggestions);
            setShowSuggestions(combinedSuggestions.length > 0);
        } catch (error) {
            console.error('Error searching:', error);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (!activeField) return;

        const value = formData[`buyer_${activeField}`] || formData.buyer_name;
        const timer = setTimeout(() => {
            searchPeople(value, activeField);
        }, 500);

        return () => clearTimeout(timer);
    }, [formData, activeField, searchPeople]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [`buyer_${field}`]: value }));
        setActiveField(field);
    };

    const selectPerson = (person) => {
        if (person.type === 'employee') {
            // Auto-fill from employee
            setFormData({
                ...formData,
                buyer_name: person.full_name || '',
                buyer_email: person.email || '',
                buyer_dni: person.dni || '',
                buyer_phone: ''
            });

            // Auto-select employee's devices
            const devicesData = [];

            if (person.laptop) {
                devicesData.push({
                    device: person.laptop,
                    price: DEFAULT_PRICES.laptop
                });
            }

            if (person.monitors && Array.isArray(person.monitors)) {
                person.monitors.forEach(monitor => {
                    devicesData.push({
                        device: monitor,
                        price: DEFAULT_PRICES.monitor
                    });
                });
            }

            setSelectedDevicesData(devicesData);

            if (devicesData.length > 0) {
                showNotification(`${devicesData.length} dispositivo(s) seleccionados automáticamente`, 'success');
            }
        } else {
            // Auto-fill from previous buyer
            setFormData({
                ...formData,
                buyer_name: person.buyer_name || '',
                buyer_dni: person.buyer_dni || '',
                buyer_email: person.buyer_email || '',
                buyer_phone: person.buyer_phone || ''
            });
        }

        setSuggestions([]);
        setShowSuggestions(false);
        setActiveField(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedDevicesData.length === 0) {
            showNotification('Debes seleccionar al menos un dispositivo', 'warning');
            return;
        }

        setLoading(true);
        try {
            const deviceIds = selectedDevicesData.map(item => item.device.id);

            const response = await axios.post(`${API_URL}/sales/`, {
                ...formData,
                buyer_address: '',
                sale_price: formData.sale_price ? parseInt(formData.sale_price) : null,
                device_ids: deviceIds
            });

            // Guardar datos de la venta creada
            setCreatedSaleId(response.data.id);
            setCreatedSaleData({
                buyer_name: formData.buyer_name,
                total: formData.sale_price,
                deviceCount: selectedDevicesData.length
            });

            // Mostrar pantalla de éxito
            setSaleSuccess(true);
            showNotification('Venta registrada exitosamente', 'success');

        } catch (error) {
            console.error('Error creating sale:', error);
            showNotification(error.response?.data?.detail || 'Error al registrar venta', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            buyer_name: '',
            buyer_dni: '',
            buyer_email: '',
            buyer_phone: '',
            sale_price: '',
            payment_method: 'Efectivo',
            notes: ''
        });
        setSelectedDevicesData([]);
        setDevicePrices({});
        setDeviceSearch('');
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveField(null);
        setShowAddDeviceModal(false);

        // Reset success screen states
        setSaleSuccess(false);
        setCreatedSaleId(null);
        setCreatedSaleData(null);

        onClose();
    };

    const updateDevicePrice = (deviceId, newPrice) => {
        setSelectedDevicesData(prev =>
            prev.map(item =>
                item.device.id === deviceId
                    ? { ...item, price: newPrice }
                    : item
            )
        );
    };

    const removeDevice = (deviceId) => {
        setSelectedDevicesData(prev => prev.filter(item => item.device.id !== deviceId));
    };

    const addDevice = (device) => {
        // Check if already selected
        if (selectedDevicesData.some(item => item.device.id === device.id)) {
            showNotification('Este dispositivo ya está seleccionado', 'warning');
            return;
        }

        const defaultPrice = DEFAULT_PRICES[device.device_type] || 0;
        setSelectedDevicesData(prev => [...prev, { device, price: defaultPrice }]);
        setShowAddDeviceModal(false);
        setDeviceSearch('');
    };

    // Filter available devices for add modal
    const filteredAvailableDevices = availableDevices.filter(device => {
        // Exclude already selected devices
        if (selectedDevicesData.some(item => item.device.id === device.id)) {
            return false;
        }

        if (!deviceSearch) return true;
        const search = deviceSearch.toLowerCase();
        return (
            device.brand?.toLowerCase().includes(search) ||
            device.model?.toLowerCase().includes(search) ||
            device.serial_number?.toLowerCase().includes(search) ||
            device.hostname?.toLowerCase().includes(search)
        );
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-green-400" />
                        <h2 className="text-xl font-bold text-white">Registrar Nueva Venta</h2>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Success Screen or Form */}
                {saleSuccess ? (
                    /* Success Screen with PDF Uploader */
                    <div className="p-6 space-y-6">
                        {/* Success Message */}
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                                <CheckCircle className="w-12 h-12 text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                ¡Venta Registrada Exitosamente!
                            </h3>
                            <p className="text-slate-400">
                                Venta #{createdSaleId}
                            </p>

                            {/* Sale Summary */}
                            {createdSaleData && (
                                <div className="mt-6 bg-slate-900/50 border border-slate-700 rounded-lg p-4 max-w-md mx-auto">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="text-left">
                                            <p className="text-slate-400">Comprador</p>
                                            <p className="text-white font-medium">{createdSaleData.buyer_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400">Total</p>
                                            <p className="text-white font-medium">S/. {createdSaleData.total}</p>
                                        </div>
                                        <div className="text-left col-span-2">
                                            <p className="text-slate-400">Dispositivos</p>
                                            <p className="text-white font-medium">{createdSaleData.deviceCount} dispositivo(s)</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PDF Uploader */}
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-white mb-4">
                                    Subir Acta Firmada (Opcional)
                                </h4>
                                <PdfUploader
                                    uploadUrl={`${API_URL}/sales/${createdSaleId}/upload-acta`}
                                    downloadUrl={`${API_URL}/sales/${createdSaleId}/download-acta`}
                                    deleteUrl={`${API_URL}/sales/${createdSaleId}/delete-acta`}
                                    currentPdfPath={null}
                                    label="Acta de Venta Firmada"
                                    onUploadSuccess={() => {
                                        onSuccess(); // Refresh sales list
                                        handleClose(); // Close modal
                                    }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-center gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    onSuccess(); // Refresh sales list
                                    handleClose(); // Close modal
                                }}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Omitir por Ahora
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Normal Sale Form */
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Buyer Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Información del Comprador</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nombre Completo */}
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.buyer_name}
                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                        onFocus={() => setActiveField('name')}
                                        onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Escribe para buscar..."
                                    />

                                    {/* Suggestions for name field */}
                                    {activeField === 'name' && showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                            {suggestions.map((person, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectPerson(person)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white border-b border-slate-700 last:border-0"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">
                                                            {person.full_name || person.buyer_name}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${person.type === 'employee'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {person.type === 'employee' ? 'Empleado' : 'Comprador'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {person.email || person.buyer_email} • {person.dni || person.buyer_dni}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* DNI */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <FileText className="w-4 h-4 inline mr-1" />
                                        DNI *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.buyer_dni}
                                        onChange={(e) => handleFieldChange('dni', e.target.value)}
                                        onFocus={() => setActiveField('dni')}
                                        onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Escribe para buscar..."
                                    />

                                    {/* Suggestions for DNI field */}
                                    {activeField === 'dni' && showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                            {suggestions.map((person, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectPerson(person)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white border-b border-slate-700 last:border-0"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">
                                                            {person.full_name || person.buyer_name}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${person.type === 'employee'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {person.type === 'employee' ? 'Empleado' : 'Comprador'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {person.email || person.buyer_email} • {person.dni || person.buyer_dni}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Mail className="w-4 h-4 inline mr-1" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.buyer_email}
                                        onChange={(e) => handleFieldChange('email', e.target.value)}
                                        onFocus={() => setActiveField('email')}
                                        onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Escribe para buscar..."
                                    />

                                    {/* Suggestions for email field */}
                                    {activeField === 'email' && showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                            {suggestions.map((person, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectPerson(person)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white border-b border-slate-700 last:border-0"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">
                                                            {person.full_name || person.buyer_name}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${person.type === 'employee'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {person.type === 'employee' ? 'Empleado' : 'Comprador'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {person.email || person.buyer_email} • {person.dni || person.buyer_dni}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Devices Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Dispositivos ({selectedDevicesData.length} seleccionados)
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddDeviceModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Dispositivo
                                </button>
                            </div>

                            {/* Device Chips */}
                            <div className="space-y-3">
                                {selectedDevicesData.length === 0 ? (
                                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
                                        <p className="text-slate-400">
                                            No hay dispositivos seleccionados. Busca un empleado o agrega dispositivos manualmente.
                                        </p>
                                    </div>
                                ) : (
                                    selectedDevicesData.map((item) => (
                                        <DeviceChip
                                            key={item.device.id}
                                            device={item.device}
                                            price={item.price}
                                            onPriceChange={(newPrice) => updateDevicePrice(item.device.id, newPrice)}
                                            onRemove={() => removeDevice(item.device.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sale Details */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Detalles de la Venta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                        Precio Total (S/.)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.sale_price}
                                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <CreditCard className="w-4 h-4 inline mr-1" />
                                        Método de Pago
                                    </label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Notas
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Registrando...' : 'Registrar Venta'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Add Device Modal */}
                {showAddDeviceModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Agregar Dispositivo</h3>
                                <button
                                    onClick={() => {
                                        setShowAddDeviceModal(false);
                                        setDeviceSearch('');
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 border-b border-slate-700">
                                <input
                                    type="text"
                                    placeholder="Buscar por marca, modelo o serial..."
                                    value={deviceSearch}
                                    onChange={(e) => setDeviceSearch(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredAvailableDevices.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        No se encontraron dispositivos disponibles
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredAvailableDevices.map((device) => (
                                            <button
                                                key={device.id}
                                                type="button"
                                                onClick={() => addDevice(device)}
                                                className="w-full text-left p-3 bg-slate-900 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
                                            >
                                                <div className="font-medium text-white">
                                                    {device.brand} {device.model}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    SN: {device.serial_number} {device.hostname && `• ${device.hostname}`}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {device.device_type === 'laptop' ? 'Laptop' : 'Monitor'}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SaleModal;
