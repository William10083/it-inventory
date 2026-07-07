import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Anchor, Phone, User, RefreshCw, Settings, Smartphone, X, Search, Shield, ChevronDown, ChevronUp, Users } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LANCHA_COLORS = {
    Yarina:  { bg: '#3B82F6', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   glow: 'hover:shadow-blue-500/10',  border: 'hover:border-blue-500/40'  },
    Pacay:   { bg: '#10B981', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', glow: 'hover:shadow-emerald-500/10', border: 'hover:border-emerald-500/40' },
    Pitaya:  { bg: '#8B5CF6', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',  glow: 'hover:shadow-violet-500/10',  border: 'hover:border-violet-500/40'  },
    Pama:    { bg: '#F59E0B', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   glow: 'hover:shadow-amber-500/10',  border: 'hover:border-amber-500/40'  },
    'Guardia Yarina': { bg: '#EF4444', badge: 'bg-red-500/20 text-red-300 border-red-500/30',       glow: 'hover:shadow-red-500/10',    border: 'hover:border-red-500/40'    },
};
const DEFAULT_COLOR = { bg: '#06B6D4', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', glow: 'hover:shadow-cyan-500/10', border: 'hover:border-cyan-500/40' };

const BoatSVG = ({ color }) => (
    <svg viewBox="0 0 220 125" className="w-full h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sombra de agua */}
        <ellipse cx="110" cy="108" rx="88" ry="9" fill="#0c1e36" opacity="0.55"/>
        {/* Olas */}
        <path d="M22 105 Q60 98 100 104 Q140 110 178 104 Q198 100 208 105" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.45"/>
        <path d="M15 113 Q55 106 95 113 Q135 120 170 113 Q192 108 210 113" stroke="#7DD3FC" strokeWidth="1" fill="none" opacity="0.28"/>
        {/* Estela popa (derecha) */}
        <path d="M185 101 Q200 104 215 101" stroke="#BAE6FD" strokeWidth="1.5" fill="none" opacity="0.5" strokeDasharray="3 2"/>
        <path d="M188 106 Q206 110 218 107" stroke="#BAE6FD" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="2 3"/>

        {/* === CASCO === */}
        {/* Cuerpo principal */}
        <path d="M24 92 L43 70 L183 66 L191 75 L188 101 L38 104 Q27 104 22 96 Z" fill={color}/>
        {/* Sombra inferior del casco */}
        <path d="M24 92 L22 96 Q27 104 38 104 L188 101 L191 88 Z" fill="black" opacity="0.22"/>
        {/* Línea blanca superior del casco */}
        <path d="M27 90 L46 69 L183 67" stroke="white" strokeWidth="1.8" opacity="0.2" fill="none" strokeLinecap="round"/>
        {/* Línea de flotación */}
        <path d="M32 97 Q110 94 186 96" stroke="white" strokeWidth="0.8" opacity="0.15"/>

        {/* === PROA (bow) === */}
        {/* Cubierta delantera inclinada */}
        <path d="M43 70 L88 66 L88 72 L50 76 Z" fill="white" opacity="0.1"/>

        {/* === CABINA === */}
        {/* Cuerpo cabina */}
        <rect x="88" y="42" width="68" height="28" rx="4" fill={color}/>
        {/* Techo / highlight superior */}
        <path d="M86 42 Q122 36 158 42 L156 45 Q122 39 88 45 Z" fill="white" opacity="0.22"/>
        {/* Frente inclinado de cabina (parabrisas frame) */}
        <path d="M88 42 L74 66 L88 66 Z" fill={color} opacity="0.9"/>
        {/* Pared lateral cabina */}
        <path d="M88 66 L156 64 L156 70 L88 70 Z" fill="black" opacity="0.12"/>

        {/* === VENTANAS === */}
        <rect x="94" y="48" width="20" height="15" rx="2.5" fill="#BAE6FD" opacity="0.88"/>
        <rect x="118" y="48" width="20" height="15" rx="2.5" fill="#BAE6FD" opacity="0.88"/>
        <rect x="142" y="49" width="13" height="14" rx="2.5" fill="#BAE6FD" opacity="0.78"/>
        {/* Reflejos en ventanas */}
        <path d="M96 50 L101 50 L94 57 Z" fill="white" opacity="0.55"/>
        <path d="M120 50 L125 50 L118 57 Z" fill="white" opacity="0.55"/>

        {/* Parabrisas inclinado */}
        <path d="M88 42 L74 66 L88 66 Z" fill="#BAE6FD" opacity="0.22"/>
        <line x1="88" y1="42" x2="74" y2="66" stroke="white" strokeWidth="1" opacity="0.3"/>

        {/* Cubierta popa */}
        <path d="M156 64 L183 66 L191 75 L190 70 L158 68 Z" fill="white" opacity="0.07"/>

        {/* === ANTENA + BANDERA === */}
        <line x1="120" y1="6" x2="120" y2="42" stroke="white" strokeWidth="1.2" opacity="0.45"/>
        <circle cx="120" cy="6" r="2.5" fill="#FBBF24" opacity="0.95"/>
        <path d="M120 10 L135 15 L120 21 Z" fill="#FBBF24" opacity="0.92"/>

        {/* === DETALLES === */}
        {/* Barandillas proa */}
        <line x1="56" y1="73" x2="56" y2="65" stroke="white" strokeWidth="1" opacity="0.22"/>
        <line x1="70" y1="71" x2="70" y2="63" stroke="white" strokeWidth="1" opacity="0.22"/>
        <line x1="56" y1="65" x2="70" y2="63" stroke="white" strokeWidth="0.8" opacity="0.18"/>
        {/* Luz de popa */}
        <circle cx="189" cy="77" r="2.5" fill="#FDE68A" opacity="0.8"/>
        <circle cx="189" cy="77" r="4" fill="#FDE68A" opacity="0.2"/>
        {/* Bita de proa */}
        <ellipse cx="46" cy="76" rx="2.5" ry="1.5" fill="white" opacity="0.28"/>
    </svg>
);

const ShieldSVG = ({ color }) => (
    <svg viewBox="0 0 200 110" className="w-full h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 10 L155 30 L155 65 Q155 90 100 105 Q45 90 45 65 L45 30 Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M100 22 L143 38 L143 65 Q143 84 100 96 Q57 84 57 65 L57 38 Z" fill={color} opacity="0.3"/>
        <path d="M82 58 L95 71 L120 46" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
    </svg>
);

// Modal asignar celular(es) a lancha
function AssignCelularModal({ lancha, onClose, onChanged }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lanchaDevices, setLanchaDevices] = useState(lancha.lancha_devices || []);
    const debounceRef = useRef(null);

    const search = async (q) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/lanchas/available-celulares`, { params: { q, lancha_name: lancha.name } });
            setResults(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { search(''); }, []);

    const handleSearch = (val) => {
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 300);
    };

    const assign = async (device) => {
        setSaving(true);
        try {
            await axios.post(`${API_URL}/lanchas/${encodeURIComponent(lancha.name)}/devices`, null, { params: { device_id: device.id } });
            setLanchaDevices(prev => [...prev, device]);
            setResults(prev => prev.filter(d => d.id !== device.id));
            onChanged();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const unassign = async (deviceId) => {
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/lanchas/${encodeURIComponent(lancha.name)}/devices/${deviceId}`);
            setLanchaDevices(prev => prev.filter(d => d.id !== deviceId));
            search(query);
            onChanged();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const c = LANCHA_COLORS[lancha.name] || DEFAULT_COLOR;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-[440px] shadow-2xl max-h-[82vh] flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            Celulares de {lancha.name}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5">Puedes asignar uno o varios equipos</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {lanchaDevices.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {lanchaDevices.map(dev => (
                            <div key={dev.id} className="bg-bg border border-slate-300 dark:border-slate-600 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.bg + '33' }}>
                                        <Smartphone className="w-4 h-4" style={{ color: c.bg }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{dev.brand} {dev.model}</p>
                                        {dev.phone_number
                                            ? <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{dev.phone_number}</p>
                                            : <p className="text-slate-500 text-xs font-mono">{dev.serial || 'S/N'}</p>
                                        }
                                    </div>
                                </div>
                                <button onClick={() => unassign(dev.id)} disabled={saving}
                                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 flex-shrink-0">
                                    Quitar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={query} onChange={e => handleSearch(e.target.value)}
                        placeholder="Número, marca, serie, IMEI..."
                        className="w-full bg-bg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 placeholder-slate-500" />
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {loading && <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" /></div>}
                    {!loading && results.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Sin celulares disponibles</p>}
                    {!loading && results.map(d => (
                        <div key={d.id} className="flex items-center justify-between bg-bg/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/40 transition-colors">
                            <div className="min-w-0 flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                                    <Smartphone className="w-3.5 h-3.5 text-muted" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{d.brand} {d.model}</p>
                                    {d.phone_number && <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{d.phone_number}</p>}
                                    <p className="text-slate-500 text-xs font-mono">{d.serial || 'S/N'}</p>
                                    {d.assigned_to && <p className="text-amber-600 dark:text-amber-400 text-[10px] mt-0.5">Asignado a: {d.assigned_to}</p>}
                                </div>
                            </div>
                            <button onClick={() => assign(d)} disabled={saving}
                                className="ml-3 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors disabled:opacity-50 flex-shrink-0">
                                Asignar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Card individual por lancha
function LanchaCard({ lancha, idx, onAssignCelular, onAssignEmployee, lanchasList }) {
    const [expanded, setExpanded] = useState(true);
    const c = LANCHA_COLORS[lancha.name] || DEFAULT_COLOR;
    const isGuardia = lancha.name === 'Guardia Yarina';
    const celulares = lancha.members.filter(m => m.celular);
    const sinCelular = lancha.members.filter(m => !m.celular);
    const totalMembers = lancha.members.length;

    return (
        <div className={`bg-surface/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden transition-all hover:shadow-xl ${c.glow} ${c.border} flex flex-col`}>
            {/* Header de la card */}
            <div className="relative px-4 pt-4 pb-3" style={{ background: `linear-gradient(160deg, ${c.bg}18 0%, transparent 60%)` }}>
                {/* Badge tripulantes */}
                <div className={`absolute top-3 right-3 border rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 ${c.badge}`}>
                    <Users className="w-3 h-3" />
                    {totalMembers}
                </div>

                {isGuardia ? <ShieldSVG color={c.bg} /> : <BoatSVG color={c.bg} />}

                <div className="text-center mt-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-widest">{lancha.name.toUpperCase()}</h3>
                </div>
            </div>

            <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1">
                {/* Celular(es) de la lancha */}
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Celulares de la unidad
                    </p>
                    {lancha.lancha_devices && lancha.lancha_devices.length > 0 && (
                        <div className="space-y-1.5 mb-1.5">
                            {lancha.lancha_devices.map(dev => (
                                <button key={dev.id} onClick={() => onAssignCelular(lancha)}
                                    className="w-full text-left rounded-xl p-2.5 transition-colors hover:opacity-80"
                                    style={{ backgroundColor: c.bg + '18', border: `1px solid ${c.bg}44` }}>
                                    {dev.phone_number && (
                                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold leading-tight">{dev.phone_number}</p>
                                    )}
                                    <p className="text-slate-900 dark:text-white text-xs font-medium">{dev.brand} {dev.model}</p>
                                    {!dev.phone_number && (
                                        <p className="text-slate-500 text-xs font-mono">{dev.serial || 'S/N'}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => onAssignCelular(lancha)}
                        className="w-full border border-dashed border-slate-400 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 rounded-xl p-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> {lancha.lancha_devices && lancha.lancha_devices.length > 0 ? 'Agregar / quitar celular' : 'Asignar celular'}
                    </button>
                </div>

                {/* Tripulantes — con toggle */}
                {totalMembers > 0 && (
                    <div>
                        <button onClick={() => setExpanded(v => !v)}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Tripulantes</span>
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {expanded && (
                            <div className="space-y-1.5">
                                {/* Con celular personal */}
                                {celulares.map(m => (
                                    <div key={m.id} className="bg-bg/70 rounded-xl px-2.5 py-2 border border-slate-200 dark:border-slate-700/40">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.bg + '33' }}>
                                                <User className="w-2.5 h-2.5" style={{ color: c.bg }} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate leading-tight" title={m.full_name}>{m.full_name}</p>
                                                <p className="text-[10px] text-slate-500 truncate" title={m.position}>{m.position}</p>
                                            </div>
                                            {m.celular?.phone_number && (
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 flex items-center gap-0.5">
                                                    <Phone className="w-2.5 h-2.5" />{m.celular.phone_number}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Sin celular personal */}
                                {sinCelular.map(m => (
                                    <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-bg/30 border border-slate-200 dark:border-slate-700/20">
                                        <User className="w-3 h-3 text-muted flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-muted truncate leading-tight" title={m.full_name}>{m.full_name}</p>
                                            <p className="text-[10px] text-muted truncate" title={m.position}>{m.position}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {totalMembers === 0 && !lancha.lancha_device && (
                    <p className="text-[11px] text-muted italic text-center py-3">Sin personal asignado</p>
                )}
            </div>
        </div>
    );
}

export default function LanchasPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingEmp, setEditingEmp] = useState(null);
    const [selectedLancha, setSelectedLancha] = useState('');
    const [saving, setSaving] = useState(false);
    const [assigningCelularTo, setAssigningCelularTo] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/lanchas/`);
            setData(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const saveLancha = async () => {
        if (!editingEmp) return;
        setSaving(true);
        try {
            await axios.patch(`${API_URL}/lanchas/employee/${editingEmp.id}/lancha?lancha=${encodeURIComponent(selectedLancha)}`);
            setEditingEmp(null);
            await load();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const lanchas = data?.lanchas?.filter(l => l.name) || [];
    const sinLancha = data?.lanchas?.find(l => !l.name);

    // Stats globales
    const totalPersonal = data?.total_maritime || 0;
    const totalConCelular = lanchas.reduce((s, l) => s + l.members.filter(m => m.celular).length, 0);
    const totalConCelularLancha = lanchas.filter(l => l.lancha_devices && l.lancha_devices.length > 0).length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2.5 rounded-xl">
                        <Anchor className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Flota de Lanchas</h2>
                        <p className="text-muted text-xs">Gestión de embarcaciones y equipos</p>
                    </div>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <RefreshCw className="w-7 h-7 text-blue-500 dark:text-blue-400 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-surface/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3">
                            <p className="text-muted text-xs mb-0.5">Personal marítimo</p>
                            <p className="text-slate-900 dark:text-white text-2xl font-bold">{totalPersonal}</p>
                        </div>
                        <div className="bg-surface/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3">
                            <p className="text-muted text-xs mb-0.5">Con celular personal</p>
                            <p className="text-emerald-600 dark:text-emerald-400 text-2xl font-bold">{totalConCelular}</p>
                        </div>
                        <div className="bg-surface/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3">
                            <p className="text-muted text-xs mb-0.5">Unidades con celular</p>
                            <p className="text-blue-500 dark:text-blue-400 text-2xl font-bold">{totalConCelularLancha} <span className="text-slate-500 text-sm font-normal">/ {lanchas.length}</span></p>
                        </div>
                    </div>

                    {/* Cards — 2 col md, 3 col lg, 5 col 2xl */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {lanchas.map((lancha, idx) => (
                            <LanchaCard
                                key={lancha.name}
                                lancha={lancha}
                                idx={idx}
                                onAssignCelular={setAssigningCelularTo}
                                onAssignEmployee={(m) => { setEditingEmp(m); setSelectedLancha(''); }}
                                lanchasList={data?.lanchas_list || []}
                            />
                        ))}
                    </div>

                    {/* Personal sin lancha */}
                    {sinLancha && sinLancha.members.length > 0 && (
                        <div className="bg-surface/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Settings className="w-3.5 h-3.5" />
                                Sin lancha asignada — {sinLancha.members.length}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {sinLancha.members.map(m => (
                                    <div key={m.id}
                                        className="bg-bg/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/40 cursor-pointer hover:border-amber-500/40 transition-colors"
                                        onClick={() => { setEditingEmp(m); setSelectedLancha(''); }}>
                                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate leading-tight">{m.full_name}</p>
                                        <p className="text-[10px] text-slate-500 truncate mb-1.5">{m.position}</p>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                            <Anchor className="w-2.5 h-2.5" /> Asignar
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal asignar lancha a empleado */}
            {editingEmp && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
                        <h3 className="text-slate-900 dark:text-white font-bold mb-1 flex items-center gap-2">
                            <Anchor className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Asignar a unidad
                        </h3>
                        <p className="text-muted text-sm mb-4 truncate">{editingEmp.full_name}</p>
                        <select value={selectedLancha} onChange={e => setSelectedLancha(e.target.value)}
                            className="w-full bg-bg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue-500 text-sm">
                            <option value="">Sin asignar</option>
                            {(data?.lanchas_list || []).map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingEmp(null)}
                                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-xl text-sm transition-colors">
                                Cancelar
                            </button>
                            <button onClick={saveLancha} disabled={saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal asignar celular a lancha */}
            {assigningCelularTo && (
                <AssignCelularModal
                    lancha={assigningCelularTo}
                    onClose={() => { setAssigningCelularTo(null); load(); }}
                    onChanged={load}
                />
            )}
        </div>
    );
}
