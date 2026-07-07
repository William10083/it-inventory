import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onAlertClick, notificationCount = 0 }) => {
    const navigate = useNavigate();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [username, setUsername] = useState('');
    const menuRef = useRef(null);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <nav className="glass-nav border-b border-slate-200/40 dark:border-slate-700/30 sticky top-0 z-40">
            <div className="px-6">
                <div className="flex items-center justify-end h-16">
                    <div className="flex items-center gap-2">
                        {/* Alerts */}
                        {onAlertClick && (
                            <button
                                onClick={onAlertClick}
                                className="relative p-2.5 rounded-xl text-muted hover:text-accent hover:bg-accent/8 transition-all duration-200"
                                title="Alertas"
                            >
                                <Bell className="w-5 h-5" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-danger to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-soft">
                                        {notificationCount > 99 ? '99+' : notificationCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* User menu */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent/8 transition-all duration-200 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-violet-500 flex items-center justify-center shadow-soft">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-accent hidden sm:block transition-colors">
                                    {username || 'Usuario'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-muted transition-transform hidden sm:block ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-60 glass-card rounded-2xl shadow-soft-lg overflow-hidden">
                                    <div className="px-4 py-3.5 border-b border-slate-200/50 dark:border-slate-700/40">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{username || 'Usuario'}</p>
                                        <p className="text-xs text-muted mt-0.5">Administrador</p>
                                    </div>
                                    <div className="py-1.5">
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); navigate('/settings'); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-accent/8 hover:text-accent transition-all duration-150 flex items-center gap-3"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Configuración
                                        </button>
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10 transition-all duration-150 flex items-center gap-3"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
