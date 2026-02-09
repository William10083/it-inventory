import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Calendar, User, Package, AlertTriangle, Trash2, Laptop, Monitor, Keyboard, Briefcase, Headphones, Smartphone, Upload } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import Pagination from '../components/Pagination';
import PdfUploader from '../components/PdfUploader';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TerminationsPage = () => {
    const { showNotification, showConfirm } = useNotification();
    const [terminations, setTerminations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCards, setExpandedCards] = useState({}); // Track which cards are expanded

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 20;

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTerminations(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchTerminations = async (page = currentPage) => {
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            const response = await axios.get(`${API_URL}/terminations/`, {
                params: {
                    skip,
                    limit: itemsPerPage,
                    search: searchTerm || undefined
                }
            });

            // Handle paginated response
            if (response.data.items) {
                setTerminations(response.data.items);
                setTotalItems(response.data.total);
                setTotalPages(response.data.pages);
            } else {
                // Fallback for old format
                setTerminations(response.data);
            }
        } catch (error) {
            console.error("Error fetching terminations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchTerminations(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteTermination = async (id) => {
        const confirmed = await showConfirm(
            'Eliminar Cese',
            '¿Estás seguro de eliminar este cese? Esto reactivará al empleado y todas sus asignaciones devueltas.'
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/terminations/${id}`);
            showNotification('Cese eliminado y empleado reactivado correctamente', 'success');
            fetchTerminations();
        } catch (error) {
            console.error('Error deleting termination:', error);
            showNotification(error.response?.data?.detail || 'Error al eliminar cese', 'error');
        }
    };

    const downloadActa = async (terminationId, type) => {
        try {
            const endpoint = type === 'computer' ? 'acta-computer' : 'acta-mobile';
            window.open(`${API_URL}/terminations/${terminationId}/${endpoint}`, '_blank');
        } catch (err) {
            console.error("Download failed", err);
            showNotification("Error al descargar el acta", 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-PE');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Ceses de Empleados</h1>
                    <p className="text-slate-400 mt-1">Historial de terminaciones laborales</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                    <div className="text-red-400 font-bold text-2xl">{totalItems}</div>
                    <div className="text-red-300 text-xs uppercase">Total Ceses</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Buscar por nombre, DNI o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Loading / List Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Cargando ceses...</div>
                </div>
            ) : (
                <>
                    {/* Terminations List */}
                    <div className="space-y-4">
                        {terminations.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                {searchTerm ? 'No se encontraron resultados' : 'No hay ceses registrados'}
                            </div>
                        ) : (
                            terminations.map((termination) => {
                                const isExpanded = expandedCards[termination.id] || false;
                                const toggleDetails = () => {
                                    setExpandedCards(prev => ({
                                        ...prev,
                                        [termination.id]: !prev[termination.id]
                                    }));
                                };

                                return (
                                    <div key={termination.id} className="bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-all">
                                        {/* Main Card Content */}
                                        <div className="p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                {/* Employee Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-base font-bold text-white truncate">{termination.employee.full_name}</h3>
                                                        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase flex-shrink-0">
                                                            Cesado
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                                        <span>DNI: {termination.employee.dni || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(termination.termination_date)}</span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Details Button */}
                                                    {termination.returned_devices && termination.returned_devices.length > 0 && (
                                                        <button
                                                            onClick={toggleDetails}
                                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="Ver detalle de equipos"
                                                        >
                                                            <Package className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteTermination(termination.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Eliminar cese y reactivar empleado"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Download Actas - Always visible */}
                                            <div className="flex gap-2 mt-3">
                                                {termination.computer_acta_available && (
                                                    <button
                                                        onClick={() => downloadActa(termination.id, 'computer')}
                                                        className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Acta Computadora
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {termination.mobile_acta_available && (
                                                    <button
                                                        onClick={() => downloadActa(termination.id, 'mobile')}
                                                        className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Acta Celular
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable Details Section */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-700 bg-slate-900/30 p-4 space-y-3">
                                                {/* Returned Devices */}
                                                {termination.returned_devices && termination.returned_devices.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                                            <Package className="w-3 h-3" /> Equipos Retornados ({termination.equipment_returned_count})
                                                        </p>
                                                        <div className="space-y-3">
                                                            {termination.returned_devices.map((device, idx) => {
                                                                // Handle both old string format and new object format
                                                                const deviceType = typeof device === 'string' ? 'unknown' : (device.type || 'unknown');
                                                                const lower = deviceType.toLowerCase();
                                                                let Icon = Package;
                                                                let colorClass = "text-slate-400";
                                                                let typeLabel = "EQUIPO";

                                                                // Determine icon, color and type based on device type
                                                                if (lower.includes('laptop')) {
                                                                    Icon = Laptop;
                                                                    colorClass = "text-blue-400";
                                                                    typeLabel = "LAPTOP";
                                                                } else if (lower.includes('monitor')) {
                                                                    Icon = Monitor;
                                                                    colorClass = "text-cyan-400";
                                                                    typeLabel = "MONITOR";
                                                                } else if (lower.includes('kit') || lower.includes('teclado') || lower.includes('mouse')) {
                                                                    Icon = Keyboard;
                                                                    colorClass = "text-purple-400";
                                                                    typeLabel = "KIT TECLADO/MOUSE";
                                                                } else if (lower.includes('mochila') || lower.includes('backpack')) {
                                                                    Icon = Briefcase;
                                                                    colorClass = "text-yellow-400";
                                                                    typeLabel = "MOCHILA";
                                                                } else if (lower.includes('auric') || lower.includes('headphone')) {
                                                                    Icon = Headphones;
                                                                    colorClass = "text-pink-400";
                                                                    typeLabel = "AURICULARES";
                                                                } else if (lower.includes('mobile') || lower.includes('celular')) {
                                                                    Icon = Smartphone;
                                                                    colorClass = "text-green-400";
                                                                    typeLabel = "CELULAR";
                                                                }

                                                                // Extract device info
                                                                const brand = typeof device === 'string' ? '' : (device.brand || '');
                                                                const model = typeof device === 'string' ? '' : (device.model || '');
                                                                const serial = typeof device === 'string' ? '' : (device.serial_number || '');
                                                                const hostname = typeof device === 'string' ? '' : (device.hostname || '');
                                                                const imei = typeof device === 'string' ? '' : (device.imei || '');
                                                                const phoneNumber = typeof device === 'string' ? '' : (device.phone_number || '');

                                                                const displayName = typeof device === 'string' ? device : `${brand} ${model}`.trim();

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
                                                                    >
                                                                        {/* Header */}
                                                                        <div className="px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
                                                                            <Icon className={`w-4 h-4 ${colorClass}`} />
                                                                            <span className="text-xs font-bold text-slate-400 uppercase">{typeLabel}</span>
                                                                        </div>

                                                                        {/* Content */}
                                                                        <div className="p-4">
                                                                            <div className="flex items-start gap-4">
                                                                                <div className={`p-3 rounded-lg bg-slate-900/50 ${colorClass} flex-shrink-0`}>
                                                                                    <Icon className="w-8 h-8" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                                    <div className="text-sm font-bold text-white">{brand} {model}</div>
                                                                                    {serial && (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            <span className="text-slate-500">SN:</span> {serial}
                                                                                        </div>
                                                                                    )}
                                                                                    {hostname && (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            <span className="text-slate-500">Host:</span> {hostname}
                                                                                        </div>
                                                                                    )}
                                                                                    {imei && (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            <span className="text-slate-500">IMEI:</span> {imei}
                                                                                        </div>
                                                                                    )}
                                                                                    {phoneNumber && (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            <span className="text-slate-500">Número:</span> {phoneNumber}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Reason */}
                                                {termination.reason && (
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                                                            <AlertTriangle className="w-3 h-3" /> Razón
                                                        </div>
                                                        <div className="text-sm text-slate-300">{termination.reason}</div>
                                                    </div>
                                                )}

                                                {/* Observations */}
                                                {termination.observations && (
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Observaciones</div>
                                                        <div className="text-sm text-slate-300">{termination.observations}</div>
                                                    </div>
                                                )}

                                                {/* Upload Signed Actas */}
                                                <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
                                                    <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                                        <Upload className="w-3 h-3" /> Subir Actas Firmadas
                                                    </div>

                                                    {/* Computer Acta Upload */}
                                                    {termination.computer_acta_available && (
                                                        <PdfUploader
                                                            key={`computer-${termination.id}-${termination.computer_acta_path || 'empty'}`}
                                                            uploadUrl={`${API_URL}/terminations/${termination.id}/upload-computer-acta`}
                                                            downloadUrl={`${API_URL}/terminations/${termination.id}/download-computer-acta`}
                                                            deleteUrl={`${API_URL}/terminations/${termination.id}/delete-computer-acta`}
                                                            currentPdfPath={termination.computer_acta_path}
                                                            label="Acta de Computadora Firmada"
                                                            onUploadSuccess={async () => {
                                                                await fetchTerminations(currentPage);
                                                            }}
                                                            onDeleteSuccess={async () => {
                                                                await fetchTerminations(currentPage);
                                                            }}
                                                        />
                                                    )}

                                                    {/* Mobile Acta Upload */}
                                                    {termination.mobile_acta_available && (
                                                        <PdfUploader
                                                            key={`mobile-${termination.id}-${termination.mobile_acta_path || 'empty'}`}
                                                            uploadUrl={`${API_URL}/terminations/${termination.id}/upload-mobile-acta`}
                                                            downloadUrl={`${API_URL}/terminations/${termination.id}/download-mobile-acta`}
                                                            deleteUrl={`${API_URL}/terminations/${termination.id}/delete-mobile-acta`}
                                                            currentPdfPath={termination.mobile_acta_path}
                                                            label="Acta de Celular Firmada"
                                                            onUploadSuccess={async () => {
                                                                await fetchTerminations(currentPage);
                                                            }}
                                                            onDeleteSuccess={async () => {
                                                                await fetchTerminations(currentPage);
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
};

export default TerminationsPage;
