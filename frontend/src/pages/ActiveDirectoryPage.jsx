import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, User, Mail, Phone, Building2, Briefcase, ShieldCheck, ShieldOff, Monitor } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ActiveDirectoryPage = () => {
    const { showNotification } = useNotification();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [onlyEnabled, setOnlyEnabled] = useState(true);
    const [total, setTotal] = useState(0);
    const debounceRef = useRef(null);

    // AD integration pending — no calls made
    const fetchUsers = async () => {};

    const departments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();

    const grouped = departments.length > 0
        ? departments.reduce((acc, dept) => {
            acc[dept] = users.filter(u => u.department === dept);
            return acc;
        }, { 'Sin área': users.filter(u => !u.department) })
        : { 'Todos': users };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                        Active Directory
                    </h2>
                    <p className="text-muted text-sm mt-1">transtotal.net</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Toggle activos/todos */}
                    <button
                        onClick={() => setOnlyEnabled(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                            onlyEnabled
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-muted'
                        }`}
                    >
                        {onlyEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        {onlyEnabled ? 'Solo activos' : 'Todos'}
                    </button>

                    {/* Search */}
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar nombre, usuario, área..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            {(
                <div className="text-center py-32 text-muted">
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">Integración en configuración</p>
                    <p className="text-sm mt-2">La conexión con Active Directory estará disponible próximamente.</p>
                </div>
            ) || (
                <div className="space-y-6">
                    {Object.entries(grouped)
                        .filter(([, list]) => list.length > 0)
                        .sort(([a], [b]) => a === 'Sin área' ? 1 : b === 'Sin área' ? -1 : a.localeCompare(b))
                        .map(([dept, list]) => (
                            <div key={dept}>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {dept}
                                    <span className="text-muted">({list.length})</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {list.map(user => (
                                        <div
                                            key={user.username}
                                            className="bg-surface/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex gap-3 hover:border-blue-500/40 transition-colors"
                                        >
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.enabled ? 'bg-blue-500/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                <User className={`w-5 h-5 ${user.enabled ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'}`} />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                        {user.display_name || user.username}
                                                    </p>
                                                    {!user.enabled && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/30 flex-shrink-0">
                                                            Deshabilitado
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono mb-2">{user.username}</p>

                                                <div className="space-y-1">
                                                    {user.title && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted">
                                                            <Briefcase className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{user.title}</span>
                                                        </div>
                                                    )}
                                                    {user.email && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted">
                                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{user.email}</span>
                                                        </div>
                                                    )}
                                                    {(user.phone || user.mobile) && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted">
                                                            <Phone className="w-3 h-3 flex-shrink-0" />
                                                            <span>{user.phone || user.mobile}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};

export default ActiveDirectoryPage;
