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

// Navigation groups mirror the legacy NavTabs structure so no section is lost
// when switching from the top dropdown bar to the icon rail. Each group renders
// as a single rail icon that opens a flyout with its sections.
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
        'relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors';
    const railIdle =
        'text-slate-400 hover:text-accent hover:bg-accent/10 dark:text-slate-500 dark:hover:bg-slate-800';
    const railOn = 'text-accent bg-accent/10';

    return (
        <nav
            ref={railRef}
            aria-label="Navegación principal"
            className="flex flex-col items-center gap-1.5 w-16 shrink-0 h-screen sticky top-0 z-50 py-4 bg-surface border-r border-slate-200/70 dark:bg-slate-900 dark:border-slate-800"
        >
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center mb-3 shrink-0">
                <Monitor className="w-5 h-5" />
            </div>

            <button
                type="button"
                onClick={() => selectTab('inventory')}
                title="Dashboard"
                aria-label="Dashboard"
                className={`${railButton} ${activeTab === 'inventory' ? railOn : railIdle}`}
            >
                <LayoutDashboard className="w-5 h-5" />
            </button>

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
                        <div className="absolute left-full top-0 ml-2 z-[60] min-w-[190px] bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5">
                            <p className="px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                                {group.label}
                            </p>
                            {group.items.map((item) => (
                                <button
                                    key={item.tab}
                                    type="button"
                                    onClick={() => selectTab(item.tab)}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 transition-colors ${activeTab === item.tab
                                        ? 'text-accent bg-accent/10'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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

            <div className="mt-auto flex flex-col items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    title="Configuración"
                    aria-label="Configuración"
                    className={`${railButton} ${railIdle}`}
                >
                    <Settings className="w-5 h-5" />
                </button>
                <ThemeToggle />
                <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-medium mt-1">
                    VW
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;
