import React, { useState, useEffect } from 'react';
import { FileText, Download, AlertTriangle, CheckCircle, Search, Filter, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelFilter from '../components/ExcelFilter';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const LOCATIONS = [
    'Callao', 'San Isidro', 'Mollendo', 'Ilo', 'Pucallpa', 'Chimbote', 'Supe', 'Tacna'
];

const ActasStatusPage = () => {
    const navigate = useNavigate();
    // Default empty state
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'signed', 'pending'
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');

    // Excel-like filters state
    const [excelFilters, setExcelFilters] = useState({
        employee_name: [],
        typeLabel: [],
        statusLabel: [],
        days_pending: []
    });

    // Sort state
    const [sortConfig, setSortConfig] = useState({ key: 'days_pending', direction: 'desc' });

    const INITIAL_DATA = {
        assignment_computer: [],
        assignment_mobile: [],
        sales: [],
        terminations: [],
        summary: {
            assignment_computer_signed: 0, assignment_computer_total: 0,
            assignment_mobile_signed: 0, assignment_mobile_total: 0,
            sales_signed: 0, sales_total: 0,
            terminations_signed: 0, terminations_total: 0,
            total_signed: 0, total_pending: 0, total: 0
        }
    };

    const [data, setData] = useState(INITIAL_DATA);

    useEffect(() => {
        const delay = searchTerm ? 500 : 0;
        const handler = setTimeout(() => {
            fetchData();
        }, delay);

        return () => clearTimeout(handler);
    }, [statusFilter, searchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') params.status_filter = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const response = await axios.get(`${API_URL}/actas-status/`, { params });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching actas status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type, id) => {
        try {
            let url = '';
            if (type === 'assignment_computer' || type === 'assignment_mobile') {
                url = `${API_URL}/assignments/${id}/download-acta`;
            } else if (type === 'sale') {
                url = `${API_URL}/sales/${id}/download-acta`;
            } else if (type === 'termination_computer') {
                url = `${API_URL}/terminations/${id}/download-computer-acta`;
            } else if (type === 'termination_mobile') {
                url = `${API_URL}/terminations/${id}/download-mobile-acta`;
            }

            const response = await axios.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `acta_${type}_${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading acta:', error);
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'assignment_computer': return 'Asignación - Cómputo';
            case 'assignment_mobile': return 'Asignación - Celular';
            case 'sale': return 'Venta';
            case 'termination_computer': return 'Cese - Cómputo';
            case 'termination_mobile': return 'Cese - Celular';
            default: return type;
        }
    };

    const getDaysBadge = (days) => {
        if (days === null) return null;

        let colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (days > 30) colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
        else if (days > 15) colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';

        return (
            <span className={`px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}>
                {days}d pendiente
            </span>
        );
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // REMOVED: if (loading) return ... (to prevent full page flicker)
    // if (loading) { return ... }  <-- Removed

    if (!data) return null; // Safe guard

    // Pre-process data with labels for filtering
    const processedActas = [
        ...(data.assignment_computer || []),
        ...(data.assignment_mobile || []),
        ...(data.sales || []),
        ...(data.terminations || [])
    ].map(acta => ({
        ...acta,
        typeLabel: getTypeLabel(acta.type),
        statusLabel: acta.has_acta ? 'Firmada' : 'Pendiente'
    }));

    // Filter Logic
    const filteredActas = processedActas.filter(acta => {
        // Location Filter (Global)
        if (locationFilter !== 'all') {
            const loc = (acta.employee_location || '').toLowerCase();
            if (!loc.includes(locationFilter.toLowerCase())) return false;
        }

        // Excel Filters
        if (excelFilters.employee_name.length > 0 && !excelFilters.employee_name.includes(acta.employee_name)) return false;
        if (excelFilters.typeLabel.length > 0 && !excelFilters.typeLabel.includes(acta.typeLabel)) return false;
        if (excelFilters.statusLabel.length > 0 && !excelFilters.statusLabel.includes(acta.statusLabel)) return false;
        if (excelFilters.days_pending.length > 0 && !excelFilters.days_pending.includes(acta.days_pending)) return false;

        return true;
    }).sort((a, b) => {
        const { key, direction } = sortConfig;

        let aVal = a[key] || '';
        let bVal = b[key] || '';

        // Handle string comparison manually if needed, otherwise generic
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Helper to update specific filter
    const updateExcelFilter = (key, values) => {
        setExcelFilters(prev => ({ ...prev, [key]: values }));
    };

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">Estado de Actas Firmadas</h2>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Seguimiento de actas firmadas y pendientes de asignaciones y ceses
                    </p>
                </div>
                <button
                    onClick={() => navigate('/templates')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-600 shadow-sm"
                    title="Gestionar templates de actas"
                >
                    <FileText className="w-4 h-4" />
                    Templates
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Assignment Computer Summary */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Asignación Cómputo</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {data.summary.assignment_computer_signed}
                        </span>
                        <span className="text-slate-400">/ {data.summary.assignment_computer_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                            {data.summary.assignment_computer_total > 0
                                ? Math.round((data.summary.assignment_computer_signed / data.summary.assignment_computer_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Assignment Mobile Summary */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Asignación Celular</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {data.summary.assignment_mobile_signed}
                        </span>
                        <span className="text-slate-400">/ {data.summary.assignment_mobile_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                            {data.summary.assignment_mobile_total > 0
                                ? Math.round((data.summary.assignment_mobile_signed / data.summary.assignment_mobile_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Sales Summary */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Ventas</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {data.summary.sales_signed}
                        </span>
                        <span className="text-slate-400">/ {data.summary.sales_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                            {data.summary.sales_total > 0
                                ? Math.round((data.summary.sales_signed / data.summary.sales_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Terminations Summary */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Ceses</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {data.summary.terminations_signed}
                        </span>
                        <span className="text-slate-400">/ {data.summary.terminations_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                            {data.summary.terminations_total > 0
                                ? Math.round((data.summary.terminations_signed / data.summary.terminations_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Total Summary */}
                <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                    <div className="text-sm text-blue-300 mb-1">Total</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {data.summary.total_signed}
                        </span>
                        <span className="text-blue-300">/ {data.summary.total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-orange-400">
                            {data.summary.total_pending} pendientes
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setStatusFilter('signed')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'signed'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    Firmadas
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'pending'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    Pendientes
                                </button>
                            </div>
                        </div>

                        {/* Sede Filter */}
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="all">Todas las Sedes</option>
                                {LOCATIONS.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-visible">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full">
                            <thead className="bg-slate-900/50 border-b border-slate-700">
                                <tr>
                                    {/* HEADER: EMPLEADO */}
                                    <th className="px-4 py-3 align-top">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                onClick={() => handleSort('employee_name')}
                                            >
                                                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Empleado</span>
                                                {sortConfig.key === 'employee_name' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                ) : <div className="w-3 h-3" />}
                                            </div>
                                            <ExcelFilter
                                                column="employee_name"
                                                data={processedActas}
                                                selectedValues={excelFilters.employee_name}
                                                onFilterChange={(val) => updateExcelFilter('employee_name', val)}
                                                placeholder="Buscar..."
                                            />
                                        </div>
                                    </th>

                                    {/* HEADER: TIPO */}
                                    <th className="px-4 py-3 align-top">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                onClick={() => handleSort('typeLabel')}
                                            >
                                                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Tipo</span>
                                                {sortConfig.key === 'typeLabel' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                ) : <div className="w-3 h-3" />}
                                            </div>
                                            <ExcelFilter
                                                column="typeLabel"
                                                data={processedActas}
                                                selectedValues={excelFilters.typeLabel}
                                                onFilterChange={(val) => updateExcelFilter('typeLabel', val)}
                                                placeholder="Tipo..."
                                            />
                                        </div>
                                    </th>

                                    {/* HEADER: ESTADO */}
                                    <th className="px-4 py-3 align-top text-center w-32">
                                        <div className="flex items-center justify-center gap-2">
                                            <div
                                                className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                onClick={() => handleSort('statusLabel')}
                                            >
                                                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Estado</span>
                                                {sortConfig.key === 'statusLabel' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                ) : <div className="w-3 h-3" />}
                                            </div>
                                            <ExcelFilter
                                                column="statusLabel"
                                                data={processedActas}
                                                selectedValues={excelFilters.statusLabel}
                                                onFilterChange={(val) => updateExcelFilter('statusLabel', val)}
                                                placeholder="Estado..."
                                            />
                                        </div>
                                    </th>

                                    {/* HEADER: DIAS PENDIENTES */}
                                    <th className="px-4 py-3 align-top text-center w-36">
                                        <div className="flex items-center justify-center gap-2">
                                            <div
                                                className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                onClick={() => handleSort('days_pending')}
                                            >
                                                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Días Pend.</span>
                                                {sortConfig.key === 'days_pending' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                ) : <div className="w-3 h-3" />}
                                            </div>
                                            <ExcelFilter
                                                column="days_pending"
                                                data={processedActas}
                                                selectedValues={excelFilters.days_pending}
                                                onFilterChange={(val) => updateExcelFilter('days_pending', val)}
                                                placeholder="Días..."
                                            />
                                        </div>
                                    </th>

                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase w-28">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                <span>Cargando resultados...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredActas.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                            No se encontraron actas
                                        </td>
                                    </tr>
                                ) : (
                                    filteredActas.map((acta, index) => (
                                        <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">{acta.employee_name}</div>
                                                <div className="text-xs text-slate-400">{acta.employee_location}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-300">
                                                    {acta.typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {acta.has_acta ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Firmada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-medium">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getDaysBadge(acta.days_pending)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {acta.has_acta ? (
                                                    <button
                                                        onClick={() => {
                                                            let id;
                                                            if (acta.type === 'assignment_computer' || acta.type === 'assignment_mobile') {
                                                                id = acta.assignment_id;
                                                            } else if (acta.type === 'sale') {
                                                                id = acta.sale_id;
                                                            } else {
                                                                id = acta.termination_id;
                                                            }
                                                            handleDownload(acta.type, id);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Descargar
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-500">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActasStatusPage;
