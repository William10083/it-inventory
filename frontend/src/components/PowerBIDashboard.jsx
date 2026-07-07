import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Monitor, Users, TrendingUp, Package, CheckCircle,
    AlertTriangle, MapPin, Cpu, BarChart2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DONUT_COLORS = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];

const EQUIPMENT_KEYS = ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'celular'];
const EQUIPMENT_LABELS = {
    'laptop': 'Laptops',
    'monitor': 'Monitores',
    'kit teclado/mouse': 'Kits',
    'mochila': 'Mochilas',
    'auriculares': 'Auriculares',
    'celular': 'Celulares',
};

// Animates a numeric value counting up from 0 to `value` using GSAP.
// Respects prefers-reduced-motion (renders the final value immediately when set).
// Mirrors the pattern established in Dashboard.jsx.
const CountUpNumber = ({ value }) => {
    const [display, setDisplay] = useState(0);
    const tweenRef = useRef(null);

    useEffect(() => {
        const targetValue = Number(value) || 0;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (tweenRef.current) {
            tweenRef.current.kill();
            tweenRef.current = null;
        }

        if (prefersReducedMotion) {
            setDisplay(targetValue);
            return;
        }

        const proxy = { val: 0 };
        tweenRef.current = gsap.to(proxy, {
            val: targetValue,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => setDisplay(Math.round(proxy.val)),
        });

        return () => {
            if (tweenRef.current) {
                tweenRef.current.kill();
                tweenRef.current = null;
            }
        };
    }, [value]);

    return <span className="tabular-nums">{display}</span>;
};

// Color based on coverage percentage
const coverageColor = (pct) => {
    if (pct === null) return 'bg-slate-200 dark:bg-slate-800 text-slate-500';
    if (pct >= 90) return 'bg-green-500/20 text-green-700 dark:text-green-300';
    if (pct >= 70) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
    if (pct >= 50) return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
    return 'bg-red-500/20 text-red-700 dark:text-red-300';
};

// Maps the KPICard `color` prop (a border utility class) to its matching
// background tint and light/dark-paired icon text color.
const KPI_COLOR_MAP = {
    'border-blue-500': { bg: 'bg-blue-500/20', icon: 'text-accent' },
    'border-green-500': { bg: 'bg-green-500/20', icon: 'text-green-600 dark:text-green-400' },
    'border-purple-500': { bg: 'bg-purple-500/20', icon: 'text-purple-600 dark:text-purple-400' },
    'border-yellow-500': { bg: 'bg-yellow-500/20', icon: 'text-yellow-600 dark:text-yellow-400' },
};

