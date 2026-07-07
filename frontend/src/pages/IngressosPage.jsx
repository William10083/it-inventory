import React, { useState, useEffect, useRef } from 'react';
import {
    UserPlus, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle, Clock, Search
} from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import Pagination from '../components/Pagination';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_CONFIG = {
    resolved:  { label: 'Atendido',  cls: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle },
    reingreso: { label: 'Reingreso', cls: 'text-amber-600 dark:text-amber-400',     Icon: RefreshCw   },
    pending:   { label: 'Pendiente', cls: 'text-muted',     Icon: Clock       },
};

const FIELD_LABELS = {
    dni:          'DNI',
    fecha_ingreso:'Fecha Ingreso',
    nombres:      'Nombres',
    nombre_firma: 'Nombre Firma',
    area:         'Área',
    cargo:        'Cargo',
    jefe_directo: 'Jefe Directo',
    empresa:      'Empresa',
    ubicacion:    'Ubicación',
    equipo:       'Equipo',
    movil:        'Móvil / Datos',
};

const IngressosPage = () => {
    const { showNotification } = useNotification();

    const [alerts, setAlerts]           = useState([]);
    const [loading, setLoading]         = useState(false);
    const [autoReg, setAutoReg]         = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');   // '' = todos
    const searchRef      = useRef('');
    const currentPageRef = useRef(1);
    const totalItemsRef  = useRef(0);
    const reqIdRef       = useRef(0);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages]   = useState(0);
    const [totalItems, setTotalItems]   = useState(0);
    const itemsPerPage = 20;

    const fetchAlerts = async (page = 1, search = searchTerm, showSpinner = false, sf = statusFilter) => {
        const reqId = ++reqIdRef.current;
        if (showSpinner) setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const res = await axios.get(`${API_URL}/email-alerts/`, {
                params: { skip, limit: itemsPerPage, alert_type: 'ingreso', status: sf || undefined, search: search || undefined }
            });
            if (reqId !== reqIdRef.current) return; // respuesta stale, ignorar
            setAlerts(res.data.items);
            setTotalPages(res.data.pages);
            setTotalItems(res.data.total);
            setCurrentPage(page);
        } catch {
            if (reqId !== reqIdRef.current) return;
            if (showSpinner) showNotification('Error al cargar ingresos', 'error');
        } finally {
            if (showSpinner && reqId === reqIdRef.current) setLoading(false);
        }
    };

    // Mantener refs sincronizados (evita stale closures en el interval)
    useEffect(() => { searchRef.current = searchTerm; }, [searchTerm]);
    useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    useEffect(() => { totalItemsRef.current = totalItems; }, [totalItems]);

    useEffect(() => {
        fetchAlerts(1);

        const interval = setInterval(async () => {
            if (document.hidden) return;
            try {
                const res = await axios.get(`${API_URL}/email-alerts/`, {
                    params: { skip: 0, limit: 1, alert_type: 'ingreso', status: statusFilter || undefined }
                });
                if (res.data.total !== totalItemsRef.current) {
                    fetchAlerts(currentPageRef.current, searchRef.current, false);
                }
            } catch { /* silencioso */ }
        }, 30000);

        let hiddenSince = null;
        const onVisibility = () => {
            if (document.hidden) {
                hiddenSince = Date.now();
            } else if (hiddenSince && Date.now() - hiddenSince > 120000) {
                fetchAlerts(currentPageRef.current, searchRef.current, false);
                hiddenSince = null;
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchAlerts(1, searchTerm, false), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        fetchAlerts(1, searchTerm, false, statusFilter);
    }, [statusFilter]);

    const handleCleanup = async () => {
        try {
            const res = await axios.post(`${API_URL}/email-alerts/cleanup-ingresos`);
            if (res.data.resolved > 0) {
                showNotification(`${res.data.resolved} ingreso(s) de empleados cesados marcados como atendidos.`, 'success');
                fetchAlerts(1);
            } else {
                showNotification('No hay ingresos pendientes de empleados cesados.', 'info');
            }
        } catch {
            showNotification('Error al limpiar ingresos', 'error');
        }
    };

    const handleAutoRegister = async () => {
        setAutoReg(true);
        try {
            const res = await axios.post(`${API_URL}/email-alerts/import-ingresos`);
            const { created_count, already_exists } = res.data;
            if (created_count > 0) {
                showNotification(`${created_count} empleado(s) creado(s) · ${already_exists} ya existían.`, 'success');
                fetchAlerts(1);
            } else {
                showNotification(`Sin nuevos ingresos. ${already_exists} ya estaban registrados.`, 'info');
            }
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al auto-registrar ingresos', 'error');
        } finally {
            setAutoReg(false);
        }
    };

    const handleMarkResolved = async (alertId, e) => {
        e.stopPropagation();
        try {
            await axios.put(`${API_URL}/email-alerts/${alertId}/status`, { status: 'resolved' });
            showNotification('Marcado como atendido', 'success');
            fetchAlerts(currentPage);
        } catch {
            showNotification('Error al actualizar estado', 'error');
        }
    };

    const toggleRow = (id) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedRows(next);
    };

    const formatDate = (ds) => {
        if (!ds) return '-';
        return new Date(ds).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="text-slate-600 dark:text-slate-300 font-sans selection:bg-accent/30">
            <div className="w-full px-4 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <UserPlus className="text-emerald-500 dark:text-emerald-400 w-8 h-8" />
                            Ingresos de Empleados
                        </h1>
                        <p className="text-muted mt-2 text-sm max-w-2xl">
                            Correos de nuevos ingresos detectados automáticamente desde RRHH.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                        <button
                            onClick={handleCleanup}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600/40 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/30 hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all font-medium text-sm"
                            title="Marcar como atendidos los ingresos de empleados ya cesados"
                        >
                            Limpiar cesados
                        </button>
                        <button
                            onClick={handleAutoRegister}
                            disabled={autoReg}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium text-sm ${autoReg ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoReg ? 'animate-spin' : ''}`} />
                            {autoReg ? 'Registrando...' : 'Auto-registrar desde correos'}
                        </button>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-center">
                            <div className="text-emerald-500 dark:text-emerald-400 font-bold text-xl">{totalItems}</div>
                            <div className="text-emerald-600 dark:text-emerald-300 text-xs uppercase">Total</div>
                        </div>
                    </div>
                </div>

                {/* Search + filtro estado */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por asunto, nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 bg-surface border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="resolved">Atendido</option>
                        <option value="reingreso">Reingreso</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 dark:border-emerald-400" />
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
                            <thead className="bg-bg/80 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-4 w-8" />
                                    <th className="px-4 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Empleado</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Empresa / Área</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Cargo</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Fecha Ingreso</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-surface/30">
                                {alerts.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                            <UserPlus className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
                                            <p className="text-lg">No hay ingresos registrados.</p>
                                            <p className="text-sm mt-1">Sincroniza los correos de RRHH desde la Bandeja.</p>
                                        </td>
                                    </tr>
                                ) : alerts.map(alert => {
                                    const isExpanded = expandedRows.has(alert.id);
                                    const data = alert.parsed_data || {};
                                    const nombre = data.nombres || '—';
                                    const empresa = data.empresa || '';
                                    const area = data.area || '';
                                    const cargo = data.cargo || '';
                                    const fechaIngreso = data.fecha_ingreso || '';
                                    const statusCfg = STATUS_CONFIG[alert.status] || STATUS_CONFIG.pending;

                                    return (
                                        <React.Fragment key={alert.id}>
                                            <tr
                                                className={`hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-100 dark:bg-slate-700/20' : ''}`}
                                                onClick={() => toggleRow(alert.id)}
                                            >
                                                <td className="px-4 py-4">
                                                    {isExpanded
                                                        ? <ChevronUp className="w-4 h-4 text-muted" />
                                                        : <ChevronDown className="w-4 h-4 text-muted" />}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{nombre}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{alert.sender_name}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {empresa && <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{empresa}</div>}
                                                    {area && <div className="text-xs text-muted mt-0.5">{area}</div>}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{cargo || '—'}</td>
                                                <td className="px-4 py-4 text-sm text-muted">{fechaIngreso || formatDate(alert.received_date)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${statusCfg.cls}`}>
                                                        <statusCfg.Icon className="w-3.5 h-3.5" />
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" className="px-0 py-0 border-0">
                                                        <div className="bg-bg/50 p-6 border-b border-emerald-500/20 shadow-inner">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                                                                {Object.entries(data).map(([key, value]) => {
                                                                    if (!value) return null;
                                                                    return (
                                                                        <div key={key} className="bg-surface/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                                                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                                                {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                                                                            </div>
                                                                            <div className="text-sm text-slate-900 dark:text-white font-medium break-words">{value}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="flex justify-end gap-3">
                                                                {alert.status !== 'resolved' && (
                                                                    <button
                                                                        onClick={(e) => handleMarkResolved(alert.id, e)}
                                                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        Marcar como Atendido
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-surface/80">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={(p) => fetchAlerts(p, searchTerm, true)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IngressosPage;
