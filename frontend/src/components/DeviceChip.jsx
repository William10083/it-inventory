import React from 'react';
import { Laptop, Monitor, X } from 'lucide-react';

const DeviceChip = ({ device, price, onPriceChange, onRemove }) => {
    // Debug: ver qué tipo de dispositivo llega
    console.log('DeviceChip - Device:', {
        brand: device.brand,
        model: device.model,
        type: device.device_type,
        serial: device.serial_number,
        fullDevice: device
    });

    const Icon = device.device_type === 'laptop' ? Laptop : Monitor;
    const deviceTypeLabel = device.device_type === 'laptop' ? 'LAPTOP' : 'MONITOR';

    // Colores diferentes según el tipo
    const badgeColor = device.device_type === 'laptop'
        ? 'bg-blue-500/20 text-blue-400'  // Azul para laptops
        : 'bg-green-500/20 text-green-400'; // Verde para monitores

    return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 flex items-center gap-3 hover:border-slate-500 transition-colors">
            {/* Icon and Type Badge */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${badgeColor}`}>
                    {deviceTypeLabel}
                </span>
            </div>

            {/* Device Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">
                    {device.brand} {device.model}
                </div>
                <div className="text-xs text-slate-400 truncate">
                    SN: {device.serial_number} {device.hostname && `• ${device.hostname}`}
                </div>
            </div>

            {/* Price Input */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">S/.</span>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => onPriceChange(parseInt(e.target.value) || 0)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                />
            </div>

            {/* Remove Button */}
            <button
                onClick={onRemove}
                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Eliminar dispositivo"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default DeviceChip;