const KPICard = ({ title, value, subtitle, icon: Icon, color }) => {
    const { bg, icon: iconColor } = KPI_COLOR_MAP[color] || KPI_COLOR_MAP['border-blue-500'];
    return (
        <div className={`bg-surface rounded-md shadow-sm p-6 border-l-4 ${color}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-muted text-sm">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {typeof value === 'number' ? <CountUpNumber value={value} /> : value}
                    </h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${bg}`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
            </div>
        </div>
    );
};

const PowerBIDashboard = ({ locationFilter = 'all' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = locationFilter && locationFilter !== 'all'
                    ? { location: locationFilter }
                    : {};
                const res = await axios.get(`${API_URL}/analytics/powerbi`, { params });
                setData(res.data);
            } catch (e) {
                setError('Error al cargar datos Power BI');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [locationFilter]);

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-muted">
            <BarChart2 className="w-6 h-6 animate-pulse mr-2" /> Cargando Power BI...
        </div>
    );
    if (error) return <div className="text-red-600 dark:text-red-400 p-8">{error}</div>;
    if (!data) return null;

    const { kpis, assignments_by_month, type_distribution, coverage_by_location, top_equipped_employees, status_breakdown } = data;

    // Month labels in Spanish
    const monthlyData = assignments_by_month.map(d => ({
        ...d,
        month: d.month ? new Date(d.month + '-01').toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }) : d.month
    }));

    return (
        <div className="space-y-8 pb-16 animate-fade-in">

            {/* Header */}
            <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BarChart2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Power BI — Vista Ejecutiva</h2>
                    <p className="text-muted text-sm">Métricas clave, tendencias y cobertura por sede</p>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Equipos Activos"
                    value={kpis.total_active_devices}
                    subtitle="No vendidos ni eliminados"
                    icon={Package}
                    color="border-blue-500"
                />
                <KPICard
                    title="Tasa de Asignación"
                    value={`${kpis.assignment_rate}%`}
                    subtitle={`${kpis.total_employees} empleados activos`}
                    icon={TrendingUp}
                    color="border-green-500"
                />
                <KPICard
                    title="Cobertura Completa"
                    value={`${kpis.coverage_pct}%`}
                    subtitle={`${kpis.complete_employees} / ${kpis.total_employees} con todo el kit`}
                    icon={CheckCircle}
                    color="border-purple-500"
                />
                <KPICard
                    title="Total Empleados"
                    value={kpis.total_employees}
                    subtitle={`${kpis.total_employees - kpis.complete_employees} incompletos`}
                    icon={Users}
                    color="border-yellow-500"
                />
            </div>

            {/* Charts Row 1: Asignaciones por mes + Donut tipo dispositivo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Timeline asignaciones */}
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Asignaciones por Mes</h3>
                    <p className="text-muted text-xs mb-4">Actividad histórica de entregas de equipo</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorAsig" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                                <XAxis dataKey="month" stroke="currentColor" className="text-muted" tick={{ fontSize: 11 }} />
                                <YAxis stroke="currentColor" className="text-muted" tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: 'inherit' }} />
                                <Area type="monotone" dataKey="asignaciones" stroke="#3B82F6" fill="url(#colorAsig)" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut distribución por tipo */}
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Distribución por Tipo</h3>
                    <p className="text-muted text-xs mb-4">Composición del inventario activo</p>
                    <div className="h-64 flex items-center">
                        <ResponsiveContainer width="60%" height="100%">
                            <PieChart>
                                <Pie
                                    data={type_distribution}
                                    cx="50%" cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    dataKey="value"
                                    paddingAngle={2}
                                >
                                    {type_distribution.map((_, i) => (
                                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: 'inherit' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Leyenda lateral */}
                        <div className="flex-1 space-y-2 pl-2">
                            {type_distribution.map((item, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                        <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                                    </div>
                                    <span className="text-slate-900 dark:text-white font-bold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap Cobertura por Sede */}
            <div className="bg-surface rounded-md shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Heatmap de Cobertura por Sede</h3>
                <p className="text-muted text-xs mb-4">
                    % de empleados con cada tipo de equipo asignado por sede — verde ≥90%, amarillo ≥70%, naranja ≥50%, rojo &lt;50%
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-muted font-medium min-w-[120px]">Sede</th>
                                <th className="text-center py-3 px-3 text-muted font-medium text-xs">Empleados</th>
                                {EQUIPMENT_KEYS.map(k => (
                                    <th key={k} className="text-center py-3 px-3 text-muted font-medium text-xs">{EQUIPMENT_LABELS[k]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {coverage_by_location.map((row) => (
                                <tr key={row.location} className="border-b border-slate-200 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/30">
                                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-slate-500" />{row.location}
                                    </td>
                                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 text-sm">{row.total_employees}</td>
                                    {EQUIPMENT_KEYS.map(k => (
                                        <td key={k} className="py-3 px-3 text-center">
                                            {row[k] === null ? (
                                                <span className="text-xs text-muted">N/A</span>
                                            ) : (
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${coverageColor(row[k])}`}>
                                                    {row[k]}%
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Row 2: Status breakdown + Top employees */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Estado global de dispositivos */}
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Estado Global de Dispositivos</h3>
                    <p className="text-muted text-xs mb-4">Conteo de equipos por estado (incluyendo vendidos y dados de baja)</p>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={status_breakdown} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" horizontal={false} />
                                <XAxis type="number" stroke="currentColor" className="text-muted" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="status" stroke="currentColor" className="text-muted" tick={{ fontSize: 11 }} width={80} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: 'inherit' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {status_breakdown.map((entry, i) => {
                                        const colors = { assigned: '#22C55E', available: '#3B82F6', maintenance: '#F97316', retired: '#6B7280', sold: '#8B5CF6' };
                                        return <Cell key={i} fill={colors[entry.status] || '#64748B'} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top empleados con más equipos */}
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Top Empleados por Equipos</h3>
                    <p className="text-muted text-xs mb-4">Los 10 empleados con más dispositivos asignados actualmente</p>
                    <div className="space-y-2 overflow-y-auto max-h-56">
                        {top_equipped_employees.map((emp, i) => (
                            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-200 dark:border-slate-700/40 last:border-0">
                                <span className="text-slate-500 text-xs w-5 text-right font-mono">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{emp.name}</p>
                                    <p className="text-slate-500 text-xs truncate">{emp.position} · {emp.location}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-900 dark:text-white font-bold text-sm">{emp.device_count}</span>
                                    <Cpu className="w-3 h-3 text-slate-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PowerBIDashboard;
