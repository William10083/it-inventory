import React, { memo } from 'react';
import { Download, Edit, UserX, AlertCircle, Package, Search, Trash2, Monitor, Laptop, Keyboard, Mouse, BatteryCharging, Headphones, Smartphone, Briefcase } from 'lucide-react';

// Componente memoizado para tarjetas de empleados
const EmployeeCard = memo(({
    employee,
    missingEquipment,
    onDownloadActa,
    onEditEmployee,
    onTerminateEmployee,
    onUpdateLocation,
    onViewDetails,
    onUnassignDevice,
    renderAssetCard
}) => {
    const emp = employee;

    return (
        <div className={`glass-card p-6 flex flex-col gap-4 border transition-all ${missingEquipment.length > 0 ? 'border-orange-500/50 hover:border-orange-400' : 'border-slate-700 hover:border-slate-500'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold ${missingEquipment.length > 0 ? 'bg-orange-600' : 'bg-slate-700'}`}>
                        {emp.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                            <h3 className="font-bold text-white leading-tight break-words">{emp.full_name}</h3>
                            <button
                                onClick={(e) => onDownloadActa(e, emp)}
                                className="text-slate-400 hover:text-white transition-colors flex-shrink-0 mt-0.5"
                                title="Descargar Acta Reciente"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEmployee(emp);
                                }}
                                className="text-slate-400 hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5"
                                title="Editar Empleado"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            {emp.is_active && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTerminateEmployee(emp);
                                    }}
                                    className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 mt-0.5"
                                    title="Marcar como Cesado"
                                >
                                    <UserX className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{emp.department} • DNI: {emp.dni}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                        value={emp.location || 'Callao'}
                        onChange={(e) => onUpdateLocation(emp.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white cursor-pointer"
                        title="Cambiar sede"
                    >
                        <option value="Callao">Callao</option>
                        <option value="San Isidro">San Isidro</option>
                        <option value="Paita">Paita</option>
                        <option value="Ilo">Ilo</option>
                        <option value="Mollendo">Mollendo</option>
                    </select>
                    <div className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20">
                        Active
                    </div>
                </div>
            </div>

            {/* Missing Equipment */}
            {missingEquipment.length > 0 && (
                <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                    <p className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Falta por asignar
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {missingEquipment.map((item, idx) => (
                            <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded bg-slate-700 text-orange-300 border border-orange-500/40"
                            >
                                {item.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Assets */}
            <div className="space-y-2 mt-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Equipos Asignados</p>
                {emp.assets.length > 0 ? (
                    <div className="space-y-3">
                        <AssetsRenderer
                            assets={emp.assets}
                            renderAssetCard={renderAssetCard}
                            onViewDetails={onViewDetails}
                            onUnassignDevice={onUnassignDevice}
                        />
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">Sin equipos asignados</p>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison para evitar re-renders innecesarios
    return (
        prevProps.employee.id === nextProps.employee.id &&
        prevProps.employee.location === nextProps.employee.location &&
        prevProps.employee.assets?.length === nextProps.employee.assets?.length &&
        prevProps.missingEquipment.length === nextProps.missingEquipment.length
    );
});

// Componente para renderizar assets (también memoizado)
const AssetsRenderer = memo(({ assets, renderAssetCard, onViewDetails, onUnassignDevice }) => {
    const laptops = assets.filter(d => d.device_type === 'laptop');
    const chargers = assets.filter(d => d.device_type === 'charger');
    const mobiles = assets.filter(d => d.device_type === 'mobile');
    const monitors = assets.filter(d => d.device_type === 'monitor');
    const accessories = assets.filter(d => !['laptop', 'charger', 'mobile', 'monitor'].includes(d.device_type));

    const usedChargerIds = new Set();
    const renderedItems = [];

    const renderSection = (title, icon, content) => (
        <div key={`section-${title}`} className="border border-slate-600/50 rounded-xl overflow-hidden bg-slate-900/30 mb-2">
            <div className="bg-slate-800/80 px-4 py-2 flex items-center gap-2 border-b border-slate-700/50">
                {icon}
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
            </div>
            <div className="p-2 space-y-2">
                {content}
            </div>
        </div>
    );

    // Render LAPTOPS
    if (laptops.length > 0) {
        const laptopContent = laptops.map(laptop => {
            const charger = chargers.find(c => !usedChargerIds.has(c.id));
            if (charger) usedChargerIds.add(charger.id);
            return (
                <div key={laptop.id}>
                    {renderAssetCard(laptop, true, "LAPTOP", onViewDetails, onUnassignDevice)}
                </div>
            );
        });
        renderedItems.push(renderSection("LAPTOP", <Monitor className="w-4 h-4 text-blue-400" />, laptopContent));
    }

    // Render MONITORS
    if (monitors.length > 0) {
        const monitorContent = monitors.map(m => renderAssetCard(m, true, "MONITOR", onViewDetails, onUnassignDevice));
        renderedItems.push(renderSection("MONITORES", <Monitor className="w-4 h-4 text-purple-400" />, monitorContent));
    }

    // Render CELULARES
    if (mobiles.length > 0) {
        const mobileContent = mobiles.map(m => {
            const charger = chargers.find(c => !usedChargerIds.has(c.id));
            if (charger) usedChargerIds.add(charger.id);
            return renderAssetCard(m, true, "CELULAR", onViewDetails, onUnassignDevice);
        });
        renderedItems.push(renderSection("CELULARES", <Smartphone className="w-4 h-4 text-green-400" />, mobileContent));
    }

    // Render ACCESSORIES
    if (accessories.length > 0) {
        const accContent = [];
        const unusedChargers = chargers.filter(c => !usedChargerIds.has(c.id));
        unusedChargers.forEach(c => {
            accContent.push(renderAssetCard(c, true, "CARGADOR", onViewDetails, onUnassignDevice));
        });

        accessories.forEach(a => {
            let label = "ACCESORIO";
            if (a.device_type === 'keyboard_mouse_kit') label = "KIT TECLADO/MOUSE";
            else if (a.device_type === 'keyboard') label = "TECLADO";
            else if (a.device_type === 'mouse') label = "MOUSE";
            else if (a.device_type === 'backpack') label = "MOCHILA";
            else if (a.device_type === 'headphones') label = "AURICULARES";
            accContent.push(renderAssetCard(a, true, label, onViewDetails, onUnassignDevice));
        });

        if (accContent.length > 0) {
            renderedItems.push(renderSection("ACCESORIOS", <Package className="w-4 h-4 text-yellow-400" />, accContent));
        }
    }

    return <>{renderedItems}</>;
});

EmployeeCard.displayName = 'EmployeeCard';
AssetsRenderer.displayName = 'AssetsRenderer';

export default EmployeeCard;
