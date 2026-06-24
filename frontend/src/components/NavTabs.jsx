import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown,
    Package,
    Users,
    DoorOpen,
    OctagonX,
    CircleDot,
    Mail,
    Anchor,
    FileText,
    DollarSign,
    RefreshCw,
    BarChart3,
    Zap,
    Key,
    Disc,
    ClipboardList,
    Monitor,
    Printer,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const NavTabs = ({ activeTab, setActiveTab }) => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const navRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && !navRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectTab = (tab) => {
        setOpenDropdown(null);
        setActiveTab(tab);
    };

    const toggle = (name) => setOpenDropdown(prev => prev === name ? null : name);

    return (
        <div className="flex gap-2 w-full md:w-auto items-center" ref={navRef}>
            {/* Gestión Dropdown */}
            <div className="relative">
                <button
                    onClick={() => toggle('gestion')}
                    className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['inventory', 'assignments', 'terminations', 'decommissions', 'hr_alerts'].includes(activeTab)
                        ? 'text-white bg-slate-700 dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                    Gestión
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'gestion' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'gestion' && (
                    <div className="absolute top-full left-0 mt-1 bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                        <button onClick={() => selectTab('inventory')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Package className="w-4 h-4" /> Inventario
                        </button>
                        <button onClick={() => selectTab('assignments')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'assignments' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Users className="w-4 h-4" /> Asignaciones
                        </button>
                        <button onClick={() => selectTab('terminations')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'terminations' ? 'text-white bg-red-500/20 border-l-2 border-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <DoorOpen className="w-4 h-4" /> Ceses
                        </button>
                        <button onClick={() => selectTab('decommissions')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'decommissions' ? 'text-white bg-red-500/20 border-l-2 border-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700 hover:bg-red-900/20'}`}>
                            <OctagonX className="w-4 h-4" /> Bajas
                        </button>
                        <button onClick={() => selectTab('ingresos')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'ingresos' ? 'text-white bg-emerald-500/20 border-l-2 border-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <CircleDot className="w-4 h-4" /> Ingresos
                        </button>
                        <button onClick={() => selectTab('hr_alerts')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'hr_alerts' ? 'text-white bg-amber-500/20 border-l-2 border-amber-400' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Mail className="w-4 h-4" /> Alertas RRHH
                        </button>
                        <button onClick={() => selectTab('lanchas')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 rounded-b-lg border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'lanchas' ? 'text-white bg-blue-500/20 border-l-2 border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Anchor className="w-4 h-4" /> Flota de Lanchas
                        </button>
                    </div>
                )}
            </div>

            {/* Documentos Dropdown */}
            <div className="relative">
                <button
                    onClick={() => toggle('documentos')}
                    className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['actas', 'sales', 'devoluciones'].includes(activeTab)
                        ? 'text-white bg-slate-700 dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                    Documentos
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'documentos' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'documentos' && (
                    <div className="absolute top-full left-0 mt-1 bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                        <button onClick={() => selectTab('actas')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'actas' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <FileText className="w-4 h-4" /> Actas
                        </button>
                        <button onClick={() => selectTab('sales')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'sales' ? 'text-white bg-green-500/20 border-l-2 border-green-500' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <DollarSign className="w-4 h-4" /> Ventas
                        </button>
                        <button onClick={() => selectTab('devoluciones')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 rounded-b-lg border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'devoluciones' ? 'text-white bg-orange-500/20 border-l-2 border-orange-500' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <RefreshCw className="w-4 h-4" /> Devoluciones
                        </button>
                    </div>
                )}
            </div>

            {/* Otros Dropdown */}
            <div className="relative">
                <button
                    onClick={() => toggle('otros')}
                    className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['analytics', 'powerbi', 'licenses', 'software', 'logs', 'active_directory', 'toner_requests'].includes(activeTab)
                        ? 'text-white bg-slate-700 dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                    Otros
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'otros' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'otros' && (
                    <div className="absolute top-full left-0 mt-1 bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                        <button onClick={() => selectTab('analytics')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'analytics' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <BarChart3 className="w-4 h-4" /> Analytics
                        </button>
                        <button onClick={() => selectTab('powerbi')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'powerbi' ? 'text-white bg-blue-500/20 border-l-2 border-blue-500' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Zap className="w-4 h-4" /> Power BI
                        </button>
                        <button onClick={() => selectTab('licenses')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'licenses' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Key className="w-4 h-4" /> Licencias
                        </button>
                        <button onClick={() => selectTab('software')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${activeTab === 'software' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Disc className="w-4 h-4" /> Software
                        </button>
                        <button onClick={() => selectTab('logs')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'logs' ? 'text-white bg-accent/20 border-l-2 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <ClipboardList className="w-4 h-4" /> Logs
                        </button>
                        <button onClick={() => selectTab('active_directory')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'active_directory' ? 'text-white bg-blue-500/20 border-l-2 border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Monitor className="w-4 h-4" /> Active Directory
                        </button>
                        <button onClick={() => selectTab('toner_requests')} className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 rounded-b-lg border-t border-slate-200 dark:border-slate-700/50 ${activeTab === 'toner_requests' ? 'text-white bg-violet-500/20 border-l-2 border-violet-400' : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            <Printer className="w-4 h-4" /> Tóner
                        </button>
                    </div>
                )}
            </div>

            <ThemeToggle />
        </div>
    );
};

export default NavTabs;
