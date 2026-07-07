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

    // Device-type hue tokens are mode-invariant — same hue in light/dark, no dark: pairing needed.
    const isLaptop = device.device_type === 'laptop';
    const badgeColor = isLaptop
        ? 'bg-device-laptop/20 text-device-laptop'
        : 'bg-device-monitor/20 text-device-monitor';

    return (
        <div className="bg-surface border border-slate-300 dark:border-slate-600 rounded-lg p-3 flex items-center gap-3 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            {/* Icon and Type Badge */}
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isLaptop ? 'bg-device-laptop/20' : 'bg-device-monitor/20'}`}>
                    <Icon className={`w-5 h-5 ${isLaptop ? 'text-device-laptop' : 'text-device-monitor'}`} />
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${badgeColor}`}>
                    {deviceTypeLabel}
                </span>
            </div>

            {/* Device Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">
                    {device.brand} {device.model}
                </div>
                <div className="text-xs text-muted truncate">
                    SN: {device.serial_number} {device.hostname && `• ${device.hostname}`}
                </div>
            </div>

            {/* Price Input */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted">S/.</span>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => onPriceChange(parseInt(e.target.value) || 0)}
                    className="w-20 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-accent outline-none"
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
