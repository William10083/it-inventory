import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, ArrowLeft, Save, Eye, EyeOff, Users, Plus, ToggleLeft, ToggleRight, Mail, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SettingsPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Profile data
    const [profileData, setProfileData] = useState({
        username: '',
        full_name: '',
        dni: ''
    });

    // Password change data
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Email config
    const [emailConfig, setEmailConfig] = useState({ smtp_email: '', smtp_password: '', smtp_server: 'smtp.office365.com', smtp_port: 587 });
    const [emailConfigured, setEmailConfigured] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);

    // Users management
    const [usersList, setUsersList] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showTempPassword, setShowTempPassword] = useState(false);
    const [newUserData, setNewUserData] = useState({ username: '', full_name: '', temporary_password: '' });
    const [creatingUser, setCreatingUser] = useState(false);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (user) {
            setProfileData({
                username: user.username || '',
                full_name: user.full_name || '',
                dni: user.dni || ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'users' && isAdmin) loadUsers();
        if (activeTab === 'email') loadEmailConfig();
    }, [activeTab]);

    const loadEmailConfig = async () => {
        try {
            const res = await axios.get(`${API_URL}/users/me/email-config`);
            setEmailConfig(prev => ({
                ...prev,
                smtp_email: res.data.smtp_email || '',
                smtp_server: res.data.smtp_server || 'smtp.office365.com',
                smtp_port: res.data.smtp_port || 587,
            }));
            setEmailConfigured(res.data.configured);
        } catch {}
    };

    const handleEmailConfigSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`${API_URL}/users/me/email-config`, emailConfig);
            setEmailConfigured(true);
            setEmailConfig(prev => ({ ...prev, smtp_password: '' }));
            showNotification('Configuración de correo guardada', 'success');
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al guardar', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        try {
            await axios.post(`${API_URL}/send-email`, {
                to_email: emailConfig.smtp_email,
                subject: 'Prueba de correo — IT Inventory',
                body_html: '<p>Si recibes este correo, la configuración SMTP es correcta. ✅</p>'
            });
            showNotification('Correo de prueba enviado a ' + emailConfig.smtp_email, 'success');
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al enviar prueba', 'error');
        } finally {
            setTestingEmail(false);
        }
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsersList(res.data);
        } catch (err) {
            showNotification('Error al cargar usuarios', 'error');
        } finally {
            setUsersLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`${API_URL}/users/me`, {
                full_name: profileData.full_name,
                dni: profileData.dni
            });
            await refreshUser();
            showNotification('Perfil actualizado exitosamente', 'success');
        } catch (error) {
            showNotification('Error al actualizar el perfil', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/users/change-password`, {
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword
            });
            showNotification('Contraseña cambiada exitosamente', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            const msg = error.response?.data?.detail || 'Error al cambiar la contraseña';
            showNotification(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreatingUser(true);
        try {
            await axios.post(`${API_URL}/users`, newUserData);
            showNotification(`Usuario "${newUserData.username}" creado exitosamente`, 'success');
            setNewUserData({ username: '', full_name: '', temporary_password: '' });
            setShowCreateUser(false);
            loadUsers();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Error al crear usuario';
            showNotification(msg, 'error');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleToggleActive = async (userId) => {
        try {
            const res = await axios.put(`${API_URL}/users/${userId}/toggle-active`);
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
            showNotification(res.data.is_active ? 'Usuario activado' : 'Usuario desactivado', 'success');
        } catch (err) {
            showNotification('Error al cambiar estado del usuario', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-white">Configuración</h1>
                    <p className="text-slate-400 mt-1">Administra tu cuenta y preferencias</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                            >
                                <User className="w-5 h-5" />
                                Perfil
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-700 ${activeTab === 'security' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                            >
                                <Lock className="w-5 h-5" />
                                Seguridad
                            </button>
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-700 ${activeTab === 'notifications' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                            >
                                <Bell className="w-5 h-5" />
                                Notificaciones
                            </button>
                            <button
                                onClick={() => setActiveTab('email')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-700 ${activeTab === 'email' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                            >
                                <Mail className="w-5 h-5" />
                                Correo
                                {emailConfigured && <CheckCircle className="w-3.5 h-3.5 ml-auto text-green-400" />}
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-700 ${activeTab === 'users' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <Users className="w-5 h-5" />
                                    Usuarios TI
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" />
                                    Información del Perfil
                                </h2>

                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Nombre de Usuario
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.username}
                                            disabled
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">El nombre de usuario no se puede cambiar</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.full_name}
                                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                            placeholder="Ingresa tu nombre completo"
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            DNI
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.dni}
                                            onChange={(e) => setProfileData({ ...profileData, dni: e.target.value })}
                                            placeholder="Número de documento"
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Save className="w-4 h-4" />
                                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-primary" />
                                    Cambiar Contraseña
                                </h2>

                                <form onSubmit={handlePasswordChange} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Contraseña Actual
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                placeholder="Ingresa tu contraseña actual"
                                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                placeholder="Ingresa tu nueva contraseña"
                                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Confirmar Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                placeholder="Confirma tu nueva contraseña"
                                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Lock className="w-4 h-4" />
                                            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-primary" />
                                    Preferencias de Notificaciones
                                </h2>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Alertas de Inventario', desc: 'Recibir notificaciones sobre stock bajo', defaultOn: true },
                                        { label: 'Asignaciones Pendientes', desc: 'Notificar sobre equipos sin asignar', defaultOn: true },
                                        { label: 'Mantenimiento', desc: 'Recordatorios de mantenimiento programado', defaultOn: false },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-white">{item.label}</p>
                                                <p className="text-sm text-slate-400">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultOn} />
                                                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Email Tab */}
                        {activeTab === 'email' && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-primary" />
                                    Configuración de Correo
                                </h2>
                                <p className="text-slate-400 text-sm mb-6">
                                    Configura tu cuenta de correo para enviar notificaciones de asignación a los empleados.
                                    Usa una <span className="text-white font-medium">contraseña de aplicación</span> (no tu contraseña normal).
                                </p>

                                {emailConfigured && (
                                    <div className="mb-5 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
                                        <CheckCircle className="w-4 h-4" />
                                        Correo configurado y listo para usar.
                                        <button onClick={handleTestEmail} disabled={testingEmail}
                                            className="ml-auto text-xs underline text-green-300 hover:text-white disabled:opacity-50">
                                            {testingEmail ? 'Enviando...' : 'Enviar prueba'}
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleEmailConfigSave} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Correo electrónico</label>
                                        <input
                                            type="email"
                                            required
                                            value={emailConfig.smtp_email}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_email: e.target.value })}
                                            placeholder="usuario@empresa.com"
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Contraseña de aplicación
                                            {emailConfigured && <span className="text-slate-500 font-normal ml-2">(dejar vacío para mantener la actual)</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showSmtpPassword ? 'text' : 'password'}
                                                required={!emailConfigured}
                                                value={emailConfig.smtp_password}
                                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                                                placeholder={emailConfigured ? '••••••••••••' : 'Contraseña de aplicación SMTP'}
                                                className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                            />
                                            <button type="button" onClick={() => setShowSmtpPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/40 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                                        <span className="font-mono text-slate-300">smtp.office365.com : 587</span>
                                        <span className="text-slate-600">·</span>
                                        STARTTLS — Office 365
                                    </div>

                                    <div className="flex justify-end">
                                        <button type="submit" disabled={loading}
                                            className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50">
                                            <Save className="w-4 h-4" />
                                            {loading ? 'Guardando...' : 'Guardar configuración'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Users Tab (admin only) */}
                        {activeTab === 'users' && isAdmin && (
                            <div className="space-y-4">
                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" />
                                            Usuarios del Sistema
                                        </h2>
                                        <button
                                            onClick={() => setShowCreateUser(!showCreateUser)}
                                            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nuevo Usuario
                                        </button>
                                    </div>

                                    {/* Create User Form */}
                                    {showCreateUser && (
                                        <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-slate-700/50 rounded-lg space-y-4 border border-slate-600">
                                            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Crear Nuevo Usuario TI</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Nombre de Usuario</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newUserData.username}
                                                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                                                        placeholder="ej: jperez"
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Completo</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newUserData.full_name}
                                                        onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                                                        placeholder="ej: Juan Pérez"
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña Temporal</label>
                                                <div className="relative">
                                                    <input
                                                        type={showTempPassword ? 'text' : 'password'}
                                                        required
                                                        value={newUserData.temporary_password}
                                                        onChange={(e) => setNewUserData({ ...newUserData, temporary_password: e.target.value })}
                                                        placeholder="Mínimo 6 caracteres"
                                                        className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowTempPassword(v => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                        {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">El usuario deberá cambiarla en su primer inicio de sesión.</p>
                                            </div>
                                            <div className="flex gap-3 justify-end">
                                                <button type="button" onClick={() => setShowCreateUser(false)}
                                                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                                                    Cancelar
                                                </button>
                                                <button type="submit" disabled={creatingUser}
                                                    className="px-4 py-2 text-sm bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                                    {creatingUser ? 'Creando...' : 'Crear Usuario'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Users List */}
                                    {usersLoading ? (
                                        <div className="text-center py-8 text-slate-400">Cargando usuarios...</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {usersList.map((u) => (
                                                <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${u.is_active ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-800/30 border-slate-700 opacity-60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${u.role === 'admin' ? 'bg-purple-600/30 text-purple-300' : 'bg-blue-600/30 text-blue-300'}`}>
                                                            {(u.full_name || u.username)[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium text-sm">{u.full_name || u.username}</p>
                                                            <p className="text-slate-400 text-xs">@{u.username} · {u.role === 'admin' ? 'Administrador' : 'Usuario TI'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {u.must_change_password && (
                                                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                                Cambio pendiente
                                                            </span>
                                                        )}
                                                        {u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleToggleActive(u.id)}
                                                                className={`transition-colors ${u.is_active ? 'text-green-400 hover:text-red-400' : 'text-slate-500 hover:text-green-400'}`}
                                                                title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                                                            >
                                                                {u.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                            </button>
                                                        )}
                                                        {u.id === user?.id && (
                                                            <span className="text-xs text-slate-500">(tú)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
