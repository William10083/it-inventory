import React, { useState, useEffect, useRef } from 'react';
import {
    Download, Search, Trash2, Laptop, Monitor, Keyboard,
    Briefcase, Headphones, Smartphone, Upload, FileDown,
    ChevronDown, ChevronUp, Package, UserMinus, RefreshCw,
    Shield, AlertTriangle, Info, X, Loader2
} from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import Pagination from '../components/Pagination';
import PdfUploader from '../components/PdfUploader';
import { downloadFileWithProgress } from '../utils/downloadFile';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TerminationsPage = () => {
    const { showNotification, showConfirm, startDownload, updateDownloadProgress, finishDownload, failDownload } = useNotification();
    const [activeTab, setActiveTab] = useState('historial');

    // Historial state
    const [terminations, setTerminations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 20;
    const reqIdRef = useRef(0);

    // Licenses tab state
    const [licensesData, setLicensesData] = useState([]);
    const [licensesLoading, setLicensesLoading] = useState(false);
    const [licenseOrigin, setLicenseOrigin] = useState(null);   // { email, display_name, license_states }
    const [licenseOriginLoading, setLicenseOriginLoading] = useState(false);

    // Auto-register state
    const [autoRegistering, setAutoRegistering] = useState(false);

    useEffect(() => {
        fetchTerminations(1);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => fetchTerminations(1), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchTerminations = async (page = 1, showSpinner = false) => {
        const reqId = ++reqIdRef.current;
        if (showSpinner) setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const response = await axios.get(`${API_URL}/terminations/`, {
                params: { skip, limit: itemsPerPage, search: searchTerm || undefined }
            });
            if (reqId !== reqIdRef.current) return;
            if (response.data.items) {
                setTerminations(response.data.items);
                setTotalItems(response.data.total);
                setTotalPages(response.data.pages);
                setCurrentPage(page);
            }
        } catch (error) {
            if (reqId !== reqIdRef.current) return;
            console.error("Error fetching terminations:", error);
            if (showSpinner) showNotification('Error al cargar los ceses', 'error');
        } finally {
            if (showSpinner && reqId === reqIdRef.current) setLoading(false);
        }
    };

    const toggleRow = (id) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    const handleDeleteTermination = async (id, e) => {
        e.stopPropagation();
        const confirmed = await showConfirm(
            'Eliminar Cese',
            '¿Estás seguro? Esto reactivará al empleado y todas sus asignaciones devueltas.'
        );
        if (!confirmed) return;
        try {
            await axios.delete(`${API_URL}/terminations/${id}`);
            showNotification('Cese eliminado y empleado reactivado correctamente', 'success');
            fetchTerminations(currentPage);
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al eliminar cese', 'error');
        }
    };

    const downloadActas = (terminationId, e) => {
        e.stopPropagation();
        const defaultFilename = `ACTAS_CESE_${terminationId}.zip`;
        downloadFileWithProgress({
            url: `${API_URL}/terminations/${terminationId}/actas-zip`,
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
            notification: { startDownload, updateDownloadProgress, finishDownload, failDownload, showNotification },
        }).catch(() => {});
    };

    const handleAutoRegister = async () => {
        setAutoRegistering(true);
        try {
            const res = await axios.post(`${API_URL}/email-alerts/import-ceses`);
            const { registered_count, created_employees, already_inactive, reingresos, skipped } = res.data;
            if (registered_count > 0) {
                const parts = [`${registered_count} cese(s) registrado(s)`];
                if (created_employees > 0) parts.push(`${created_employees} empleado(s) creado(s)`);
                if (reingresos > 0) parts.push(`${reingresos} omitido(s) por reingreso`);
                showNotification(parts.join(' · ') + '.', 'success');
                fetchTerminations(1);
            } else if (already_inactive > 0 || reingresos > 0) {
                showNotification(
                    `Sin nuevos ceses. ${already_inactive} ya estaban cesados · ${reingresos} son reingresos activos.`,
                    'info'
                );
            } else {
                showNotification(
                    skipped.length > 0
                        ? `No se encontraron empleados para: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ` y ${skipped.length - 5} más` : ''}`
                        : 'No hay ceses pendientes por registrar.',
                    'info'
                );
            }
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al auto-registrar ceses', 'error');
        } finally {
            setAutoRegistering(false);
        }
    };

    const fetchLicenses = async (forceRefresh = false) => {
        setLicensesLoading(true);
        try {
            const res = await axios.get(`${API_URL}/email-alerts/ceses-with-licenses`, {
                params: forceRefresh ? { force_refresh: true } : {}
            });
            setLicensesData(res.data.results || []);
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al obtener licencias activas', 'error');
        } finally {
            setLicensesLoading(false);
        }
    };

    const fetchLicenseOrigin = async (email) => {
        setLicenseOriginLoading(true);
        setLicenseOrigin({ email, display_name: '', license_states: [] });
        try {
            const res = await axios.get(`${API_URL}/m365/license-assignment-states`, { params: { email } });
            setLicenseOrigin(res.data);
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al consultar origen de licencias', 'error');
            setLicenseOrigin(null);
        } finally {
            setLicenseOriginLoading(false);
        }
    };

    const removeLicense = async (email, skuId, licenseName) => {
        if (!confirm(`¿Quitar "${licenseName}" de ${email}?`)) return;
        try {
            await axios.delete(`${API_URL}/m365/user-license`, { params: { email, sku_id: skuId } });
            showNotification(`Licencia "${licenseName}" eliminada correctamente.`, 'success');
            // Refrescar el modal y la lista
            fetchLicenseOrigin(email);
            fetchLicenses(true);
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al quitar la licencia', 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const getDeviceIcon = (deviceType) => {
        const lower = (deviceType || '').toLowerCase();
        if (lower.includes('laptop')) return <Laptop className="w-4 h-4 text-device-laptop" />;
        if (lower.includes('monitor')) return <Monitor className="w-4 h-4 text-device-monitor" />;
        if (lower.includes('kit') || lower.includes('teclado')) return <Keyboard className="w-4 h-4 text-device-kit" />;
        if (lower.includes('mochila')) return <Briefcase className="w-4 h-4 text-device-backpack" />;
        if (lower.includes('auric')) return <Headphones className="w-4 h-4 text-device-headphones" />;
        if (lower.includes('celular') || lower.includes('mobile')) return <Smartphone className="w-4 h-4 text-device-mobile" />;
        return <Package className="w-4 h-4 text-slate-400 dark:text-slate-400" />;
    };

    return (
        <>
        <div className="text-slate-700 dark:text-slate-300 font-sans selection:bg-accent/30">
            <div className="w-full px-4 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <UserMinus className="text-rose-600 dark:text-rose-400 w-8 h-8" />
                            Ceses de Empleados
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl">
                            Historial de terminaciones laborales y seguimiento de licencias M365 activas.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                        <button
                            onClick={handleAutoRegister}
                            disabled={autoRegistering}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all font-medium text-sm ${autoRegistering ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoRegistering ? 'animate-spin' : ''}`} />
                            {autoRegistering ? 'Registrando...' : 'Auto-registrar desde correos'}
                        </button>
                        <button
                            onClick={() => window.open(`${API_URL}/export/terminations/excel`, '_blank')}
                            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <FileDown className="w-4 h-4" />
                            Exportar Excel
                        </button>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2 text-center">
                            <div className="text-rose-600 dark:text-rose-400 font-bold text-xl">{totalItems}</div>
                            <div className="text-rose-700 dark:text-rose-300 text-xs uppercase">Total</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 gap-1">
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'historial' ? 'bg-surface text-slate-900 dark:text-white border border-b-surface dark:border-b-slate-800 border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Historial de Ceses
                    </button>
                    <button
                        onClick={() => { setActiveTab('licencias'); if (!licensesData.length) fetchLicenses(); }}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'licencias' ? 'bg-surface text-slate-900 dark:text-white border border-b-surface dark:border-b-slate-800 border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Licencias M365 Activas
                    </button>
                </div>

                {/* ── HISTORIAL TAB ─────────────────────────────────── */}
                {activeTab === 'historial' && (
                    <>
                        {/* Search */}
                        <div className="relative mb-5">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-accent outline-none transition-all"
                                placeholder="Buscar por nombre, DNI o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Table */}
                        <div className="bg-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden relative">
                            {loading && (
                                <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center z-10">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                                </div>
                            )}

                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
                                <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 w-10"></th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empresa / Cargo</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha Cese</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Equipos</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actas</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-surface/50 dark:bg-slate-800/30">
                                    {terminations.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                                <UserMinus className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                                                <p className="text-lg">{searchTerm ? 'No se encontraron resultados' : 'No hay ceses registrados'}</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        terminations.map(term => {
                                            const isExpanded = expandedRows.has(term.id);
                                            return (
                                                <React.Fragment key={term.id}>
                                                    <tr
                                                        className={`hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-100/60 dark:bg-slate-700/20' : ''}`}
                                                        onClick={() => toggleRow(term.id)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            {isExpanded
                                                                ? <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                                                : <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{term.employee.full_name}</div>
                                                            <div className="text-xs text-slate-500">DNI: {term.employee.dni || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-slate-600 dark:text-slate-300">{term.employee.company || term.employee.company_name || '-'}</div>
                                                            <div className="text-xs text-slate-500">{term.employee.position || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                            {formatDate(term.termination_date)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`text-sm font-medium ${term.equipment_returned_count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                                {term.equipment_returned_count} equipo{term.equipment_returned_count !== 1 ? 's' : ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                            {(term.computer_acta_available || term.mobile_acta_available) ? (
                                                                <button
                                                                    onClick={(e) => downloadActas(term.id, e)}
                                                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg transition-colors"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Descargar
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 dark:text-slate-600">Sin actas</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => handleDeleteTermination(term.id, e)}
                                                                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                title="Eliminar cese"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded details */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="7" className="px-0 py-0 border-0">
                                                                <div className="bg-bg/50 p-6 border-b border-rose-500/10 shadow-inner">

                                                                    {/* Device grid */}
                                                                    {term.returned_devices && term.returned_devices.length > 0 && (
                                                                        <>
                                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                                                <Package className="w-4 h-4 text-accent" />
                                                                                Equipos Retornados ({term.equipment_returned_count})
                                                                            </h4>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                                                                                {term.returned_devices.map((device, idx) => (
                                                                                    <div key={idx} className="bg-surface/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 flex items-start gap-3">
                                                                                        <div className="mt-0.5">{getDeviceIcon(device.type)}</div>
                                                                                        <div>
                                                                                            <div className="text-xs text-slate-500 uppercase font-bold">{device.type}</div>
                                                                                            <div className="text-sm text-slate-900 dark:text-white font-medium">{device.brand} {device.model}</div>
                                                                                            {device.serial_number && <div className="text-xs text-slate-500">SN: {device.serial_number}</div>}
                                                                                            {device.hostname && <div className="text-xs text-slate-500">Host: {device.hostname}</div>}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {/* Reason / Observations */}
                                                                    {(term.reason || term.observations) && (
                                                                        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            {term.reason && (
                                                                                <div className="bg-surface/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                                                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                                                                                        <AlertTriangle className="w-3 h-3" /> Razón
                                                                                    </div>
                                                                                    <div className="text-sm text-slate-600 dark:text-slate-300">{term.reason}</div>
                                                                                </div>
                                                                            )}
                                                                            {term.observations && (
                                                                                <div className="bg-surface/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                                                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Observaciones</div>
                                                                                    <div className="text-sm text-slate-600 dark:text-slate-300">{term.observations}</div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Upload signed actas */}
                                                                    {(term.computer_acta_available || term.mobile_acta_available) && (
                                                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                                                            <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                                                                <Upload className="w-3 h-3" /> Subir Actas Firmadas
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                {term.computer_acta_available && (
                                                                                    <PdfUploader
                                                                                        key={`computer-${term.id}-${term.computer_acta_path || 'empty'}`}
                                                                                        uploadUrl={`${API_URL}/terminations/${term.id}/upload-computer-acta`}
                                                                                        downloadUrl={`${API_URL}/terminations/${term.id}/download-computer-acta`}
                                                                                        deleteUrl={`${API_URL}/terminations/${term.id}/delete-computer-acta`}
                                                                                        currentPdfPath={term.computer_acta_path}
                                                                                        label="Acta de Computadora Firmada"
                                                                                        onUploadSuccess={() => fetchTerminations(currentPage)}
                                                                                        onDeleteSuccess={() => fetchTerminations(currentPage)}
                                                                                    />
                                                                                )}
                                                                                {term.mobile_acta_available && (
                                                                                    <PdfUploader
                                                                                        key={`mobile-${term.id}-${term.mobile_acta_path || 'empty'}`}
                                                                                        uploadUrl={`${API_URL}/terminations/${term.id}/upload-mobile-acta`}
                                                                                        downloadUrl={`${API_URL}/terminations/${term.id}/download-mobile-acta`}
                                                                                        deleteUrl={`${API_URL}/terminations/${term.id}/delete-mobile-acta`}
                                                                                        currentPdfPath={term.mobile_acta_path}
                                                                                        label="Acta de Celular Firmada"
                                                                                        onUploadSuccess={() => fetchTerminations(currentPage)}
                                                                                        onDeleteSuccess={() => fetchTerminations(currentPage)}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
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

                            {totalPages > 1 && (
                                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-800/80">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={(page) => {
                                            fetchTerminations(page, true);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── LICENCIAS M365 TAB ────────────────────────────── */}
                {activeTab === 'licencias' && (
                    <div className="bg-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-slate-900 dark:text-white font-bold">Empleados Cesados con Licencias M365 Activas</h2>
                                <p className="text-slate-500 text-xs mt-1">
                                    Empleados marcados como cesados en el sistema que aún tienen licencias de Microsoft 365 asignadas.
                                </p>
                            </div>
                            <button
                                onClick={() => fetchLicenses(true)}
                                disabled={licensesLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm ${licensesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${licensesLoading ? 'animate-spin' : ''}`} />
                                {licensesLoading ? 'Consultando...' : 'Actualizar'}
                            </button>
                        </div>

                        {licensesLoading ? (
                            <div className="flex items-center justify-center p-16">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
                            </div>
                        ) : licensesData.length === 0 ? (
                            <div className="text-center p-12 text-slate-500">
                                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-lg">
                                    {licensesData !== null ? 'Sin licencias activas detectadas' : 'Haz clic en "Actualizar" para consultar.'}
                                </p>
                                <p className="text-sm mt-1">Se comparan los empleados cesados del sistema contra usuarios activos en Microsoft 365.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
                                <thead className="bg-slate-100 dark:bg-slate-800/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email M365</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha Cese</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Licencias Activas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-surface/50 dark:bg-slate-800/30">
                                    {licensesData.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.employee_name}</div>
                                                <div className="text-xs text-slate-500">DNI: {item.employee_dni || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {formatDate(item.termination_date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5 items-center">
                                                    {item.licenses.map((lic, j) => (
                                                        <span key={j} className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-xs">
                                                            {lic.license_name}
                                                        </span>
                                                    ))}
                                                    <button
                                                        onClick={() => fetchLicenseOrigin(item.email)}
                                                        title="Ver desde dónde está asignada cada licencia"
                                                        className="ml-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Modal: origen de licencias */}
        {licenseOrigin && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
                    <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-base">Origen de Licencias M365</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{licenseOrigin.display_name || licenseOrigin.email}</p>
                        </div>
                        <button onClick={() => setLicenseOrigin(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-5">
                        {licenseOriginLoading ? (
                            <div className="flex items-center justify-center py-8 gap-3 text-slate-500 dark:text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Consultando Graph API...
                            </div>
                        ) : licenseOrigin.license_states?.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-6">Sin licencias asignadas en Graph API.</p>
                        ) : (
                            <div className="space-y-2">
                                {licenseOrigin.license_states?.map((s, i) => {
                                    const isActive = s.state === 'Active';
                                    return (
                                        <div key={i} className={`bg-bg/50 rounded-lg p-3 border ${isActive ? 'border-slate-200 dark:border-slate-700/50' : 'border-slate-200/60 dark:border-slate-700/20 opacity-60'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{s.license_name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{s.sku_part_number}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                                        s.assigned_by_group
                                                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                    }`}>
                                                        {s.assigned_by_group ? `Grupo: ${s.group_name}` : 'Asignación directa'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        isActive
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                            : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {s.state || 'Desconocido'}
                                                    </span>
                                                    {isActive && !s.assigned_by_group && (
                                                        <button
                                                            onClick={() => removeLicense(licenseOrigin.email, s.sku_id, s.license_name)}
                                                            className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    Si el estado es <strong className="text-slate-600 dark:text-slate-300">Active</strong>, la licencia está activa.
                                    Si viene de un <strong className="text-blue-600 dark:text-blue-400">Grupo</strong>, quita al usuario de ese grupo en Azure AD.
                                    Si es <strong className="text-amber-600 dark:text-amber-400">Asignación directa</strong> pero el portal muestra 0 licencias, puede ser un <em>delay de propagación</em> de Microsoft (espera unos minutos y vuelve a actualizar).
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default TerminationsPage;
