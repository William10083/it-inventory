import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Boxes,
    FolderOpen,
    Grid3x3,
    Settings,
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

const GROUPS = [
    {
        id: 'gestion',
        label: 'Gestión',
        Icon: Boxes,
        items: [
            { tab: 'inventory', label: 'Inventario', Icon: Package },
            { tab: 'assignments', label: 'Asignaciones', Icon: Users },
            { tab: 'terminations', label: 'Ceses', Icon: DoorOpen },
            { tab: 'decommissions', label: 'Bajas', Icon: OctagonX },
            { tab: 'ingresos', label: 'Ingresos', Icon: CircleDot },
            { tab: 'hr_alerts', label: 'Alertas RRHH', Icon: Mail },
            { tab: 'lanchas', label: 'Flota de Lanchas', Icon: Anchor },
        ],
    },
    {
        id: 'documentos',
        label: 'Documentos',
        Icon: FolderOpen,
        items: [
            { tab: 'actas', label: 'Actas', Icon: FileText },
            { tab: 'sales', label: 'Ventas', Icon: DollarSign },
            { tab: 'devoluciones', label: 'Devoluciones', Icon: RefreshCw },
        ],
    },
    {
        id: 'otros',
        label: 'Otros',
        Icon: Grid3x3,
        items: [
            { tab: 'analytics', label: 'Analytics', Icon: BarChart3 },
            { tab: 'powerbi', label: 'Power BI', Icon: Zap },
            { tab: 'licenses', label: 'Licencias', Icon: Key },
            { tab: 'software', label: 'Software', Icon: Disc },
            { tab: 'logs', label: 'Logs', Icon: ClipboardList },
            { tab: 'active_directory', label: 'Active Directory', Icon: Monitor },
            { tab: 'toner_requests', label: 'Tóner', Icon: Printer },
        ],
    },
];

const Sidebar = ({ activeTab, setActiveTab }) => {
    const [openFlyout, setOpenFlyout] = useState(null);
    const navigate = useNavigate();
    const railRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (railRef.current && !railRef.current.contains(event.target)) {
                setOpenFlyout(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectTab = (tab) => {
        setOpenFlyout(null);
        setActiveTab(tab);
    };

    const isGroupActive = (group) => group.items.some((item) => item.tab === activeTab);

    const railButton =
        'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200';
    const railIdle =
        'text-muted hover:text-accent hover:bg-accent/8';
    const railOn = 'text-accent bg-accent/12 shadow-soft';

    return (
        <nav
            ref={railRef}
            aria-label="Navegación principal"
            className="flex flex-col items-center gap-1.5 w-16 shrink-0 h-screen sticky top-0 z-50 py-4 glass-nav border-r border-slate-200/40 dark:border-slate-700/30"
        >
            {/* Logo / brand mark */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-violet-600 text-white flex items-center justify-center mb-3 shrink-0 shadow-soft-md">
                <Monitor className="w-5 h-5" />
            </div>

            {/* Dashboard direct button */}
            <button
                type="button"
                onClick={() => selectTab('inventory')}
                title="Dashboard"
                aria-label="Dashboard"
                className={`${railButton} ${activeTab === 'inventory' ? railOn : railIdle}`}
            >
                <LayoutDashboard className="w-5 h-5" />
            </button>

            <div className="w-8 h-px bg-slate-200/60 dark:bg-slate-700/40 my-1" />

            {/* Group buttons */}
            {GROUPS.map((group) => (
                <div key={group.id} className="relative">
                    <button
                        type="button"
                        onClick={() => setOpenFlyout((prev) => (prev === group.id ? null : group.id))}
                        title={group.label}
                        aria-label={group.label}
                        aria-expanded={openFlyout === group.id}
                        className={`${railButton} ${isGroupActive(group) ? railOn : railIdle}`}
                    >
                        <group.Icon className="w-5 h-5" />
                    </button>

                    {openFlyout === group.id && (
                        <div className="absolute left-full top-0 ml-2 z-[60] min-w-[200px] glass-card rounded-2xl shadow-soft-lg py-2 overflow-hidden">
                            <p className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                                {group.label}
                            </p>
                            {group.items.map((item) => (
                                <button
                                    key={item.tab}
                                    type="button"
                                    onClick={() => selectTab(item.tab)}
                                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center gap-3 transition-all duration-150 ${activeTab === item.tab
                                        ? 'text-accent bg-accent/10 font-medium'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-accent/5 hover:text-accent'
                                        }`}
                                >
                                    <item.Icon className="w-4 h-4 shrink-0" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Bottom section */}
            <div className="mt-auto flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => { setOpenFlyout(null); setActiveTab('settings'); }}
                    title="Configuración"
                    aria-label="Configuración"
                    className={`${railButton} ${activeTab === 'settings' ? railOn : railIdle}`}
                >
                    <Settings className="w-5 h-5" />
                </button>
                <ThemeToggle />
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-violet-500/20 text-accent flex items-center justify-center text-xs font-semibold ring-1 ring-accent/20">
                    VW
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;
