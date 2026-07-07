import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../components/Pagination';
import { Mail, RefreshCw, UserPlus, UserMinus, FileText, ChevronDown, ChevronUp, CheckCircle, Clock, Download, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SEDES_DISPONIBLES = ['San Isidro','Callao','Pucallpa','Chimbote','Ilo','Mollendo','Paita','Tacna'];

const HRAlertsPage = () => {
    const { showNotification } = useNotification();
    const [showReportModal, setShowReportModal] = useState(false);
    const now = new Date();
    const [reportYear,  setReportYear]  = useState(now.getFullYear());
    const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);

    const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    // Sedes persistidas por usuario
    const userId = (() => { try { return JSON.parse(atob((localStorage.getItem('token')||'').split('.')[1]||'')).sub || 'default'; } catch { return 'default'; } })();
    const SEDE_KEY = `report_sedes_${userId}`;
    const [selectedSedes, setSelectedSedes] = useState(() => {
        try { return JSON.parse(localStorage.getItem(SEDE_KEY)) || []; } catch { return []; }
    });

    const toggleSede = (sede) => {
        const next = selectedSedes.includes(sede)
            ? selectedSedes.filter(s => s !== sede)
            : [...selectedSedes, sede];
        setSelectedSedes(next);
        localStorage.setItem(SEDE_KEY, JSON.stringify(next));
    };

    const handleDownloadReport = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const locsParam = selectedSedes.length ? `&locations=${encodeURIComponent(selectedSedes.join(','))}` : '';
        const url = `${API_URL}/export/monthly-report?year=${reportYear}&month=${reportMonth}${locsParam}&token=${token}`;
        window.location.href = url;
        setShowReportModal(false);
        const sedeLabel = selectedSedes.length ? ` (${selectedSedes.join(', ')})` : ' (todas las sedes)';
        showNotification(`Generando reporte ${MESES[reportMonth-1]} ${reportYear}${sedeLabel}...`, 'success');
    };
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 20;

    const fetchAlerts = async (page = 1, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const res = await axios.get(`${API_URL}/email-alerts/`, {
                params: { skip, limit: itemsPerPage }
            });
            setAlerts(res.data.items);
            setTotalPages(res.data.pages);
            setTotalItems(res.data.total);
            setCurrentPage(page);
        } catch (err) {
            console.error(err);
            if (!silent) showNotification('Error al cargar las alertas', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await axios.post(`${API_URL}/email-alerts/sync`, null, {
                params: { mailbox_email: 'soporte.ti@transtotalperu.com' }
            });
            if (res.data.skipped_reason === 'sync_in_progress') {
                // Ya hay un sync corriendo en background — esperar y refrescar silenciosamente
                setTimeout(() => fetchAlerts(1, true), 8000);
            } else {
                const n = res.data.inserted_count;
                if (n > 0) showNotification(`${n} correo(s) nuevo(s) detectados.`, 'success');
                fetchAlerts(1);
            }
        } catch (err) {
            console.error(err);
            showNotification('Error sincronizando correos con Microsoft 365', 'error');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchAlerts(1);
        // Auto-refresh cada 30s — el backend sincroniza M365 en background cada 5 min
        const interval = setInterval(() => fetchAlerts(currentPage, true), 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    // Helper functions for UI
    const getAlertIcon = (type) => {
        if (type === 'ingreso') return <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
        if (type === 'cese') return <UserMinus className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
        return <Mail className="w-5 h-5 text-muted" />;
    };

    const getAlertBadge = (type) => {
        if (type === 'ingreso') return <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">Ingreso</span>;
        if (type === 'cese') return <span className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">Cese</span>;
        return <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">Otro</span>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    };

    return (
        <div className="text-slate-700 dark:text-slate-300 font-sans selection:bg-accent/30">
            <div className="w-full px-4 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Mail className="text-accent w-8 h-8" />
                            Bandeja de RRHH
                        </h1>
                        <p className="text-muted mt-2 text-sm max-w-2xl">
                            Visualiza correos de altas y bajas obtenidos en tiempo real de soporte.ti@transtotalperu.com.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium"
                        >
                            <Download className="w-5 h-5" />
                            Reporte Mensual
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent/50 text-white bg-accent/20 hover:bg-accent/40 hover:border-accent transition-all font-medium ${syncing ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_15px_rgba(79,70,229,0.3)]'}`}
                        >
                            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Correos'}
                        </button>
                    </div>

                    {/* Modal selector de mes */}
                    {showReportModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                                        <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Reporte Mensual
                                    </h2>
                                    <button onClick={() => setShowReportModal(false)} className="text-muted hover:text-slate-900 dark:hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-muted text-sm mb-4">Selecciona el mes, año y sedes del reporte.</p>
                                <div className="flex gap-3 mb-4">
                                    <select
                                        value={reportMonth}
                                        onChange={e => setReportMonth(Number(e.target.value))}
                                        className="flex-1 bg-bg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                    >
                                        {MESES.map((m, i) => (
                                            <option key={i+1} value={i+1}>{m}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={reportYear}
                                        onChange={e => setReportYear(Number(e.target.value))}
                                        className="w-28 bg-bg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                    >
                                        {[2024,2025,2026,2027].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selector de sedes */}
                                <div className="mb-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Sedes</span>
                                        <span className="text-slate-500 text-xs">
                                            {selectedSedes.length === 0 ? 'Todas' : `${selectedSedes.length} seleccionada(s)`}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {SEDES_DISPONIBLES.map(sede => (
                                            <button
                                                key={sede}
                                                onClick={() => toggleSede(sede)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                    selectedSedes.includes(sede)
                                                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-bg border-slate-300 dark:border-slate-600 text-muted hover:border-slate-400 dark:hover:border-slate-500'
                                                }`}
                                            >
                                                {sede}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedSedes.length > 0 && (
                                        <button onClick={() => { setSelectedSedes([]); localStorage.setItem(SEDE_KEY, '[]'); }}
                                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mt-2">
                                            Limpiar selección
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={handleDownloadReport}
                                    style={{backgroundColor:'#059669'}}
                                    className="w-full hover:opacity-90 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity"
                                >
                                    <Download className="w-4 h-4" /> Descargar Excel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table Container */}
                <div className="bg-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-sm relative">
                    {loading && (
                        <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                        </div>
                    )}

                    <div className="overflow-x-visible">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
                            <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 backdrop-blur-md z-1">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider w-10"></th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Asunto / Empleado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Remitente</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Fecha Recibido</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-surface/50 dark:bg-slate-800/30">
                                {alerts.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                            <Mail className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
                                            <p className="text-lg">No hay correos registrados.</p>
                                            <p className="text-sm mt-1">Haz clic en Sincronizar para buscar mensajes.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    alerts.map(alert => {
                                        const isExpanded = expandedRows.has(alert.id);
                                        const data = alert.parsed_data || {};

                                        const empName = data.nombres || '—';
                                        const empresa = data.empresa || '';
                                        const fecha = alert.alert_type === 'cese'
                                            ? data.fecha_cese || ''
                                            : data.fecha_ingreso || '';
                                        const subLine = [empresa, fecha].filter(Boolean).join(' · ');

                                        return (
                                            <React.Fragment key={alert.id}>
                                                <tr
                                                    className={`hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-100/60 dark:bg-slate-700/20' : ''}`}
                                                    onClick={() => toggleRow(alert.id)}
                                                >
                                                    <td className="px-6 py-4">
                                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {getAlertIcon(alert.alert_type)}
                                                            {getAlertBadge(alert.alert_type)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{empName}</div>
                                                        {subLine && <div className="text-xs text-slate-500 mt-0.5">{subLine}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                        {alert.sender_name} <br/> <span className="text-xs text-slate-500">{alert.sender_email}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted flex items-center gap-2">
                                                        <Clock className="w-4 h-4 opacity-70" />
                                                        {formatDate(alert.received_date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {alert.status === 'resolved' ? (
                                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold"><CheckCircle className="w-4 h-4"/> Atendido</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold"><Clock className="w-4 h-4"/> Pendiente</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="6" className="px-0 py-0 border-0">
                                                            <div className="bg-bg/50 p-6 border-b border-accent/20 shadow-inner">

                                                                {alert.alert_type === 'cese' ? (
                                                                    /* Ceses: mostrar solo los datos del asunto */
                                                                    <div className="flex flex-wrap gap-6">
                                                                        {alert.parsed_data?.empresa && (
                                                                            <div>
                                                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Empresa</div>
                                                                                <div className="text-sm text-slate-900 dark:text-white font-medium">{alert.parsed_data.empresa}</div>
                                                                            </div>
                                                                        )}
                                                                        {alert.parsed_data?.nombres && (
                                                                            <div>
                                                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Colaborador</div>
                                                                                <div className="text-sm text-slate-900 dark:text-white font-medium">{alert.parsed_data.nombres}</div>
                                                                            </div>
                                                                        )}
                                                                        {alert.parsed_data?.fecha_cese && (
                                                                            <div>
                                                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fecha de Cese</div>
                                                                                <div className="text-sm text-rose-600 dark:text-rose-300 font-semibold">{alert.parsed_data.fecha_cese}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    /* Ingresos: mostrar todos los campos extraídos */
                                                                    <>
                                                                        <h4 className="text-md font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                                                                            <FileText className="w-4 h-4 text-accent" /> Datos Extraídos del Correo
                                                                        </h4>
                                                                        {!alert.parsed_data || Object.keys(alert.parsed_data).length === 0 ? (
                                                                            <div className="text-muted italic bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">No se detectaron campos estructurados.</div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                {Object.entries(alert.parsed_data).map(([key, value]) => (
                                                                                    <div key={key} className="bg-surface/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                                                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                                                            {key.replace(/_/g, ' ')}
                                                                                        </div>
                                                                                        <div className="text-sm text-slate-900 dark:text-white font-medium break-words">
                                                                                            {value || '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                <div className="mt-6 flex justify-end gap-3">
                                                                    {alert.status !== 'resolved' && (
                                                                        <button className="px-4 py-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors">
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-800/80">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={fetchAlerts}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HRAlertsPage;
