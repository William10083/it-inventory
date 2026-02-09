import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Package, Users, Clock, AlertCircle, MapPin, Laptop, RefreshCw, Smartphone } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AnalyticsDashboard = ({ employees }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [locationFilter, setLocationFilter] = useState('all');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const url = locationFilter && locationFilter !== 'all'
                    ? `${API_URL}/stats?location=${encodeURIComponent(locationFilter)}`
                    : `${API_URL}/stats`;
                const res = await axios.get(url);
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [locationFilter]);

    if (loading) return <div className="text-white">Loading Analytics...</div>;
    if (!stats) return <div className="text-red-400">Failed to load stats.</div>;

    // Transform Data for Charts
    const statusData = Object.keys(stats.status_breakdown).map((key, index) => ({
        name: key.toUpperCase(),
        value: stats.status_breakdown[key]
    }));

    const typeData = Object.keys(stats.type_breakdown).map(key => ({
        name: key,
        count: stats.type_breakdown[key]
    }));

    // Calculate Percentages
    const assignedCount = stats.status_breakdown['assigned'] || 0;
    const assignmentRate = stats.total_devices > 0 ? ((assignedCount / stats.total_devices) * 100).toFixed(1) : 0;

    // Alerts
    const renewalCount = stats.alerts?.renewal_needed || 0;
    const lowStockItems = stats.alerts?.low_stock || [];
    const unassignedEmployees = stats.alerts?.unassigned_employees || [];

    // KPI Values
    const laptopsAvailable = stats.equipment_summary?.laptop?.available || 0;

    return (
        <div className="space-y-8 animate-fade-in pb-16">

            {/* Header / Global Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div>
                    <h2 className="text-2xl font-bold text-white">Analytics General</h2>
                    <p className="text-slate-400 text-sm">Estadísticas clave y estado del inventario</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm font-medium">Filtrar Sede:</span>
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Todas las Sedes</option>
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
                </div>
            </div>

            {/* Alerts Section - Only show if there are alerts */}
            {(renewalCount > 0 || lowStockItems.length > 0 || unassignedEmployees.length > 0) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5" /> Action Required
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Only show subsections if they are strictly relevant or critical, customized for dashboard cleanilness */}
                        {lowStockItems.length > 0 && (
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-slate-400 text-sm">Low Stock Alerts</p>
                                        <p className="text-2xl font-bold text-white">{lowStockItems.length} Types</p>
                                    </div>
                                    <Package className="w-8 h-8 text-red-400 opacity-50" />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {lowStockItems.map((item, idx) => (
                                        <span key={idx} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                                            {item.type}: {item.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {unassignedEmployees.length > 0 && (
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-slate-400 text-sm">Unassigned Employees</p>
                                        <p className="text-2xl font-bold text-white">{stats.employee_stats.without_devices}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-400 opacity-50" />
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                    {unassignedEmployees.slice(0, 3).join(", ")} {unassignedEmployees.length > 3 && "..."}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm">Laptops Disponibles</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{laptopsAvailable}</h3>
                            <p className="text-xs text-blue-400 mt-1">Listas para entregar</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Laptop className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </div>



                <div className="glass-card p-6 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm">Por Renovar</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{renewalCount}</h3>
                            <p className="text-xs text-yellow-400 mt-1">Antigüedad &gt; 3 años</p>
                        </div>
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                            <RefreshCw className="w-6 h-6 text-yellow-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm">Employees Covered</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{stats.employee_stats.with_devices} / {stats.employee_stats.total}</h3>
                            <p className="text-xs text-slate-500 mt-1">{stats.employee_stats.without_devices} pending</p>
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-orange-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm">Maintenance</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{stats.status_breakdown['maintenance'] || 0}</h3>
                            <p className="text-xs text-orange-400 mt-1">Requires Attention</p>
                        </div>
                        <div className="p-3 bg-orange-500/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>



            {/* Comprehensive Equipment Summary */}
            {stats.equipment_summary && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">Resumen de Equipos por Tipo</h3>
                            <p className="text-slate-400 text-sm">Estado completo: asignados, pendientes, disponibles y cobertura de stock</p>
                        </div>
                    </div>

                    {/* Stacked Bar Chart showing Assigned vs Available vs Pending */}
                    <div className="h-80 w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    {
                                        name: 'Laptops',
                                        Asignados: stats.equipment_summary.laptop?.assigned || 0,
                                        Disponibles: stats.equipment_summary.laptop?.available || 0,
                                        Pendientes: stats.equipment_summary.laptop?.pending || 0,
                                    },
                                    {
                                        name: 'Monitores',
                                        Asignados: stats.equipment_summary.monitor?.assigned || 0,
                                        Disponibles: stats.equipment_summary.monitor?.available || 0,
                                        Pendientes: stats.equipment_summary.monitor?.pending || 0,
                                    },
                                    {
                                        name: 'Kit T/M',
                                        Asignados: stats.equipment_summary['kit teclado/mouse']?.assigned || 0,
                                        Disponibles: stats.equipment_summary['kit teclado/mouse']?.available || 0,
                                        Pendientes: stats.equipment_summary['kit teclado/mouse']?.pending || 0,
                                    },
                                    {
                                        name: 'Mochilas',
                                        Asignados: stats.equipment_summary['mochila']?.assigned || 0,
                                        Disponibles: stats.equipment_summary['mochila']?.available || 0,
                                        Pendientes: stats.equipment_summary['mochila']?.pending || 0,
                                    },
                                    {
                                        name: 'Auriculares',
                                        Asignados: stats.equipment_summary['auriculares']?.assigned || 0,
                                        Disponibles: stats.equipment_summary['auriculares']?.available || 0,
                                        Pendientes: stats.equipment_summary['auriculares']?.pending || 0,
                                    },
                                    {
                                        name: 'Celulares',
                                        Asignados: stats.equipment_summary['celular']?.assigned || 0,
                                        Disponibles: stats.equipment_summary['celular']?.available || 0,
                                        Pendientes: stats.equipment_summary['celular']?.pending || 0,
                                    },
                                ]}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="Asignados" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Disponibles" stackId="b" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Pendientes" fill="#F97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detailed Summary Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Equipo</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Total</th>
                                    <th className="text-center py-3 px-4 text-green-400 font-medium">Asignados</th>
                                    <th className="text-center py-3 px-4 text-blue-400 font-medium">Disponibles</th>
                                    <th className="text-center py-3 px-4 text-orange-400 font-medium">Pendientes</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'laptop', name: 'Laptops', color: 'blue' },
                                    { key: 'monitor', name: 'Monitores', color: 'cyan' },
                                    { key: 'kit teclado/mouse', name: 'Kit Teclado/Mouse', color: 'purple' },
                                    { key: 'mochila', name: 'Mochilas', color: 'yellow' },
                                    { key: 'auriculares', name: 'Auriculares', color: 'pink' },
                                    { key: 'celular', name: 'Celulares', color: 'green' },
                                ].map((item) => {
                                    const data = stats.equipment_summary[item.key] || {};
                                    const covered = data.covered;
                                    const deficit = data.deficit || 0;
                                    return (
                                        <tr key={item.key} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                                            <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                                            <td className="py-3 px-4 text-center text-white font-bold">{data.total || 0}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">{data.assigned || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{data.available || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded">{data.pending || 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {covered ? (
                                                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> {data.surplus > 0 ? `+${data.surplus} sobrantes` : 'Cubierto'}
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Faltan {deficit}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Asignados: equipos ya entregados</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Disponibles: stock actual</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span>Pendientes: empleados que les falta</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Pending Deliveries Table */}
            {employees && (
                <div className="glass-card p-6 mt-8">
                    <h3 className="text-xl font-bold text-white mb-2">Detalle de Entregas Pendientes</h3>
                    <p className="text-slate-400 text-sm mb-6">Listado de empleados activos que tienen equipos pendientes de entrega.</p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-3">Empleado</th>
                                    <th className="px-6 py-3">Cargo / Sede</th>
                                    <th className="px-6 py-3">Falta por Entregar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {(() => {
                                    // Calculate pending per employee
                                    const pendingList = employees
                                        .filter(e => e.is_active) // Only active employees
                                        .filter(e => locationFilter === 'all' || e.location === locationFilter)
                                        .map(e => {
                                            const activeAssets = e.assignments?.filter(a => !a.returned_date).map(a => a.device) || [];
                                            const types = activeAssets.map(d => d.device_type);

                                            const missing = [];

                                            // Laptop count check
                                            const laptopCount = activeAssets.filter(d => d.device_type === 'laptop').length;
                                            const expectedLaptops = e.expected_laptop_count || 1;
                                            if (laptopCount < expectedLaptops) {
                                                const diff = expectedLaptops - laptopCount;
                                                const label = diff > 1 ? `${diff} Laptops` : 'Laptop';
                                                missing.push({ label: label, color: 'bg-red-500/20 text-red-400 border-red-500/30' });
                                            }

                                            // Check position to determine equipment needs
                                            const position = (e.position || '').toLowerCase();
                                            const isPracticante = position.includes('practicante');
                                            const isChofer = position.includes('chofer') || position.includes('conductor');

                                            // 1. MONITOR & ACCESSORIES CHECK
                                            // Choferes DO NOT need monitor or accessories (only laptop + mobile)
                                            if (!isChofer) {
                                                if (!types.includes('monitor')) missing.push({ label: 'Monitor', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' });

                                                // Kit check (kit OR separate keyboard+mouse)
                                                const hasKit = types.includes('kit teclado/mouse');
                                                const hasKeyAndMouse = types.includes('keyboard') && types.includes('mouse');
                                                if (!hasKit && !hasKeyAndMouse) missing.push({ label: 'Kit T/M', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });

                                                if (!types.includes('mochila')) missing.push({ label: 'Mochila', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' });
                                                if (!types.includes('auriculares')) missing.push({ label: 'Auriculares', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' });
                                            }

                                            // 2. MOBILE CHECK
                                            // Practicantes DO NOT need mobile
                                            // Everyone else (including Choferes) needs mobile if not assigned
                                            if (!types.includes('celular') && !isPracticante) {
                                                missing.push({ label: 'Celular', color: 'bg-green-500/20 text-green-400 border-green-500/30' });
                                            }

                                            return { ...e, missing };
                                        })
                                        .filter(e => e.missing.length > 0)
                                        .sort((a, b) => a.full_name.localeCompare(b.full_name));

                                    if (pendingList.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                                                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    Todo el personal tiene sus equipos completos.
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return pendingList.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {emp.full_name}
                                                <div className="text-xs text-slate-500 font-normal">{emp.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
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
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
