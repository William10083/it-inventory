import React, { useState, useEffect } from 'react';
import { Search, Download, Loader, RotateCcw, User, Package, Calendar, Building2, Upload, Settings, X, FileText } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import PdfUploader from '../components/PdfUploader';
import { downloadFileWithProgress } from '../utils/downloadFile';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEVICE_TYPE_LABELS = {
    laptop: 'Laptop', monitor: 'Monitor', celular: 'Celular', mobile: 'Celular',
    mochila: 'Mochila', auriculares: 'Auriculares', 'kit teclado/mouse': 'Kit Teclado/Mouse',
    teclado: 'Teclado', mouse: 'Mouse', charger: 'Cargador', cargador: 'Cargador',
    chip: 'Chip/SIM', tablet: 'Tablet', servidor: 'Servidor', switch: 'Switch',
    impresora: 'Impresora', ups: 'UPS', scanner: 'Escáner', proyector: 'Proyector',
};
const deviceLabel = (type) => DEVICE_TYPE_LABELS[(type || '').toLowerCase()] || type;

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const DevolucionesPage = () => {
    const notification = useNotification();
    const { showNotification, startDownload, updateDownloadProgress, finishDownload, failDownload } = notification;
    const { token } = useAuth();

    const [devoluciones, setDevoluciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 20;

    const [uploadModalDev, setUploadModalDev] = useState(null);

    useEffect(() => {
        const delay = searchTerm ? 400 : 0;
        const t = setTimeout(() => fetchDevoluciones(1), delay);
        return () => clearTimeout(t);
    }, [searchTerm, dateFrom]);

    const fetchDevoluciones = async (page = currentPage) => {
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const params = { skip, limit: itemsPerPage };
            if (searchTerm) params.search = searchTerm;
            if (dateFrom) params.date_from = dateFrom;
            const res = await axios.get(`${API_URL}/assignments/returns/`, { params });
            setDevoluciones(res.data.items || []);
            setTotalItems(res.data.total || 0);
            setTotalPages(res.data.pages || 0);
            setCurrentPage(page);
        } catch (err) {
            console.error(err);
            showNotification('Error al cargar devoluciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (devId, empName) => {
        setDownloadingId(devId);
        const defaultFilename = `ACTA_DEVOLUCION_${empName.replace(/\s+/g, '_')}.docx`;
        try {
            await downloadFileWithProgress({
                url: `${API_URL}/assignments/${devId}/acta`,
                filename: defaultFilename,
                label: defaultFilename,
                params: { acta_type: 'return', token },
                getFilename: (response) => {
                    const disposition = response.headers['content-disposition'];
                    if (disposition) {
                        const match = disposition.match(/filename="?([^"]+)"?/);
                        if (match) return match[1];
                    }
                    return defaultFilename;
                },
                notification: { startDownload, updateDownloadProgress, finishDownload, failDownload, showNotification },
            });
            showNotification('Acta generada correctamente', 'success');
        } catch {
            // downloadFileWithProgress ya muestra la notificación de error
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <RotateCcw className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                        Devoluciones
                    </h2>
                    <p className="text-muted text-sm mt-1">
                        {totalItems} devolución{totalItems !== 1 ? 'es' : ''} registrada{totalItems !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <label className="text-muted text-xs whitespace-nowrap">Desde</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar empleado, equipo, serie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader className="w-8 h-8 text-orange-500 dark:text-orange-400 animate-spin" />
                    </div>
                ) : devoluciones.length === 0 ? (
                    <div className="text-center py-20 text-muted">
                        <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">Sin devoluciones registradas</p>
                        <p className="text-sm mt-1">
                            {dateFrom ? 'Prueba cambiando la fecha o haz clic en "Ver todas".' : 'Las devoluciones aparecerán aquí cuando se elimine un equipo de una asignación.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-bg/50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Empleado</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Equipo</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Serie</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Fecha Devolución</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Acta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {devoluciones.map((dev) => (
                                    <tr key={dev.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                                        {/* Empleado */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{dev.employee_name}</p>
                                                    <p className="text-xs text-muted flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {dev.employee_company || '—'}
                                                        {dev.employee_dni && <span className="ml-1">· DNI {dev.employee_dni}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Equipo */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-muted flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {dev.device_brand} {dev.device_model}
                                                    </p>
                                                    <p className="text-xs text-muted">{deviceLabel(dev.device_type)}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Serie */}
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-mono text-slate-600 dark:text-slate-300">
                                                {dev.device_serial || '—'}
                                            </span>
                                            {dev.device_inventory_code && (
                                                <p className="text-xs text-slate-500 mt-0.5">Inv: {dev.device_inventory_code}</p>
                                            )}
                                        </td>

                                        {/* Fecha */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                {formatDate(dev.returned_date)}
                                            </div>
                                        </td>

                                        {/* Acta */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownload(dev.id, dev.employee_name)}
                                                    disabled={downloadingId === dev.id}
                                                    className="inline-flex items-center justify-center gap-1.5 w-36 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    {downloadingId === dev.id ? (
                                                        <Loader className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Download className="w-3.5 h-3.5" />
                                                    )}
                                                    Descargar Acta
                                                </button>
                                                <div className="w-9 flex justify-center">
                                                    {dev.has_signed_acta ? (
                                                        <button
                                                            onClick={() => setUploadModalDev(dev)}
                                                            title="Gestionar acta firmada"
                                                            className="inline-flex items-center justify-center p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
                                                        >
                                                            <Settings className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setUploadModalDev(dev)}
                                                            title="Subir acta firmada"
                                                            className="inline-flex items-center justify-center p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(p) => { fetchDevoluciones(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
            )}

            {/* Upload/Manage signed return acta modal */}
            {uploadModalDev && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                                    Acta de Devolución Firmada
                                </h3>
                                <p className="text-muted text-sm mt-1">
                                    {uploadModalDev.employee_name} · {uploadModalDev.device_brand} {uploadModalDev.device_model}
                                </p>
                            </div>
                            <button onClick={() => setUploadModalDev(null)} className="text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <PdfUploader
                                uploadUrl={`${API_URL}/assignments/${uploadModalDev.id}/upload-return-acta`}
                                downloadUrl={`${API_URL}/assignments/${uploadModalDev.id}/download-return-acta`}
                                deleteUrl={`${API_URL}/assignments/${uploadModalDev.id}/delete-return-acta`}
                                currentPdfPath={uploadModalDev.return_acta_path}
                                label="Acta de Devolución Firmada (PDF)"
                                onUploadSuccess={() => { setUploadModalDev(null); fetchDevoluciones(currentPage); }}
                                onDeleteSuccess={() => { setUploadModalDev(null); fetchDevoluciones(currentPage); }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DevolucionesPage;
