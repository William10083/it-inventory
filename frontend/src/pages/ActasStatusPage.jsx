import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Upload, Settings, AlertTriangle, CheckCircle, Search, Filter, MapPin, Archive, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelFilter from '../components/ExcelFilter';
import PdfUploader from '../components/PdfUploader';
import Table from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { downloadFileWithProgress } from '../utils/downloadFile';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const LOCATIONS = [
    'Callao', 'San Isidro', 'Mollendo', 'Ilo', 'Pucallpa', 'Chimbote', 'Supe', 'Tacna'
];

const ActasStatusPage = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const notification = useNotification();
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

    // Modal de subida de acta
    const [uploadModalActa, setUploadModalActa] = useState(null);

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
            showNotification('Error al cargar estado de actas. Intente de nuevo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (type, id, employeeName) => {
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

        if (url) {
            const filename = `Acta_${getTypeLabel(type).replace(/\s+/g, '_')}_${employeeName || id}.pdf`;
            downloadFileWithProgress({
                url,
                filename,
                label: filename,
                params: { token },
                notification,
            }).catch(() => {});
        }
    };

    const getGeneratedActaConfig = (acta) => {
        switch (acta.type) {
            case 'assignment_computer':
            case 'assignment_mobile':
                return {
                    url: `${API_URL}/assignments/${acta.assignment_id}/acta`,
                    params: { acta_type: 'assignment' },
                    method: 'get',
                };
            case 'sale':
                return {
                    url: `${API_URL}/sales/${acta.sale_id}/generate-acta`,
                    method: 'post',
                };
            case 'termination_computer':
                return {
                    url: `${API_URL}/terminations/${acta.termination_id}/acta-computer`,
                    method: 'get',
                };
            case 'termination_mobile':
                return {
                    url: `${API_URL}/terminations/${acta.termination_id}/acta-mobile`,
                    method: 'get',
                };
            default:
                return null;
        }
    };

    const handleDownloadGenerated = (acta) => {
        const config = getGeneratedActaConfig(acta);
        if (!config) return;

        const defaultFilename = `Acta_${getTypeLabel(acta.type).replace(/\s+/g, '_')}_${acta.employee_name || ''}.docx`;

        downloadFileWithProgress({
            url: config.url,
            method: config.method,
            params: config.params,
            filename: defaultFilename,
            label: defaultFilename,
            getFilename: (response) => {
                const contentDisposition = response.headers['content-disposition'];
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                    if (filenameMatch && filenameMatch[1]) {
                        return filenameMatch[1];
                    }
                }
                return defaultFilename;
            },
            notification,
        }).catch(() => {});
    };

    const handleBulkExport = () => {
        // Build query params
        const params = new URLSearchParams();
        // Export only SIGNED actas as requested
        params.append('status_filter', 'signed');

        if (searchTerm) params.append('search', searchTerm);
        if (locationFilter && locationFilter !== 'all') params.append('location_filter', locationFilter);

        // Add Type Filter (Excel-like)
        if (excelFilters.typeLabel && excelFilters.typeLabel.length > 0) {
            params.append('type_filter', excelFilters.typeLabel.join(','));
        }

        if (token) params.append('token', token);

        window.location.href = `${API_URL}/actas-status/export-zip?${params.toString()}`;
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

    const getActaUrls = (acta) => {
        switch (acta.type) {
            case 'assignment_computer':
            case 'assignment_mobile':
                return {
                    uploadUrl: `${API_URL}/assignments/${acta.assignment_id}/upload-acta`,
                    downloadUrl: `${API_URL}/assignments/${acta.assignment_id}/download-acta`,
                    deleteUrl: `${API_URL}/assignments/${acta.assignment_id}/delete-acta`,
                };
            case 'sale':
                return {
                    uploadUrl: `${API_URL}/sales/${acta.sale_id}/upload-acta`,
                    downloadUrl: `${API_URL}/sales/${acta.sale_id}/download-acta`,
                    deleteUrl: null,
                };
            case 'termination_computer':
                return {
                    uploadUrl: `${API_URL}/terminations/${acta.termination_id}/upload-computer-acta`,
                    downloadUrl: `${API_URL}/terminations/${acta.termination_id}/download-computer-acta`,
                    deleteUrl: `${API_URL}/terminations/${acta.termination_id}/delete-computer-acta`,
                };
            case 'termination_mobile':
                return {
                    uploadUrl: `${API_URL}/terminations/${acta.termination_id}/upload-mobile-acta`,
                    downloadUrl: `${API_URL}/terminations/${acta.termination_id}/download-mobile-acta`,
                    deleteUrl: `${API_URL}/terminations/${acta.termination_id}/delete-mobile-acta`,
                };
            default:
                return { uploadUrl: null, downloadUrl: null, deleteUrl: null };
        }
    };

    const getDaysBadge = (days) => {
        if (days === null) return null;

        let colorClass = 'bg-yellow-500/20 text-accent border-yellow-500/30';
        if (days > 30) colorClass = 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
        else if (days > 15) colorClass = 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30';

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
    // Pre-process data with labels for filtering
    const processedActas = useMemo(() => {
        if (!data) return [];
        return [
            ...(data.assignment_computer || []),
            ...(data.assignment_mobile || []),
            ...(data.sales || []),
            ...(data.terminations || [])
        ].map(acta => ({
            ...acta,
            typeLabel: getTypeLabel(acta.type),
            statusLabel: acta.has_acta ? 'Firmada' : 'Pendiente'
        }));
    }, [data]);

    // Filter Logic
    const filteredActas = useMemo(() => {
        return processedActas.filter(acta => {
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
    }, [processedActas, locationFilter, excelFilters, sortConfig]);

    // Helper to update specific filter
    const updateExcelFilter = (key, values) => {
        setExcelFilters(prev => ({ ...prev, [key]: values }));
    };

    // Column defs for the shared Table primitive. Sort/filter state stays here
    // (sortConfig/handleSort, excelFilters/updateExcelFilter) — Table is presentational only.
    const columns = [
        {
            key: 'employee_name',
            header: 'Empleado',
            sortable: true,
            cell: (acta) => (
                <>
                    <div className="font-medium text-slate-900 dark:text-white">{acta.employee_name}</div>
                    <div className="text-xs text-muted">{acta.employee_location}</div>
                </>
            ),
        },
        {
            key: 'typeLabel',
            header: 'Tipo',
            sortable: true,
            cell: (acta) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">{acta.typeLabel}</span>
            ),
        },
        {
            key: 'statusLabel',
            header: 'Estado',
            sortable: true,
            align: 'center',
            width: 'w-32',
            cell: (acta) => (
                acta.has_acta ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Firmada
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Pendiente
                    </span>
                )
            ),
        },
        {
            key: 'days_pending',
            header: 'Días Pend.',
            sortable: true,
            align: 'center',
            width: 'w-36',
            cell: (acta) => getDaysBadge(acta.days_pending),
        },
        {
            key: 'actions',
            header: 'Acciones',
            align: 'center',
            width: 'w-28',
            cell: (acta) => (
                <div className="inline-flex items-center gap-1">
                    {acta.has_acta ? (
                        <>
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
                                    handleDownload(acta.type, id, acta.employee_name);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent hover:opacity-90 text-white rounded-lg text-xs font-medium transition-opacity"
                            >
                                <Download className="w-3 h-3" />
                                Descargar
                            </button>
                            <button
                                onClick={() => setUploadModalActa(acta)}
                                title="Gestionar acta"
                                className="inline-flex items-center justify-center p-1.5 bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            >
                                <Settings className="w-3 h-3" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setUploadModalActa(acta)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            <Upload className="w-3 h-3" />
                            Subir
                        </button>
                    )}
                    <button
                        onClick={() => handleDownloadGenerated(acta)}
                        title="Descargar acta generada (sin firmar)"
                        className="inline-flex items-center justify-center p-1.5 bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <FileText className="w-3 h-3" />
                    </button>
                </div>
            ),
        },
    ];

    const filterKeyByColumn = {
        employee_name: 'employee_name',
        typeLabel: 'typeLabel',
        statusLabel: 'statusLabel',
        days_pending: 'days_pending',
    };

    const filterPlaceholderByColumn = {
        employee_name: 'Buscar...',
        typeLabel: 'Tipo...',
        statusLabel: 'Estado...',
        days_pending: 'Días...',
    };

    const renderColumnFilter = (column) => {
        const filterKey = filterKeyByColumn[column.key];
        if (!filterKey) return null;
        return (
            <ExcelFilter
                column={filterKey}
                data={processedActas}
                selectedValues={excelFilters[filterKey]}
                onFilterChange={(val) => updateExcelFilter(filterKey, val)}
                placeholder={filterPlaceholderByColumn[filterKey]}
            />
        );
    };

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="bg-surface p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-6 h-6 text-accent" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Estado de Actas Firmadas</h2>
                    </div>
                    <p className="text-muted text-sm">
                        Seguimiento de actas firmadas y pendientes de asignaciones y ceses
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleBulkExport}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-green-500 shadow-sm"
                        title="Exportar actas firmadas (ZIP)"
                    >
                        <Archive className="w-4 h-4" />
                        Exportar Filtrados (ZIP)
                    </button>
                    <button
                        onClick={() => navigate('/templates')}
                        className="bg-bg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
                        title="Gestionar templates de actas"
                    >
                        <FileText className="w-4 h-4" />
                        Templates
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Assignment Computer Summary */}
                <div className="bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted mb-1">Asignación Cómputo</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {data.summary.assignment_computer_signed}
                        </span>
                        <span className="text-muted">/ {data.summary.assignment_computer_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-600 dark:text-green-400">
                            {data.summary.assignment_computer_total > 0
                                ? Math.round((data.summary.assignment_computer_signed / data.summary.assignment_computer_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Assignment Mobile Summary */}
                <div className="bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted mb-1">Asignación Celular</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {data.summary.assignment_mobile_signed}
                        </span>
                        <span className="text-muted">/ {data.summary.assignment_mobile_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-600 dark:text-green-400">
                            {data.summary.assignment_mobile_total > 0
                                ? Math.round((data.summary.assignment_mobile_signed / data.summary.assignment_mobile_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Sales Summary */}
                <div className="bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted mb-1">Ventas</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {data.summary.sales_signed}
                        </span>
                        <span className="text-muted">/ {data.summary.sales_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-600 dark:text-green-400">
                            {data.summary.sales_total > 0
                                ? Math.round((data.summary.sales_signed / data.summary.sales_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Terminations Summary */}
                <div className="bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-muted mb-1">Ceses</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {data.summary.terminations_signed}
                        </span>
                        <span className="text-muted">/ {data.summary.terminations_total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-600 dark:text-green-400">
                            {data.summary.terminations_total > 0
                                ? Math.round((data.summary.terminations_signed / data.summary.terminations_total) * 100)
                                : 0}% firmadas
                        </span>
                    </div>
                </div>

                {/* Total Summary */}
                <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                    <div className="text-sm text-accent mb-1">Total</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {data.summary.total_signed}
                        </span>
                        <span className="text-accent">/ {data.summary.total}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                            {data.summary.total_pending} pendientes
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all'
                                        ? 'bg-accent text-white'
                                        : 'bg-bg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                                        }`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setStatusFilter('signed')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'signed'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-bg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                                        }`}
                                >
                                    Firmadas
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'pending'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-bg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
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
                                className="bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-accent outline-none"
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
                            className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-accent outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-lg border border-slate-200 dark:border-slate-700 overflow-visible">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="inline-block min-w-full align-middle">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-slate-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <span>Cargando resultados...</span>
                            </div>
                        ) : (
                            <Table
                                columns={columns}
                                data={filteredActas}
                                sortState={sortConfig}
                                onSort={handleSort}
                                renderFilter={renderColumnFilter}
                                emptyState="No se encontraron actas"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de subida de acta */}
            {uploadModalActa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-accent" />
                                    Subir Acta Firmada
                                </h3>
                                <p className="text-muted text-sm mt-1">
                                    {uploadModalActa.employee_name} · {getTypeLabel(uploadModalActa.type)}
                                </p>
                            </div>
                            <button onClick={() => setUploadModalActa(null)} className="text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <PdfUploader
                                {...getActaUrls(uploadModalActa)}
                                currentPdfPath={uploadModalActa.acta_path}
                                label="Acta Firmada (PDF)"
                                onUploadSuccess={() => { setUploadModalActa(null); fetchData(); }}
                                onDeleteSuccess={() => { setUploadModalActa(null); fetchData(); }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActasStatusPage;
