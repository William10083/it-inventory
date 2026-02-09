import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, AlertTriangle, AlertOctagon, Info, X, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AlertsPanel = ({ isOpen, onClose }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/alerts/`);
            setAlerts(res.data);
        } catch (err) {
            console.error("Error fetching alerts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const criticalAlerts = alerts.filter(a => a.priority === 'critical');
    const warningAlerts = alerts.filter(a => a.priority === 'warning');
    const suggestionAlerts = alerts.filter(a => a.priority === 'suggestion');

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-400" />
                    Centro de Alertas
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAlerts}
                        className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-64px)] p-4 space-y-6">

                {alerts.length === 0 && !loading && (
                    <div className="text-center py-10 text-slate-500">
                        <div className="bg-slate-800/50 rounded-full p-4 mb-3 inline-block">
                            <Bell className="w-8 h-8 text-slate-600" />
                        </div>
                        <p>No hay alertas activas.</p>
                        <p className="text-xs mt-1">¡Buen trabajo manteniendo el inventario!</p>
                    </div>
                )}

                {/* CRITICAL */}
                {criticalAlerts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertOctagon className="w-3 h-3" />
                            Requiere Atención ({criticalAlerts.length})
                        </h3>
                        {criticalAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} color="red" icon={AlertOctagon} />
                        ))}
                    </div>
                )}

                {/* WARNING */}
                {warningAlerts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            Advertencias ({warningAlerts.length})
                        </h3>
                        {warningAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} color="amber" icon={AlertTriangle} />
                        ))}
                    </div>
                )}

                {/* SUGGESTIONS */}
                {suggestionAlerts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            Sugerencias ({suggestionAlerts.length})
                        </h3>
                        {suggestionAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} color="blue" icon={Info} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AlertCard = ({ alert, color, icon: Icon }) => {
    // Dynamic classes based on color prop
    const bgClass = {
        red: 'bg-red-500/10 border-red-500/30',
        amber: 'bg-amber-500/10 border-amber-500/30',
        blue: 'bg-blue-500/10 border-blue-500/30'
    }[color];

    const textClass = {
        red: 'text-red-400',
        amber: 'text-amber-400',
        blue: 'text-blue-400'
    }[color];

    return (
        <div className={`p-3 rounded-lg border ${bgClass} transition-all hover:scale-[1.02]`}>
            <div className="flex gap-3">
                <div className={`mt-0.5 ${textClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className={`text-sm font-bold text-white mb-1`}>{alert.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        {alert.message}
                    </p>
                    {alert.action_link && (
                        <a href="#" className={`text-xs ${textClass} hover:underline mt-2 inline-block font-medium`}>
                            Ver detalles →
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertsPanel;
