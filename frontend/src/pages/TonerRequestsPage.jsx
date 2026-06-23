import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Loader, Printer, Package, Edit2, Trash2, X, MapPin, Wifi, ChevronDown, Droplet, RefreshCw, AlertTriangle, Lock, Unlock } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COLORS = ['Negro', 'Cian', 'Magenta', 'Amarillo', 'Color (tricolor)'];
const SEDES = ['Callao', 'San Isidro', 'Ilo', 'Mollendo', 'Pucallpa', 'Chimbote', 'Supe', 'Tacna', 'Paita'];

const PRIORITIES = [
    { value: 'normal', label: 'Normal', cls: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/30' },
    { value: 'alta', label: 'Alta', cls: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' },
    { value: 'urgente', label: 'Urgente', cls: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' },
];
const STATUSES = [
    { value: 'pendiente', label: 'Pendiente', cls: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
    { value: 'aprobado', label: 'Aprobado', cls: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { value: 'ordenado', label: 'Ordenado', cls: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    { value: 'recibido', label: 'Recibido', cls: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { value: 'cancelado', label: 'Cancelado', cls: 'bg-slate-600/20 text-slate-500 border-slate-600/30' },
];

const badge = (arr, val) => {
    const found = arr.find(x => x.value === val);
    return found ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${found.cls}`}>{found.label}</span>
        : <span className="text-slate-500 dark:text-slate-500 text-xs">{val}</span>;
};

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// ─── NIVELES DE SUMINISTRO (SNMP) ──────────────────────────────────────────────
// Status-threshold colors (ink/toner level percentage) — kept as semantic severity
// hues with light/dark text pairing added; the underlying color logic (red/orange/
// yellow/emerald by percent threshold) is intentionally unchanged.
const levelBarColor = (pct) => pct == null ? 'bg-slate-400 dark:bg-slate-500' : pct <= 15 ? 'bg-red-500' : pct <= 35 ? 'bg-orange-500' : pct <= 60 ? 'bg-yellow-500' : 'bg-emerald-500';
const levelTextColor = (pct) => pct == null ? 'text-slate-500 dark:text-slate-400' : pct <= 15 ? 'text-red-600 dark:text-red-400' : pct <= 35 ? 'text-orange-600 dark:text-orange-400' : pct <= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400';

const SupplyLevels = ({ data, loading }) => {
    if (!data) {
        return <p className="text-xs text-slate-400 dark:text-slate-600 italic">{loading ? 'Consultando...' : 'Cargando niveles...'}</p>;
    }
    if (!data.online) {
        return <p className="text-xs text-red-500/80 dark:text-red-400/80">La impresora no respondió (apagada o fuera de red)</p>;
    }
    if (!data.supplies?.length) {
        return <p className="text-xs text-slate-400 dark:text-slate-600 italic">La impresora no reporta niveles de suministro</p>;
    }
    return (
        <div className="space-y-1.5">
            {data.supplies.map((s, i) => (
                <div key={i} className="text-xs">
                    <div className="flex items-center justify-between mb-0.5 gap-2">
                        <span className="text-slate-600 dark:text-slate-300 truncate">{s.name}</span>
                        <span className={`font-medium flex-shrink-0 ${levelTextColor(s.percent)}`}>
                            {s.percent != null ? `${s.percent}%` : (s.note || '—')}
                        </span>
                    </div>
                    {s.percent != null && (
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${levelBarColor(s.percent)}`} style={{ width: `${s.percent}%` }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// ─── ALERTAS DE TÓNER (sin stock + nivel bajo) ─────────────────────────────────
const COLOR_KEYWORDS = {
    'Negro': ['negro', 'black'],
    'Cian': ['cian', 'cyan'],
    'Magenta': ['magenta'],
    'Amarillo': ['amarillo', 'yellow'],
    'Color (tricolor)': ['color', 'tricolor', 'tri-color', 'combo'],
};

const matchSupplyForColor = (supplies, color) => {
    const keywords = COLOR_KEYWORDS[color] || [color.toLowerCase()];
    return supplies?.find(s => keywords.some(k => s.name?.toLowerCase().includes(k))) || null;
};

const LOW_LEVEL_THRESHOLD = 50;

// Devuelve el suministro relacionado si el tóner no tiene stock Y su nivel actual está por debajo del umbral
const getUrgentSupply = (inkLevels, printer, toner) => {
    const stock = toner.stock === '' || toner.stock == null ? null : Number(toner.stock);
    if (stock === null || stock > 0) return null;
    const inkData = inkLevels[printer.id];
    if (!inkData?.online) return null;
    const supply = matchSupplyForColor(inkData.supplies, toner.color);
    if (supply?.percent != null && supply.percent < LOW_LEVEL_THRESHOLD) return supply;
    return null;
};

// ─── PRINTER FORM ─────────────────────────────────────────────────────────────
const EMPTY_PRINTER = { brand: '', model: '', serial_number: '', inventory_code: '', ip_address: '', location: 'Callao', toner_info: [] };
const EMPTY_TONER_ROW = { color: 'Negro', brand: '', reference: '', stock: 0, weight_gr: '', unit_value: '' };

const PrinterModal = ({ printer, onClose, onSaved }) => {
    const { showNotification } = useNotification();
    const [form, setForm] = useState(printer ? { ...printer } : { ...EMPTY_PRINTER });
    const [saving, setSaving] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [priceFieldsUnlocked, setPriceFieldsUnlocked] = useState(false);
    const lookupRef = useRef(null);

    const addToner = () => setForm(f => ({ ...f, toner_info: [...f.toner_info, { ...EMPTY_TONER_ROW }] }));
    const removeToner = (i) => setForm(f => ({ ...f, toner_info: f.toner_info.filter((_, idx) => idx !== i) }));
    const updateToner = (i, field, val) => setForm(f => ({
        ...f, toner_info: f.toner_info.map((t, idx) => idx === i ? { ...t, [field]: val } : t)
    }));

    const lookupToners = async (brand, model) => {
        if (!brand || !model || model.length < 3) return;
        clearTimeout(lookupRef.current);
        lookupRef.current = setTimeout(async () => {
            setLookingUp(true);
            try {
                const res = await axios.get(`${API_URL}/toner-requests/toner-lookup`, { params: { brand, model } });
                if (res.data.toners?.length > 0) {
                    setForm(f => ({ ...f, toner_info: res.data.toners }));
                    showNotification(`Tóneres cargados automáticamente (${res.data.source === 'ai' ? 'IA' : 'catálogo'})`, 'success');
                }
            } catch { /* silencioso */ }
            finally { setLookingUp(false); }
        }, 800);
    };

    const handleSave = async () => {
        if (!form.brand || !form.model) return showNotification('Marca y modelo son requeridos', 'error');
        setSaving(true);
        try {
            if (printer) {
                await axios.patch(`${API_URL}/toner-requests/printers/${printer.id}`, form);
            } else {
                await axios.post(`${API_URL}/toner-requests/printers`, form);
            }
            showNotification(printer ? 'Impresora actualizada' : 'Impresora registrada', 'success');
            onSaved();
            onClose();
        } catch { showNotification('Error al guardar', 'error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-surface">
                    <h3 className="text-slate-900 dark:text-white font-semibold">{printer ? 'Editar Impresora' : 'Registrar Impresora'}</h3>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Marca *</label>
                            <input value={form.brand} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, brand: v })); lookupToners(v, form.model); }}
                                placeholder="HP, Epson, Canon..." className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Modelo *</label>
                            <input value={form.model} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, model: v })); lookupToners(form.brand, v); }}
                                placeholder="LaserJet Pro M404n..." className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">N° Serie</label>
                            <input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })}
                                placeholder="CNBHJ12345" className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Cód. Inventario</label>
                            <input value={form.inventory_code} onChange={e => setForm({ ...form, inventory_code: e.target.value })}
                                placeholder="INV-IMP-001" className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Dirección IP</label>
                            <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })}
                                placeholder="192.168.1.100" className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Sede</label>
                            <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Toners */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                Tóneres compatibles
                                {lookingUp && <span className="text-violet-600 dark:text-violet-400 text-xs flex items-center gap-1"><Loader className="w-3 h-3 animate-spin" /> Buscando...</span>}
                            </label>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setPriceFieldsUnlocked(v => !v)}
                                    title={priceFieldsUnlocked ? 'Bloquear edición de Peso (g) / Valor unit.' : 'Desbloquear edición de Peso (g) / Valor unit.'}
                                    className="text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors">
                                    {priceFieldsUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={addToner} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                </button>
                            </div>
                        </div>
                        {form.toner_info.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-600 italic">Sin tóneres registrados</p>
                        ) : (
                            <div className="space-y-2">
                                <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_48px_56px_64px_auto] gap-2">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide truncate">Color</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide truncate">Marca</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide truncate">Referencia</span>
                                    <span className="text-[10px] text-slate-500 uppercase text-center truncate">Stock</span>
                                    <span className="text-[10px] text-slate-500 uppercase text-center truncate" title="Peso (g)">Peso</span>
                                    <span className="text-[10px] text-slate-500 uppercase text-center truncate" title="Valor unitario">Valor</span>
                                    <span className="w-4"></span>
                                </div>
                                {form.toner_info.map((t, i) => (
                                    <div key={i} className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_48px_56px_64px_auto] gap-2 items-center">
                                        <select value={t.color} onChange={e => updateToner(i, 'color', e.target.value)}
                                            className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input value={t.brand} onChange={e => updateToner(i, 'brand', e.target.value)}
                                            placeholder="Marca" className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                                        <input value={t.reference} onChange={e => updateToner(i, 'reference', e.target.value)}
                                            placeholder="Referencia / código" className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-violet-500" />
                                        <input type="number" min="0" value={t.stock ?? ''}
                                            onChange={e => updateToner(i, 'stock', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                            placeholder="0" title="Unidades de repuesto en almacén"
                                            className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white text-center focus:outline-none focus:border-violet-500" />
                                        <input type="number" min="0" value={t.weight_gr ?? ''} disabled={!priceFieldsUnlocked}
                                            onChange={e => updateToner(i, 'weight_gr', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                            placeholder="g" title={priceFieldsUnlocked ? 'Peso del cartucho en gramos (para la factura de envío)' : 'Bloqueado — haz clic en el candado del encabezado para editar'}
                                            className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white text-center focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                                        <input type="number" min="0" step="0.01" value={t.unit_value ?? ''} disabled={!priceFieldsUnlocked}
                                            onChange={e => updateToner(i, 'unit_value', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                                            placeholder="0.00" title={priceFieldsUnlocked ? 'Valor unitario (para la factura de envío)' : 'Bloqueado — haz clic en el candado del encabezado para editar'}
                                            className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white text-center focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                                        <button onClick={() => removeToner(i)} className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <button onClick={handleSave} disabled={saving}
                        className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                        {saving ? 'Guardando...' : (printer ? 'Actualizar' : 'Registrar Impresora')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── TONER REQUEST FORM ────────────────────────────────────────────────────────
// Cada bloque (impresora) puede incluir varios tóneres a la vez — cada uno termina
// como una solicitud independiente (mismo device_id, distinto color/referencia/cantidad).
const emptyItem = () => ({ device_id: '', toners: [] });
const emptyManualToner = () => ({ color: 'Negro', toner_reference: '', quantity: 1 });

// Si el tóner elegido no tiene stock de repuesto, se sugiere pedir 3 unidades como prioridad (editable)
const defaultQuantityFor = (toner) => {
    if (!toner) return 1;
    const stock = toner.stock === '' || toner.stock == null ? null : Number(toner.stock);
    return stock === 0 ? 3 : 1;
};

const itemFromPrefill = (p) => p
    ? { device_id: p.device_id || '', toners: [{ color: p.color || 'Negro', toner_reference: p.toner_reference || '', quantity: p.quantity || 1 }] }
    : emptyItem();

const RequestModal = ({ request, prefill, printers, onClose, onSaved, currentUser }) => {
    const { showNotification } = useNotification();
    const isEdit = !!request;

    // En edición se maneja un solo ítem (1 solicitud = 1 registro). Al crear, se puede
    // armar un bloque con varias impresoras que se enviarán como solicitudes independientes.
    const [items, setItems] = useState(() => isEdit
        ? [{ device_id: request.device_id || '', toners: [{ color: request.color, toner_reference: request.toner_reference, quantity: request.quantity }] }]
        : [itemFromPrefill(prefill)]);
    const [shared, setShared] = useState({
        priority: request?.priority || 'normal',
        notes: request?.notes || '',
        requested_by: request?.requested_by || currentUser?.full_name || currentUser?.username || '',
    });
    const [saving, setSaving] = useState(false);

    // Filtro de sede: acota el selector de impresoras a una sola sede
    const [locationFilter, setLocationFilter] = useState(() => {
        const presetId = prefill?.device_id || request?.device_id;
        return printers.find(p => p.id === parseInt(presetId))?.location || '';
    });
    const locations = [...new Set(printers.map(p => p.location).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const handleLocationFilterChange = (loc) => {
        setLocationFilter(loc);
        setItems(arr => arr.map(() => emptyItem()));
    };

    // Impresoras elegibles para el ítem i: de la sede filtrada y que no estén ya elegidas en otro bloque
    const printerOptionsFor = (i) => printers.filter(p =>
        (!locationFilter || p.location === locationFilter) &&
        !items.some((other, oidx) => oidx !== i && other.device_id === p.id)
    );

    // Total de solicitudes que se crearán: una por cada tóner elegido en cada bloque
    const totalRequests = items.reduce((sum, it) => sum + it.toners.length, 0);

    const updateItem = (i, patch) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const addItem = () => setItems(arr => [...arr, emptyItem()]);
    const removeItem = (i) => setItems(arr => arr.filter((_, idx) => idx !== i));

    // Actualiza el tóner ti del bloque i; si todavía no existe (ej. entrada manual antes de elegir impresora), lo crea
    const updateToner = (i, ti, patch) => setItems(arr => arr.map((it, idx) => {
        if (idx !== i) return it;
        if (ti >= it.toners.length) return { ...it, toners: [...it.toners, { ...emptyManualToner(), ...patch }] };
        return { ...it, toners: it.toners.map((t, tidx) => tidx === ti ? { ...t, ...patch } : t) };
    }));
    const removeToner = (i, ti) => setItems(arr => arr.map((it, idx) =>
        idx !== i ? it : { ...it, toners: it.toners.filter((_, tidx) => tidx !== ti) }
    ));

    const handlePrinterChange = (i, deviceId) => {
        const printer = printers.find(p => p.id === parseInt(deviceId));
        const known = printer?.toner_info || [];
        // Con catálogo de tóneres se eligen por chips (selección múltiple); sin catálogo, un campo manual editable
        updateItem(i, {
            device_id: deviceId ? parseInt(deviceId) : '',
            toners: known.length > 0 ? [] : [emptyManualToner()],
        });
    };

    // Click en un chip de tóner: lo agrega o quita de la lista de ese bloque (selección múltiple)
    const toggleToner = (i, toner) => setItems(arr => arr.map((it, idx) => {
        if (idx !== i) return it;
        const matches = (t) => t.color === toner.color && t.toner_reference === toner.reference;
        const toners = it.toners.some(matches)
            ? it.toners.filter(t => !matches(t))
            : [...it.toners, { color: toner.color, toner_reference: toner.reference, quantity: defaultQuantityFor(toner) }];
        return { ...it, toners };
    }));

    // Descarga la factura de envío (PDF) de un bloque (impresora + tóneres solicitados)
    const downloadShippingPdf = async (allItems) => {
        try {
            const res = await axios.post(`${API_URL}/toner-requests/shipping-pdf`, {
                blocks: allItems.map(it => ({
                    device_id: it.device_id,
                    items: it.toners.map(t => ({ color: t.color, toner_reference: t.toner_reference, quantity: t.quantity })),
                })),
            }, { responseType: 'blob' });
            const firstPrinter = printers.find(p => p.id === allItems[0]?.device_id);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `factura_envio_${firstPrinter?.location || 'bloque'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            showNotification(
                'Solicitud creada, pero no se pudo generar la factura de envío (revisa la configuración de sedes en Configuración > Envíos)',
                'warning'
            );
        }
    };

    const handleSave = async () => {
        if (items.some(it => !it.device_id || it.toners.length === 0)) {
            return showNotification('Selecciona una impresora y al menos un tóner en cada bloque', 'error');
        }
        setSaving(true);
        try {
            if (isEdit) {
                const t = items[0].toners[0];
                await axios.patch(`${API_URL}/toner-requests/${request.id}`, { device_id: items[0].device_id, ...t, ...shared });
            } else {
                const requests = items.flatMap(it => it.toners.map(t => ({ device_id: it.device_id, ...t, ...shared })));
                await Promise.all(requests.map(r => axios.post(`${API_URL}/toner-requests/`, r)));
                // Un solo PDF con todos los ítems del bloque completo
                await downloadShippingPdf(items);
            }
            showNotification(
                isEdit ? 'Solicitud actualizada' : (totalRequests > 1 ? `${totalRequests} solicitudes creadas` : 'Solicitud creada'),
                'success'
            );
            onSaved();
            onClose();
        } catch { showNotification('Error al guardar', 'error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl w-full ${isEdit ? 'max-w-xl' : 'max-w-5xl'} shadow-2xl max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-surface">
                    <h3 className="text-slate-900 dark:text-white font-semibold">{isEdit ? 'Editar Solicitud' : 'Nueva Solicitud de Tóner'}</h3>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {!isEdit && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Sede</label>
                            <select value={locationFilter} onChange={e => handleLocationFilterChange(e.target.value)}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                <option value="">Todas las sedes</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                            <p className="text-[11px] text-slate-500 mt-1">Filtra el selector de impresoras a una sola sede.</p>
                        </div>
                    )}

                    {!isEdit && totalRequests > 1 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Se crearán <span className="text-violet-600 dark:text-violet-400 font-semibold">{totalRequests} solicitudes</span> (una por cada tóner elegido), todas con la misma prioridad, notas y solicitante.
                        </p>
                    )}

                    <div className={items.length > 1 ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'space-y-3'}>
                        {items.map((it, i) => {
                            const selectedPrinter = printers.find(p => p.id === parseInt(it.device_id));
                            const printerToners = selectedPrinter?.toner_info || [];
                            const printerOptions = printerOptionsFor(i);
                            return (
                                <div key={i} className={items.length > 1 ? 'border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5' : 'space-y-3'}>
                                    {items.length > 1 ? (
                                        <div className="flex items-center gap-2">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600/20 text-violet-600 dark:text-violet-400 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                                            <select value={it.device_id} onChange={e => handlePrinterChange(i, e.target.value)}
                                                className="flex-1 min-w-0 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                                <option value="">Seleccionar impresora...</option>
                                                {printerOptions.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.brand} {p.model} — {p.location}{p.ip_address ? ` (${p.ip_address})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={() => removeItem(i)} className="shrink-0 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Impresora *</label>
                                            <select value={it.device_id} onChange={e => handlePrinterChange(i, e.target.value)}
                                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                                <option value="">Seleccionar impresora...</option>
                                                {printerOptions.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.brand} {p.model} — {p.location}{p.ip_address ? ` (${p.ip_address})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {printerToners.length > 0 ? (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                                    Tóner de la impresora <span className="text-slate-500 font-normal normal-case">(elige uno o varios)</span>
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {printerToners.map((t, ti) => {
                                                        const tonerNoStock = !(t.stock === '' || t.stock == null) && Number(t.stock) === 0;
                                                        const selected = it.toners.some(x => x.color === t.color && x.toner_reference === t.reference);
                                                        return (
                                                            <button key={ti} onClick={() => toggleToner(i, t)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-violet-600 border-violet-500 text-white' : 'bg-bg border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-violet-500'}`}>
                                                                {t.color}{t.reference ? ` — ${t.reference}` : ''}{t.brand ? ` (${t.brand})` : ''}
                                                                {tonerNoStock && <span className="ml-1 text-red-500 dark:text-red-400">· sin stock</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {it.toners.length > 0 && (
                                                <div className="space-y-2">
                                                    {it.toners.map((t, ti) => {
                                                        const match = printerToners.find(pt => pt.color === t.color && pt.reference === t.toner_reference);
                                                        const noStock = match && !(match.stock === '' || match.stock == null) && Number(match.stock) === 0;
                                                        return (
                                                            <div key={ti} className="flex items-center gap-3 bg-surface/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-slate-900 dark:text-white truncate">{t.color}{t.toner_reference ? ` — ${t.toner_reference}` : ''}</p>
                                                                    {noStock && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">sin stock · se sugieren 3</p>}
                                                                </div>
                                                                <div className="w-20 shrink-0">
                                                                    <input type="number" min="1" value={t.quantity} aria-label="Cantidad"
                                                                        onChange={e => updateToner(i, ti, { quantity: parseInt(e.target.value) || 1 })}
                                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white text-center focus:outline-none focus:border-violet-500" />
                                                                </div>
                                                                <button onClick={() => removeToner(i, ti)} className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Color</label>
                                                    <select value={it.toners[0]?.color || 'Negro'} onChange={e => updateToner(i, 0, { color: e.target.value })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                                        {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Cantidad</label>
                                                    <input type="number" min="1" value={it.toners[0]?.quantity ?? 1}
                                                        onChange={e => updateToner(i, 0, { quantity: parseInt(e.target.value) || 1 })}
                                                        className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Referencia del tóner</label>
                                                <input value={it.toners[0]?.toner_reference || ''} onChange={e => updateToner(i, 0, { toner_reference: e.target.value })}
                                                    placeholder="Ej: CF217A, TN-450..." className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-violet-500" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!isEdit && (
                        <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Agregar otra impresora a esta solicitud
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Prioridad</label>
                            <select value={shared.priority} onChange={e => setShared(s => ({ ...s, priority: e.target.value }))}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500">
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Solicitado por</label>
                            <input value={shared.requested_by} onChange={e => setShared(s => ({ ...s, requested_by: e.target.value }))}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notas</label>
                        <textarea rows={2} value={shared.notes} onChange={e => setShared(s => ({ ...s, notes: e.target.value }))}
                            placeholder="Observaciones adicionales..." className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 resize-none" />
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <button onClick={handleSave} disabled={saving}
                        className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : (totalRequests > 1 ? `Crear ${totalRequests} Solicitudes` : 'Crear Solicitud'))}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TonerRequestsPage = () => {
    const { showNotification, showConfirm } = useNotification();
    const { user } = useAuth();
    const [tab, setTab] = useState('impresoras');

    // Printers state
    const [printers, setPrinters] = useState([]);
    const [printersLoading, setPrintersLoading] = useState(true);
    const [printerModal, setPrinterModal] = useState(null); // null=closed, false=new, obj=edit
    const [inkLevels, setInkLevels] = useState({});
    const [inkLevelsLoading, setInkLevelsLoading] = useState(false);

    // Requests state
    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [requestModal, setRequestModal] = useState(null);
    const [requestPrefill, setRequestPrefill] = useState(null);
    const debounceRef = useRef(null);

    const openRequestModal = (prefill = null) => {
        setRequestPrefill(prefill);
        setRequestModal(false);
    };
    const closeRequestModal = () => {
        setRequestModal(null);
        setRequestPrefill(null);
    };

    const fetchPrinters = async () => {
        setPrintersLoading(true);
        try {
            const res = await axios.get(`${API_URL}/toner-requests/printers`);
            setPrinters(res.data);
        } catch { showNotification('Error al cargar impresoras', 'error'); }
        finally { setPrintersLoading(false); }
    };

    const fetchInkLevels = async (silent = false, force = false) => {
        if (!silent) setInkLevelsLoading(true);
        try {
            // Por defecto el backend sirve desde caché (instantáneo); force=true pide
            // una consulta SNMP en vivo (más lenta, usada solo en el refresco manual).
            const res = await axios.get(`${API_URL}/toner-requests/ink-levels`, force ? { params: { force: true } } : undefined);
            setInkLevels(res.data || {});
        } catch { if (!silent) showNotification('Error al consultar niveles de tinta/tóner', 'error'); }
        finally { if (!silent) setInkLevelsLoading(false); }
    };

    const fetchRequests = async () => {
        setRequestsLoading(true);
        try {
            const params = { skip: 0, limit: 200 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const res = await axios.get(`${API_URL}/toner-requests/`, { params });
            setRequests(res.data.items || []);
        } catch { showNotification('Error al cargar solicitudes', 'error'); }
        finally { setRequestsLoading(false); }
    };

    useEffect(() => { fetchPrinters(); }, []);

    // Niveles de tóner/tinta en vivo: se consultan al entrar y se refrescan solos cada 30s
    // (igual que las demás alertas del sistema), sin necesidad de pulsar "Consultar niveles".
    useEffect(() => {
        fetchInkLevels();
        const interval = setInterval(() => {
            if (document.hidden) return;
            fetchInkLevels(true);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchRequests, search ? 400 : 0);
        return () => clearTimeout(debounceRef.current);
    }, [search, statusFilter]);

    const handleDeletePrinter = async (id) => {
        const confirmed = await showConfirm('¿Eliminar esta impresora?');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_URL}/toner-requests/printers/${id}`);
            setPrinters(prev => prev.filter(p => p.id !== id));
            showNotification('Impresora eliminada', 'success');
        } catch { showNotification('Error al eliminar', 'error'); }
    };

    const handleStatusChange = async (req, newStatus) => {
        try {
            await axios.patch(`${API_URL}/toner-requests/${req.id}`, { status: newStatus });
            fetchRequests();
        } catch { showNotification('Error al actualizar estado', 'error'); }
    };

    const handleDeleteRequest = async (id) => {
        const confirmed = await showConfirm('¿Eliminar esta solicitud?');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_URL}/toner-requests/${id}`);
            showNotification('Solicitud eliminada', 'success');
            fetchRequests();
        } catch { showNotification('Error al eliminar', 'error'); }
    };

    // Impresoras sin stock de tóner Y con nivel actual por debajo del umbral
    const urgentAlerts = [];
    printers.forEach(p => {
        (p.toner_info || []).forEach(t => {
            const supply = getUrgentSupply(inkLevels, p, t);
            if (supply) urgentAlerts.push({ printer: p, toner: t, supply });
        });
    });

    // Group printers by location
    const byLocation = printers.reduce((acc, p) => {
        const loc = p.location || 'Sin sede';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Printer className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        Gestión de Tóner
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{printers.length} impresora{printers.length !== 1 ? 's' : ''} registrada{printers.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                <button onClick={() => setTab('impresoras')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'impresoras' ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    🖨️ Impresoras
                </button>
                <button onClick={() => setTab('solicitudes')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'solicitudes' ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    📦 Solicitudes de Tóner
                </button>
            </div>

            {/* ── IMPRESORAS TAB ── */}
            {tab === 'impresoras' && (
                <div className="space-y-4">
                    {urgentAlerts.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2.5">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-4 h-4" />
                                Atención urgente — sin stock y nivel de tóner por debajo de {LOW_LEVEL_THRESHOLD}% ({urgentAlerts.length})
                            </h3>
                            <div className="space-y-1.5">
                                {urgentAlerts.map((a, i) => (
                                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 bg-bg/40 rounded-lg px-3 py-2">
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            <span className="text-slate-900 dark:text-white font-medium">{a.printer.brand} {a.printer.model}</span>
                                            <span className="text-slate-500"> · {a.printer.location}</span>
                                            <span> — {a.toner.color}{a.toner.reference ? ` (${a.toner.reference})` : ''} al <span className="text-red-600 dark:text-red-400 font-semibold">{a.supply.percent}%</span> y sin stock de repuesto</span>
                                        </p>
                                        <button
                                            onClick={() => openRequestModal({ device_id: a.printer.id, color: a.toner.color, toner_reference: a.toner.reference, quantity: 3 })}
                                            className="flex-shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 underline underline-offset-2">
                                            Crear solicitud para esta impresora
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button onClick={() => fetchInkLevels(false, true)} disabled={inkLevelsLoading}
                            title="Los niveles se actualizan solos; usa este botón para forzar una consulta SNMP en vivo ahora mismo"
                            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                            {inkLevelsLoading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Actualizar ahora
                        </button>
                        <button onClick={() => setPrinterModal(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /> Registrar Impresora
                        </button>
                    </div>

                    {printersLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
                        </div>
                    ) : printers.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 dark:text-slate-400 bg-surface/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium">Sin impresoras registradas</p>
                            <p className="text-sm mt-1">Registra las impresoras de cada sede.</p>
                        </div>
                    ) : (
                        Object.entries(byLocation).sort(([a], [b]) => a.localeCompare(b)).map(([loc, list]) => (
                            <div key={loc}>
                                <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-3">
                                    <MapPin className="w-3.5 h-3.5" /> {loc} <span className="text-slate-400 dark:text-slate-600">({list.length})</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {list.map(p => (
                                        <div key={p.id} className="bg-surface/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-500/40 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-semibold">{p.brand} {p.model}</p>
                                                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                                                        {p.serial_number && <span className="text-xs text-slate-500 font-mono">SN: {p.serial_number}</span>}
                                                        {p.inventory_code && <span className="text-xs text-slate-500">Inv: {p.inventory_code}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setPrinterModal(p)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => handleDeletePrinter(p.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                            {p.ip_address && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                    <Wifi className="w-3 h-3" /> <span className="font-mono">{p.ip_address}</span>
                                                </div>
                                            )}
                                            {p.toner_info.length > 0 && (
                                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                                    <p className="text-xs text-slate-500 mb-1.5">Tóneres:</p>
                                                    <div className="space-y-1">
                                                        {p.toner_info.map((t, i) => {
                                                            const urgent = getUrgentSupply(inkLevels, p, t);
                                                            const hasStock = !(t.stock === '' || t.stock == null);
                                                            return (
                                                                <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                                                                    <span className="text-slate-600 dark:text-slate-300 w-20 flex-shrink-0">{t.color}</span>
                                                                    {t.brand && <span className="text-slate-500">{t.brand}</span>}
                                                                    {t.reference && <span className="font-mono text-violet-600 dark:text-violet-400">{t.reference}</span>}
                                                                    {hasStock && (
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${Number(t.stock) > 0 ? 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600' : 'text-red-600 dark:text-red-400 border-red-500/40 bg-red-500/10'}`}>
                                                                            Stock: {t.stock}
                                                                        </span>
                                                                    )}
                                                                    {urgent && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-semibold">
                                                                            <AlertTriangle className="w-3 h-3" /> Atención urgente
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {p.ip_address && (
                                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                                    <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                                                        <Droplet className="w-3 h-3" /> Niveles de suministro
                                                    </p>
                                                    <SupplyLevels data={inkLevels[p.id]} loading={inkLevelsLoading} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── SOLICITUDES TAB ── */}
            {tab === 'solicitudes' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 justify-end">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="bg-surface border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500">
                            <option value="">Todos los estados</option>
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 w-48" />
                        </div>
                        <button onClick={() => openRequestModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /> Nueva Solicitud
                        </button>
                    </div>

                    <div className="bg-surface/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {requestsLoading ? (
                            <div className="flex items-center justify-center py-20"><Loader className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" /></div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-lg font-medium">Sin solicitudes</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-bg/50">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Impresora</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tóner</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cant.</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prioridad</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Solicitado por</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {requests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-slate-900 dark:text-white font-medium">{req.printer_brand} {req.printer_model}</p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {req.printer_location && <span className="text-xs text-slate-500">{req.printer_location}</span>}
                                                        {req.printer_ip && <span className="text-xs text-slate-500 font-mono">{req.printer_ip}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-slate-900 dark:text-white">{req.color}</p>
                                                    {req.toner_reference && <p className="text-xs text-violet-600 dark:text-violet-400 font-mono">{req.toner_reference}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{req.quantity}</td>
                                                <td className="px-4 py-3">{badge(PRIORITIES, req.priority)}</td>
                                                <td className="px-4 py-3">
                                                    <select value={req.status} onChange={e => handleStatusChange(req, e.target.value)}
                                                        className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs rounded px-2 py-1 focus:outline-none cursor-pointer">
                                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm">{req.requested_by || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(req.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setRequestModal(req)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteRequest(req.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {printerModal !== null && (
                <PrinterModal
                    printer={printerModal || null}
                    onClose={() => setPrinterModal(null)}
                    onSaved={fetchPrinters}
                />
            )}
            {requestModal !== null && (
                <RequestModal
                    request={requestModal || null}
                    prefill={requestModal === false ? requestPrefill : null}
                    printers={printers}
                    onClose={closeRequestModal}
                    onSaved={fetchRequests}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default TonerRequestsPage;
