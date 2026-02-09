import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, RotateCcw, Filter, AlertCircle, UserCircle, Clock, FileText, CheckCircle, XCircle, History, Package, Users } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedLog, setExpandedLog] = useState(null);
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const { showNotification, showConfirm } = useNotification();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Token is already set in axios.defaults by AuthContext
            const params = {};
            if (filterAction) params.action = filterAction;
            if (filterEntity) params.entity_type = filterEntity;

            const res = await axios.get(`${API_URL}/audit-logs/`, { params });
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filterAction, filterEntity]);

    const handleRevert = async (logId) => {
        const confirmed = await showConfirm('¿Está seguro de que desea revertir esta acción? Esto deshará los cambios realizados.');
        if (!confirmed) {
            return;
        }

        try {
            // Token is already set in axios.defaults by AuthContext
            await axios.post(`${API_URL}/audit-logs/${logId}/revert`);
            showNotification('✓ Acción revertida exitosamente', 'success');
            fetchLogs();  // Refresh logs
        } catch (err) {
            console.error('Error reverting action:', err);
            showNotification('Error al revertir: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const viewDetails = async (logId) => {
        if (expandedLog === logId) {
            setExpandedLog(null);
            return;
        }

        try {
            // Token is already set in axios.defaults by AuthContext
            const res = await axios.get(`${API_URL}/audit-logs/${logId}`);
            setExpandedLog(logId);
            // Store detailed log info for rendering
            setLogs(prevLogs =>
                prevLogs.map(log =>
                    log.id === logId ? { ...log, detailsData: res.data } : log
                )
            );
        } catch (err) {
            console.error('Error fetching log details:', err);
        }
    };

    const getActionIcon = (action) => {
        if (action.includes('CREATE')) return <CheckCircle className="w-4 h-4 text-green-400" />;
        if (action.includes('UPDATE')) return <Clock className="w-4 h-4 text-yellow-400" />;
        if (action.includes('DELETE')) return <XCircle className="w-4 h-4 text-red-400" />;
        if (action.includes('REVERT')) return <RotateCcw className="w-4 h-4 text-blue-400" />;
        return <FileText className="w-4 h-4 text-slate-400" />;
    };

    const getActionColor = (action) => {
        if (action.includes('CREATE')) return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (action.includes('UPDATE')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
        if (action.includes('DELETE')) return 'bg-red-500/10 text-red-400 border-red-500/30';
        if (action.includes('REVERT')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    };

    const getEntityIcon = (entityType) => {
        switch (entityType) {
            case 'device': return <Package className="w-4 h-4 text-blue-400" />;
            case 'employee': return <Users className="w-4 h-4 text-green-400" />;
            case 'assignment': return <FileText className="w-4 h-4 text-purple-400" />;
            default: return <FileText className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                        <History className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Registro de Auditoría</h2>
                        <p className="text-slate-400 text-sm">Historial completo de acciones con capacidad de reversión</p>
                    </div>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-sm">Total de registros: </span>
                    <span className="text-white font-bold">{logs.length}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-slate-400 mb-1 block">Filtrar por Acción</label>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    >
                        <option value="">Todas las acciones</option>
                        <option value="CREATE">Creaciones</option>
                        <option value="UPDATE">Actualizaciones</option>
                        <option value="DELETE">Eliminaciones</option>
                        <option value="ASSIGN">Asignaciones</option>
                        <option value="REVERT">Reversiones</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-slate-400 mb-1 block">Filtrar por Entidad</label>
                    <select
                        value={filterEntity}
                        onChange={(e) => setFilterEntity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    >
                        <option value="">Todas las entidades</option>
                        <option value="device">Dispositivos</option>
                        <option value="employee">Empleados</option>
                        <option value="assignment">Asignaciones</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchLogs}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Cargando...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No se encontraron registros de auditoría</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-200 border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Fecha/Hora</th>
                                    <th className="px-4 py-3">Usuario</th>
                                    <th className="px-4 py-3">Acción</th>
                                    <th className="px-4 py-3">Entidad</th>
                                    <th className="px-4 py-3">Detalles</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {logs.map(log => (
                                    <React.Fragment key={log.id}>
                                        <tr className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                                        {log.user_username ? log.user_username.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="text-white text-sm">{log.user_username || 'Sistema'}</div>
                                                        {log.user_fullname && (
                                                            <div className="text-xs text-slate-500">{log.user_fullname}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 text-slate-300">
                                                    {getEntityIcon(log.entity_type)}
                                                    <span className="capitalize">{log.entity_type || '-'}</span>
                                                    {log.entity_id && <span className="text-slate-500">#{log.entity_id}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 max-w-md truncate">
                                                {log.details || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.reverted_at ? (
                                                    <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit" title={`Revertido el ${new Date(log.reverted_at).toLocaleString('es-PE')}`}>
                                                        <RotateCcw className="w-3 h-3" />
                                                        Revertido
                                                    </span>
                                                ) : log.is_revertible ? (
                                                    <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/30" title="Revertible - menos de 7 días y tiene snapshot">
                                                        Revertible
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-xs bg-slate-500/10 text-slate-400 border border-slate-500/30" title="No revertible - más de 7 días, sin snapshot o acción permanente">
                                                        No revertible
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => viewDetails(log.id)}
                                                        className="text-slate-400 hover:text-white transition-colors p-1"
                                                        title="Ver detalles"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {log.is_revertible && !log.reverted_at && (
                                                        <button
                                                            onClick={() => handleRevert(log.id)}
                                                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                                            title="Revertir acción"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded details row */}
                                        {expandedLog === log.id && log.detailsData && (
                                            <tr className="bg-slate-800/50">
                                                <td colSpan="7" className="px-4 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {log.detailsData.snapshot_before && (
                                                            <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                                                <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    ANTES DEL CAMBIO
                                                                </h4>
                                                                <pre className="text-xs text-slate-300 overflow-auto max-h-48">
                                                                    {JSON.stringify(log.detailsData.snapshot_before, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.detailsData.snapshot_after && (
                                                            <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                                                <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    DESPUÉS DEL CAMBIO
                                                                </h4>
                                                                <pre className="text-xs text-slate-300 overflow-auto max-h-48">
                                                                    {JSON.stringify(log.detailsData.snapshot_after, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {log.detailsData.reverted_by_username && (
                                                        <div className="mt-2 text-xs text-slate-400">
                                                            Revertido por: <span className="text-white">{log.detailsData.reverted_by_username}</span> el {formatDate(log.detailsData.reverted_at)}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogsPage;
