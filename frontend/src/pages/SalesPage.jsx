import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Download, Trash2, Upload, Search, User, Calendar, Package, FileText } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import SaleModal from '../components/SaleModal';
import PdfUploader from '../components/PdfUploader';
import Pagination from '../components/Pagination';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SalesPage = () => {
    const { showNotification, showConfirm } = useNotification();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [expandedSales, setExpandedSales] = useState({});
    const [generatingId, setGeneratingId] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [stats, setStats] = useState({ total_revenue: 0, total_devices_sold: 0 });
    const itemsPerPage = 20;

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/sales/stats`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        const delay = searchTerm ? 500 : 0;
        const handler = setTimeout(() => {
            fetchSales(1);
        }, delay);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchSales = async (page = currentPage) => {
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const params = { skip, limit: itemsPerPage };
            if (searchTerm) params.search = searchTerm;

            const response = await axios.get(`${API_URL}/sales/`, { params });
            setSales(response.data.items || []);
            setTotalItems(response.data.total || 0);
            setTotalPages(response.data.pages || 0);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching sales:', error);
            showNotification('Error al cargar ventas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        fetchSales(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteSale = async (saleId) => {
        const confirmed = await showConfirm(
            'Eliminar Venta',
            '¿Estás seguro de eliminar esta venta? Los dispositivos volverán a estar disponibles.'
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/sales/${saleId}`);
            showNotification('Venta eliminada exitosamente', 'success');
            fetchSales();
        } catch (error) {
            console.error('Error deleting sale:', error);
            showNotification('Error al eliminar venta', 'error');
        }
    };

    const toggleExpand = (saleId) => {
        setExpandedSales(prev => ({
            ...prev,
            [saleId]: !prev[saleId]
        }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatPrice = (price) => {
        return price ? `S/. ${price.toLocaleString()}` : '-';
    };

    const handleGenerateActa = async (saleId, buyerName) => {
        setGeneratingId(saleId);
        try {
            const response = await axios.post(
                `${API_URL}/sales/${saleId}/generate-acta`,
                {},
                { responseType: 'blob' }
            );

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Acta_Venta_${buyerName.replace(/\s+/g, '_')}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            showNotification('Acta generada y descargada correctamente', 'success');
        } catch (error) {
            console.error('Error creating acta:', error);
            if (error.response && error.response.status === 400) {
                // Likely missing template
                showNotification('Error: Asegúrate de tener una plantilla "Acta de Venta" subida en Templates.', 'error');
            } else {
                showNotification('Error al generar el acta', 'error');
            }
        } finally {
            setGeneratingId(null);
        }
    };



    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold text-white">Ventas de Equipos</h2>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Gestión de ventas de laptops, monitores y otros equipos
                        </p>
                    </div>
                    {/* Stats Summary */}
                    <div className="flex items-center gap-6 mr-6">
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Recaudado</p>
                            <p className="text-2xl font-bold text-green-400">
                                {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(stats.total_revenue || 0)}
                            </p>
                        </div>
                        <div className="w-px h-10 bg-slate-700"></div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold">Equipos Vendidos</p>
                            <p className="text-2xl font-bold text-blue-400">
                                {stats.total_devices_sold || 0}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-700">
                    <button
                        onClick={() => {
                            window.open(`${API_URL}/export/sales/excel`, '_blank');
                            showNotification('Exportando ventas a Excel...', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar a Excel
                    </button>
                    <button
                        onClick={() => setIsSaleModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Venta
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o DNI del comprador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Sales List */}
            <div className="space-y-4">
                {loading && sales.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-slate-400">Cargando ventas...</div>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="bg-slate-800/50 p-8 rounded-lg border border-slate-700 text-center">
                        <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No se encontraron ventas</p>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div
                            key={sale.id}
                            className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
                        >
                            {/* Sale Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <User className="w-5 h-5 text-blue-400" />
                                            <h3 className="text-lg font-semibold text-white">
                                                {sale.buyer_name}
                                            </h3>
                                            <span className="text-sm text-slate-400">
                                                DNI: {sale.buyer_dni}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(sale.sale_date)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Package className="w-4 h-4" />
                                                {sale.devices_count} dispositivo(s)
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                {formatPrice(sale.sale_price)}
                                            </div>
                                            {sale.payment_method && (
                                                <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                                    {sale.payment_method}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleExpand(sale.id)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                                        >
                                            {expandedSales[sale.id] ? 'Ocultar' : 'Ver Detalles'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSale(sale.id)}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedSales[sale.id] && (
                                <div className="border-t border-slate-700 p-4 bg-slate-900/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {sale.buyer_email && (
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Email</div>
                                                <div className="text-sm text-slate-300">{sale.buyer_email}</div>
                                            </div>
                                        )}
                                        {sale.buyer_phone && (
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Teléfono</div>
                                                <div className="text-sm text-slate-300">{sale.buyer_phone}</div>
                                            </div>
                                        )}
                                        {sale.buyer_address && (
                                            <div className="md:col-span-2">
                                                <div className="text-xs text-slate-500 mb-1">Dirección</div>
                                                <div className="text-sm text-slate-300">{sale.buyer_address}</div>
                                            </div>
                                        )}
                                        {sale.notes && (
                                            <div className="md:col-span-2">
                                                <div className="text-xs text-slate-500 mb-1">Notas</div>
                                                <div className="text-sm text-slate-300">{sale.notes}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Generate Acta Section */}
                                    <div className="border-t border-slate-700 pt-4 mb-4">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                            <FileText className="w-3 h-3" />
                                            Generar Acta de Venta
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <button
                                                onClick={() => handleGenerateActa(sale.id, sale.buyer_name)}
                                                disabled={generatingId === sale.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            >
                                                {generatingId === sale.id ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Generando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" />
                                                        Descargar Acta Generada
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                Genera un documento Word basado en la plantilla "Acta de Venta" con los datos de esta venta.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acta Upload */}
                                    <div className="border-t border-slate-700 pt-4">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                            <Upload className="w-3 h-3" />
                                            Acta de Venta Firmada
                                        </div>
                                        <PdfUploader
                                            key={`sale-${sale.id}-${sale.acta_path || 'empty'}`}
                                            uploadUrl={`${API_URL}/sales/${sale.id}/upload-acta`}
                                            downloadUrl={`${API_URL}/sales/${sale.id}/download-acta`}
                                            deleteUrl={`${API_URL}/sales/${sale.id}/delete-acta`}
                                            currentPdfPath={sale.acta_path}
                                            label="Acta de Venta Firmada"
                                            onUploadSuccess={() => fetchSales()}
                                            onDeleteSuccess={() => fetchSales()}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Sale Modal */}
            <SaleModal
                isOpen={isSaleModalOpen}
                onClose={() => setIsSaleModalOpen(false)}
                onSuccess={() => fetchSales(1)}
            />
        </div>
    );
};

export default SalesPage;
