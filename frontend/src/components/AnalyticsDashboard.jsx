import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Package, Users, Clock, AlertCircle, MapPin, Laptop, RefreshCw, Smartphone, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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


// Fix 1 & 2: recibe locationFilter como prop, elimina estado interno propio
const AnalyticsDashboard = ({ employees, locationFilter = 'all' }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filtro base compartido entre pendingDeliveriesRows y coverageStats
    const employeesFiltered = useMemo(() =>
        (employees || []).filter(e => e.is_active && (locationFilter === 'all' || e.location === locationFilter)),
        [employees, locationFilter]
    );

    // Cobertura completa — calculado una sola vez
    const { employeesComplete, coverageRate } = useMemo(() => {
        const complete = employeesFiltered.filter(e => {
            const activeAssets = e.assignments?.filter(a => !a.returned_date).map(a => a.device) || [];
            const types = activeAssets.map(d => d.device_type);
            const position = (e.position || '').toLowerCase();
            const department = (e.department || '').toLowerCase();
            const isChofer = position.includes('chofer') || position.includes('conductor');
            const isLanchas = department.includes('lancha');
            const isPatronLancha = isLanchas && (position.includes('patron') || position.includes('patrón'));
            const noEquipment = isLanchas && !isPatronLancha;
            const needsOnlyCelular = isChofer || isPatronLancha;
            if (noEquipment) return true;
            const laptopExplicit = e.expected_laptop_count !== null && e.expected_laptop_count !== undefined;
            const needsLaptopC = laptopExplicit ? e.expected_laptop_count > 0 : (!noEquipment && !needsOnlyCelular);
            const needsCelularC = (e.expected_celular_count ?? 0) > 0;
            if (needsLaptopC) {
                const laptopOk = activeAssets.filter(d => d.device_type === 'laptop').length >= (e.expected_laptop_count || 1);
                const kitOk = types.includes('kit teclado/mouse') || (types.includes('keyboard') && types.includes('mouse'));
                if (!laptopOk) return false;
                if (!types.includes('monitor') || !kitOk || !types.includes('mochila') || !types.includes('auriculares')) return false;
            }
            if (needsCelularC && !types.includes('celular')) return false;
            return true;
        }).length;
        return {
            employeesComplete: complete,
            coverageRate: employeesFiltered.length > 0 ? ((complete / employeesFiltered.length) * 100).toFixed(1) : 0,
        };
    }, [employeesFiltered]);

    const pendingDeliveriesRows = useMemo(() => {
        if (!employees) return null;

        const filtered = employeesFiltered
            .map(e => {
                const activeAssets = e.assignments?.filter(a => !a.returned_date).map(a => a.device) || [];
                const types = activeAssets.map(d => d.device_type);
                const position = (e.position || '').toLowerCase();
                const isChofer = position.includes('chofer') || position.includes('conductor');

                const department = (e.department || '').toLowerCase();
                const isLanchas = department.includes('lancha');
                const isPatronLancha = isLanchas && (position.includes('patron') || position.includes('patrón'));
                const needsOnlyCelular = isChofer || isPatronLancha;
                const noEquipment = isLanchas && !isPatronLancha; // marineros y otros de lanchas: sin requisito de equipo
                const missing = [];

                // Determinar si necesita laptop usando expected_laptop_count explícito o fallback por rol
                const laptopExplicit = e.expected_laptop_count !== null && e.expected_laptop_count !== undefined;
                const needsLaptop = laptopExplicit ? e.expected_laptop_count > 0 : (!noEquipment && !needsOnlyCelular);
                const needsCelular = (e.expected_celular_count ?? 0) > 0;

                if (needsLaptop) {
                    const laptopCount = activeAssets.filter(d => d.device_type === 'laptop').length;
                    const expectedLaptops = e.expected_laptop_count || 1;
                    if (laptopCount < expectedLaptops) {
                        const diff = expectedLaptops - laptopCount;
                        missing.push({ label: diff > 1 ? `${diff} Laptops` : 'Laptop', color: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30' });
                    }
                    if (!types.includes('monitor')) missing.push({ label: 'Monitor', color: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' });
                    const hasKit = types.includes('kit teclado/mouse') || (types.includes('keyboard') && types.includes('mouse'));
                    if (!hasKit) missing.push({ label: 'Kit T/M', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30' });
                    if (!types.includes('mochila')) missing.push({ label: 'Mochila', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' });
                    if (!types.includes('auriculares')) missing.push({ label: 'Auriculares', color: 'bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30' });
                }

                if (needsCelular && !types.includes('celular')) {
                    missing.push({ label: 'Celular', color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' });
                }

                return { ...e, missing };
            })
            .filter(e => e.missing.length > 0)
            .sort((a, b) => b.missing.length - a.missing.length); // más incompletos primero

        if (filtered.length === 0) {
            return (
                <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Todo el personal tiene sus equipos completos.
                    </td>
                </tr>
            );
        }

        return filtered.map((emp) => (
            <tr key={emp.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {emp.full_name}
                    <div className="text-xs text-slate-500 font-normal">{emp.email}</div>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <div>{emp.position || 'Sin Cargo'}</div>
                    <div className="text-xs text-slate-500">{emp.location}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        {emp.missing.map((item, idx) => (
                            <span key={idx} className={`text-xs px-2.5 py-1 rounded-md border font-medium ${item.color}`}>
                                {item.label}
                            </span>
                        ))}
                    </div>
                </td>
            </tr>
        ));
    }, [employeesFiltered, employees]);

    // Fix 1: usa locationFilter de props, no estado interno
    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const params = locationFilter && locationFilter !== 'all' ? `?location=${encodeURIComponent(locationFilter)}` : '';
                const res = await axios.get(`${API_URL}/stats${params}`);
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [locationFilter]); // se re-ejecuta cuando cambia el filtro global

    if (loading) return <div className="text-slate-900 dark:text-white p-8">Cargando Analytics...</div>;
    if (!stats) return <div className="text-red-600 dark:text-red-400 p-8">Error al cargar estadísticas.</div>;

    // Fix 5: assignmentRate ahora se usa en la UI
    const assignedCount = stats.status_breakdown['assigned'] || 0;
    const assignmentRate = stats.total_devices > 0
        ? ((assignedCount / stats.total_devices) * 100).toFixed(1)
        : 0;

    const renewalCount = stats.alerts?.renewal_needed || 0;
    const lowStockItems = stats.alerts?.low_stock || [];
    const unassignedEmployees = stats.alerts?.unassigned_employees || [];
    const laptopsAvailable = stats.equipment_summary?.laptop?.available || 0;

    // Fix 6: charger incluido en el resumen de equipos
    const equipmentTypes = [
        { key: 'laptop', name: 'Laptops', color: 'blue' },
        { key: 'monitor', name: 'Monitores', color: 'cyan' },
        { key: 'kit teclado/mouse', name: 'Kit Teclado/Mouse', color: 'purple' },
        { key: 'mochila', name: 'Mochilas', color: 'yellow' },
        { key: 'auriculares', name: 'Auriculares', color: 'pink' },
        { key: 'celular', name: 'Celulares', color: 'green' },
    ];

    const chartData = equipmentTypes.map(item => ({
        name: item.name,
        Asignados: stats.equipment_summary?.[item.key]?.assigned || 0,
        Disponibles: stats.equipment_summary?.[item.key]?.available || 0,
        Pendientes: stats.equipment_summary?.[item.key]?.pending || 0,
    }));

    return (
        <div className="space-y-8 animate-fade-in pb-16">

            {/* Alerts */}
            {(renewalCount > 0 || lowStockItems.length > 0 || unassignedEmployees.length > 0) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5" /> Requiere Atención
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {lowStockItems.length > 0 && (
                            <div className="bg-bg p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Stock Bajo</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{lowStockItems.length} tipos</p>
                                    </div>
                                    <Package className="w-8 h-8 text-red-600 dark:text-red-400 opacity-50" />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {lowStockItems.map((item, idx) => (
                                        <span key={idx} className="text-xs bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                            {item.type}: {item.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {unassignedEmployees.length > 0 && (
                            <div className="bg-bg p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Empleados Sin Equipos</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.employee_stats.without_devices}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-50" />
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {unassignedEmployees.slice(0, 3).join(", ")}{unassignedEmployees.length > 3 && "..."}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* KPI Cards - Fix 4 & 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface rounded-md shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Laptops Disponibles</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1"><CountUpNumber value={laptopsAvailable} /></h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Listas para entregar</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Laptop className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* Fix 5: assignmentRate ahora visible */}
                <div className="bg-surface rounded-md shadow-sm p-6 border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Tasa de Asignación</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{assignmentRate}%</h3>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{assignedCount} de {stats.total_devices} equipos</p>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-surface rounded-md shadow-sm p-6 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Por Renovar</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1"><CountUpNumber value={renewalCount} /></h3>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Antigüedad &gt; 3 años</p>
                        </div>
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                            <RefreshCw className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </div>

                {/* Fix 4: KPI corregido — solo empleados con kit COMPLETO */}
                <div className="bg-surface rounded-md shadow-sm p-6 border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Cobertura Completa</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{coverageRate}%</h3>
                            <p className="text-xs text-slate-500 mt-1">{employeesComplete} / {employeesFiltered.length} empleados con todo</p>
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico + tabla de equipos */}
            {stats.equipment_summary && (
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Resumen de Equipos por Tipo</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Estado completo: asignados, pendientes y disponibles</p>
                    </div>

                    <div className="h-80 w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                                <XAxis dataKey="name" stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                                <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: 'inherit' }} />
                                <Legend />
                                <Bar dataKey="Asignados" stackId="a" fill="#22C55E" />
                                <Bar dataKey="Disponibles" stackId="b" fill="#3B82F6" />
                                <Bar dataKey="Pendientes" fill="#F97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Equipo</th>
                                    <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Total</th>
                                    <th className="text-center py-3 px-4 text-green-600 dark:text-green-400 font-medium">Asignados</th>
                                    <th className="text-center py-3 px-4 text-blue-600 dark:text-blue-400 font-medium">Disponibles</th>
                                    <th className="text-center py-3 px-4 text-orange-600 dark:text-orange-400 font-medium">Pendientes</th>
                                    <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipmentTypes.map((item) => {
                                    const data = stats.equipment_summary[item.key] || {};
                                    return (
                                        <tr key={item.key} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{item.name}</td>
                                            <td className="py-3 px-4 text-center text-slate-900 dark:text-white font-bold">{data.total || 0}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">{data.assigned || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">{data.available || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-orange-500/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">{data.pending || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {data.covered ? (
                                                    <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> {data.surplus > 0 ? `+${data.surplus} sobrantes` : 'Cubierto'}
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Faltan {data.deficit || 0}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded"></div><span>Asignados: equipos ya entregados</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div><span>Disponibles: stock actual</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded"></div><span>Pendientes: empleados que les falta</span></div>
                    </div>
                </div>
            )}

            {/* Tabla de entregas pendientes */}
            {employees && (
                <div className="bg-surface rounded-md shadow-sm p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Detalle de Entregas Pendientes</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        Empleados activos con equipos pendientes — ordenados por mayor faltante primero.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3">Empleado</th>
                                    <th className="px-6 py-3">Cargo / Sede</th>
                                    <th className="px-6 py-3">Falta por Entregar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {pendingDeliveriesRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
