import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, ArrowLeft, Save, Eye, EyeOff, Users, Plus, ToggleLeft, ToggleRight, Mail, CheckCircle, Truck, Pencil, Trash2, Star, Building2 } from 'lucide-react';
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

    // Shipping contacts (sedes) management — datos de remitente/destinatario para la factura de envío
    const emptyContactForm = { location: '', is_origin: false, company_name: '', address: '', contact_name: '', phone: '', email: '' };
    const [shippingContacts, setShippingContacts] = useState([]);
    const [shippingLoading, setShippingLoading] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [editingContactId, setEditingContactId] = useState(null);
    const [contactForm, setContactForm] = useState(emptyContactForm);
    const [savingContact, setSavingContact] = useState(false);

    // Companies management
    const [companiesList, setCompaniesList] = useState([]);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null); // { id, name, short_name, ruc, email_domain }
    const [savingCompany, setSavingCompany] = useState(false);

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
        if (activeTab === 'shipping') loadShippingContacts();
        if (activeTab === 'companies' && isAdmin) loadCompanies();
    }, [activeTab]);

    const loadCompanies = async () => {
        setCompaniesLoading(true);
        try {
            const res = await axios.get(`${API_URL}/companies/`);
            setCompaniesList(res.data);
        } catch {
            showNotification('Error al cargar empresas', 'error');
        } finally {
            setCompaniesLoading(false);
        }
    };

    const handleSaveCompany = async () => {
        if (!editingCompany) return;
        setSavingCompany(true);
        try {
            await axios.patch(`${API_URL}/companies/${editingCompany.id}`, {
                name: editingCompany.name,
                short_name: editingCompany.short_name || null,
                ruc: editingCompany.ruc || null,
                email_domain: editingCompany.email_domain || null,
            });
            showNotification('Empresa actualizada', 'success');
            setEditingCompany(null);
            loadCompanies();
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al guardar', 'error');
        } finally {
            setSavingCompany(false);
        }
    };

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

    const loadShippingContacts = async () => {
        setShippingLoading(true);
        try {
            const res = await axios.get(`${API_URL}/toner-requests/shipping-contacts`);
            setShippingContacts(res.data);
        } catch (err) {
            showNotification('Error al cargar la configuración de envíos', 'error');
        } finally {
            setShippingLoading(false);
        }
    };

    const openNewContact = () => {
        setEditingContactId(null);
        setContactForm(emptyContactForm);
        setShowContactForm(true);
    };

    const openEditContact = (c) => {
        setEditingContactId(c.id);
        setContactForm({
            location: c.location, is_origin: c.is_origin, company_name: c.company_name,
            address: c.address, contact_name: c.contact_name, phone: c.phone, email: c.email
        });
        setShowContactForm(true);
    };

    const handleSaveContact = async (e) => {
        e.preventDefault();
        if (!contactForm.location.trim()) {
            showNotification('La sede es requerida', 'error');
            return;
        }
        setSavingContact(true);
        try {
            if (editingContactId) {
                await axios.patch(`${API_URL}/toner-requests/shipping-contacts/${editingContactId}`, contactForm);
                showNotification('Configuración de envío actualizada', 'success');
            } else {
                await axios.post(`${API_URL}/toner-requests/shipping-contacts`, contactForm);
                showNotification('Configuración de envío agregada', 'success');
            }
            setShowContactForm(false);
            setEditingContactId(null);
            setContactForm(emptyContactForm);
            loadShippingContacts();
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Error al guardar la configuración', 'error');
        } finally {
            setSavingContact(false);
        }
    };

    const handleDeleteContact = async (id) => {
        if (!confirm('¿Eliminar esta configuración de envío?')) return;
        try {
            await axios.delete(`${API_URL}/toner-requests/shipping-contacts/${id}`);
            setShippingContacts(prev => prev.filter(c => c.id !== id));
            showNotification('Configuración de envío eliminada', 'success');
        } catch (err) {
            showNotification('Error al eliminar', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-bg text-slate-900 dark:text-slate-200">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuración</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Administra tu cuenta y preferencias</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <User className="w-5 h-5" />
                                Perfil
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'security' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Lock className="w-5 h-5" />
                                Seguridad
                            </button>
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'notifications' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Bell className="w-5 h-5" />
                                Notificaciones
                            </button>
                            <button
                                onClick={() => setActiveTab('email')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'email' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Mail className="w-5 h-5" />
                                Correo
                                {emailConfigured && <CheckCircle className="w-3.5 h-3.5 ml-auto text-green-500 dark:text-green-400" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('shipping')}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'shipping' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Truck className="w-5 h-5" />
                                Envíos
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'users' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Users className="w-5 h-5" />
                                    Usuarios TI
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => setActiveTab('companies')}
                                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-t border-slate-200 dark:border-slate-700 ${activeTab === 'companies' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Building2 className="w-5 h-5" />
                                    Empresas
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-accent" />
                                    Información del Perfil
                                </h2>

                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            Nombre de Usuario
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.username}
                                            disabled
                                            className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">El nombre de usuario no se puede cambiar</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.full_name}
                                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                            placeholder="Ingresa tu nombre completo"
                                            className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            DNI
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.dni}
                                            onChange={(e) => setProfileData({ ...profileData, dni: e.target.value })}
                                            placeholder="Número de documento"
                                            className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-accent hover:opacity-90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-accent" />
                                    Cambiar Contraseña
                                </h2>

                                <form onSubmit={handlePasswordChange} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            Contraseña Actual
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                placeholder="Ingresa tu contraseña actual"
                                                className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                placeholder="Ingresa tu nueva contraseña"
                                                className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            Confirmar Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                placeholder="Confirma tu nueva contraseña"
                                                className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-accent hover:opacity-90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-accent" />
                                    Preferencias de Notificaciones
                                </h2>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Alertas de Inventario', desc: 'Recibir notificaciones sobre stock bajo', defaultOn: true },
                                        { label: 'Asignaciones Pendientes', desc: 'Notificar sobre equipos sin asignar', defaultOn: true },
                                        { label: 'Mantenimiento', desc: 'Recordatorios de mantenimiento programado', defaultOn: false },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between p-4 bg-bg rounded-lg border border-slate-200 dark:border-transparent">
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultOn} />
                                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Email Tab */}
                        {activeTab === 'email' && (
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-accent" />
                                    Configuración de Correo
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    Configura tu cuenta de correo para enviar notificaciones de asignación a los empleados.
                                    Usa una <span className="text-slate-900 dark:text-white font-medium">contraseña de aplicación</span> (no tu contraseña normal).
                                </p>

                                {emailConfigured && (
                                    <div className="mb-5 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
                                        <CheckCircle className="w-4 h-4" />
                                        Correo configurado y listo para usar.
                                        <button onClick={handleTestEmail} disabled={testingEmail}
                                            className="ml-auto text-xs underline text-green-700 dark:text-green-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50">
                                            {testingEmail ? 'Enviando...' : 'Enviar prueba'}
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleEmailConfigSave} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Correo electrónico</label>
                                        <input
                                            type="email"
                                            required
                                            value={emailConfig.smtp_email}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_email: e.target.value })}
                                            placeholder="usuario@empresa.com"
                                            className="w-full px-4 py-2 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
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
                                                className="w-full px-4 py-2 pr-10 bg-bg border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                                            />
                                            <button type="button" onClick={() => setShowSmtpPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                        <p className="font-semibold text-blue-800 dark:text-blue-200">Usar Microsoft Graph API (recomendado para Office 365)</p>
                                        <p>Evita el bloqueo de autenticación básica. Configura estas 3 variables en <span className="font-mono text-slate-900 dark:text-white">backend/.env</span>:</p>
                                        <div className="font-mono text-slate-900 dark:text-white bg-bg rounded p-2 space-y-0.5 border border-slate-200 dark:border-transparent">
                                            <p>MS_TENANT_ID=<span className="text-slate-500 dark:text-slate-400">tu-tenant-id</span></p>
                                            <p>MS_CLIENT_ID=<span className="text-slate-500 dark:text-slate-400">tu-client-id</span></p>
                                            <p>MS_CLIENT_SECRET=<span className="text-slate-500 dark:text-slate-400">tu-secret</span></p>
                                        </div>
                                        <p>
                                            Crea la app en{' '}
                                            <span className="text-slate-900 dark:text-white font-medium">portal.azure.com → App registrations → New registration</span>
                                            {' '}→ API permissions → Add <span className="font-mono text-slate-900 dark:text-white">Mail.Send</span> (Application) → Grant admin consent.
                                        </p>
                                        <p>Si las 3 variables están en .env, el sistema usará Graph automáticamente (la contraseña abajo no será necesaria).</p>
                                    </div>

                                    <div className="flex justify-end">
                                        <button type="submit" disabled={loading}
                                            className="bg-accent hover:opacity-90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-opacity disabled:opacity-50">
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
                                <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Users className="w-5 h-5 text-accent" />
                                            Usuarios del Sistema
                                        </h2>
                                        <button
                                            onClick={() => setShowCreateUser(!showCreateUser)}
                                            className="flex items-center gap-2 bg-accent hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nuevo Usuario
                                        </button>
                                    </div>

                                    {/* Create User Form */}
                                    {showCreateUser && (
                                        <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-bg rounded-lg space-y-4 border border-slate-200 dark:border-slate-600">
                                            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Crear Nuevo Usuario TI</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre de Usuario</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newUserData.username}
                                                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                                                        placeholder="ej: jperez"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre Completo</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newUserData.full_name}
                                                        onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                                                        placeholder="ej: Juan Pérez"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contraseña Temporal</label>
                                                <div className="relative">
                                                    <input
                                                        type={showTempPassword ? 'text' : 'password'}
                                                        required
                                                        value={newUserData.temporary_password}
                                                        onChange={(e) => setNewUserData({ ...newUserData, temporary_password: e.target.value })}
                                                        placeholder="Mínimo 6 caracteres"
                                                        className="w-full px-3 py-2 pr-10 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowTempPassword(v => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                        {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">El usuario deberá cambiarla en su primer inicio de sesión.</p>
                                            </div>
                                            <div className="flex gap-3 justify-end">
                                                <button type="button" onClick={() => setShowCreateUser(false)}
                                                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                    Cancelar
                                                </button>
                                                <button type="submit" disabled={creatingUser}
                                                    className="px-4 py-2 text-sm bg-accent hover:opacity-90 text-white rounded-lg font-medium transition-opacity disabled:opacity-50">
                                                    {creatingUser ? 'Creando...' : 'Crear Usuario'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Users List */}
                                    {usersLoading ? (
                                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">Cargando usuarios...</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {usersList.map((u) => (
                                                <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${u.is_active ? 'bg-bg border-slate-200 dark:border-slate-600' : 'bg-bg border-slate-200 dark:border-slate-700 opacity-60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'}`}>
                                                            {(u.full_name || u.username)[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 dark:text-white font-medium text-sm">{u.full_name || u.username}</p>
                                                            <p className="text-slate-500 dark:text-slate-400 text-xs">@{u.username} · {u.role === 'admin' ? 'Administrador' : 'Usuario TI'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {u.must_change_password && (
                                                            <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                                Cambio pendiente
                                                            </span>
                                                        )}
                                                        {u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleToggleActive(u.id)}
                                                                className={`transition-colors ${u.is_active ? 'text-green-600 dark:text-green-400 hover:text-red-600 dark:hover:text-red-400' : 'text-slate-500 hover:text-green-600 dark:hover:text-green-400'}`}
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

                        {/* Shipping Tab */}
                        {activeTab === 'shipping' && (
                            <div className="space-y-4">
                                <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Truck className="w-5 h-5 text-accent" />
                                                Configuración de envíos por sede
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                Datos de remitente/destinatario usados para generar la factura de envío de tóner. Marca una sede como "Origen" para que figure como remitente.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => showContactForm ? setShowContactForm(false) : openNewContact()}
                                            className="flex items-center gap-2 bg-accent hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity shrink-0"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nueva sede
                                        </button>
                                    </div>

                                    {/* Create/Edit Contact Form */}
                                    {showContactForm && (
                                        <form onSubmit={handleSaveContact} className="my-6 p-4 bg-bg rounded-lg space-y-4 border border-slate-200 dark:border-slate-600">
                                            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                {editingContactId ? 'Editar configuración de envío' : 'Nueva configuración de envío'}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sede</label>
                                                    <input
                                                        type="text" required
                                                        value={contactForm.location}
                                                        onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                                                        placeholder="ej: Callao, Arequipa..."
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div className="flex items-end pb-2">
                                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={contactForm.is_origin}
                                                            onChange={(e) => setContactForm({ ...contactForm, is_origin: e.target.checked })}
                                                            className="w-4 h-4 rounded bg-surface border-slate-300 dark:border-slate-600 text-accent focus:ring-accent/50"
                                                        />
                                                        Marcar como sede de origen (remitente)
                                                    </label>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Empresa</label>
                                                    <input
                                                        type="text"
                                                        value={contactForm.company_name}
                                                        onChange={(e) => setContactForm({ ...contactForm, company_name: e.target.value })}
                                                        placeholder="Razón social"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dirección</label>
                                                    <input
                                                        type="text"
                                                        value={contactForm.address}
                                                        onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                                                        placeholder="Dirección completa"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Persona de contacto</label>
                                                    <input
                                                        type="text"
                                                        value={contactForm.contact_name}
                                                        onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                                                        placeholder="Nombre del contacto"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
                                                    <input
                                                        type="text"
                                                        value={contactForm.phone}
                                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                                        placeholder="ej: +51 999 999 999"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Correo</label>
                                                    <input
                                                        type="email"
                                                        value={contactForm.email}
                                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                        placeholder="correo@empresa.com"
                                                        className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3 justify-end">
                                                <button type="button" onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactForm(emptyContactForm); }}
                                                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                    Cancelar
                                                </button>
                                                <button type="submit" disabled={savingContact}
                                                    className="px-4 py-2 text-sm bg-accent hover:opacity-90 text-white rounded-lg font-medium transition-opacity disabled:opacity-50">
                                                    {savingContact ? 'Guardando...' : (editingContactId ? 'Guardar cambios' : 'Agregar sede')}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Contacts List */}
                                    {shippingLoading ? (
                                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">Cargando configuración de envíos...</div>
                                    ) : shippingContacts.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic py-4">Aún no hay sedes configuradas. Agrega al menos la sede de origen y las sedes destino para poder generar facturas de envío.</p>
                                    ) : (
                                        <div className="space-y-2 mt-2">
                                            {shippingContacts.map((c) => (
                                                <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border bg-bg border-slate-200 dark:border-slate-600">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-slate-900 dark:text-white font-medium text-sm">{c.location}</p>
                                                            {c.is_origin && (
                                                                <span className="flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                                    <Star className="w-3 h-3" />
                                                                    Origen / Remitente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                                            {c.company_name || '—'} {c.address && `· ${c.address}`}
                                                        </p>
                                                        {(c.contact_name || c.phone || c.email) && (
                                                            <p className="text-slate-500 text-xs mt-0.5">
                                                                {[c.contact_name, c.phone, c.email].filter(Boolean).join(' · ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <button onClick={() => openEditContact(c)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Editar">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteContact(c.id)} className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Eliminar">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Empresas ──────────────────────────────────── */}
                        {activeTab === 'companies' && isAdmin && (
                            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-accent" />
                                        Empresas
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                        Configura el <span className="text-slate-900 dark:text-white font-medium">código corto</span> de cada empresa (ej: TAM, WHL, ULOG) para que el auto-registro de ingresos lo reconozca correctamente desde el asunto del correo RRHH.
                                    </p>
                                </div>

                                {companiesLoading ? (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">Cargando empresas...</div>
                                ) : (
                                    <div className="space-y-2">
                                        {companiesList.map(co => (
                                            <div key={co.id} className="border border-slate-200 dark:border-slate-600 rounded-lg bg-bg overflow-hidden">
                                                {editingCompany?.id === co.id ? (
                                                    <div className="p-4 space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nombre completo</label>
                                                                <input
                                                                    value={editingCompany.name}
                                                                    onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                                    Código corto RRHH <span className="text-amber-600 dark:text-amber-400">(clave para auto-registro)</span>
                                                                </label>
                                                                <input
                                                                    value={editingCompany.short_name || ''}
                                                                    onChange={e => setEditingCompany({ ...editingCompany, short_name: e.target.value.toUpperCase() })}
                                                                    placeholder="Ej: TAM, WHL, ULOG, TLS"
                                                                    className="w-full px-3 py-2 bg-surface border border-amber-500/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">RUC</label>
                                                                <input
                                                                    value={editingCompany.ruc || ''}
                                                                    onChange={e => setEditingCompany({ ...editingCompany, ruc: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Dominio de correo</label>
                                                                <input
                                                                    value={editingCompany.email_domain || ''}
                                                                    onChange={e => setEditingCompany({ ...editingCompany, email_domain: e.target.value })}
                                                                    placeholder="Ej: transtotalperu.com"
                                                                    className="w-full px-3 py-2 bg-surface border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder-slate-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                onClick={handleSaveCompany}
                                                                disabled={savingCompany}
                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:opacity-90 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white text-sm rounded-lg transition-opacity"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                                {savingCompany ? 'Guardando...' : 'Guardar'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCompany(null)}
                                                                className="px-4 py-1.5 bg-surface hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between px-4 py-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-lg bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                                                {co.short_name ? (
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-white">{co.short_name}</span>
                                                                ) : (
                                                                    <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{co.name}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                                                    {co.short_name ? (
                                                                        <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold">{co.short_name}</span>
                                                                    ) : (
                                                                        <span className="text-slate-500 italic">sin código corto</span>
                                                                    )}
                                                                    {co.email_domain && <span>· {co.email_domain}</span>}
                                                                    {co.ruc && <span>· RUC {co.ruc}</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setEditingCompany({ ...co })}
                                                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0 ml-2"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {companiesList.length === 0 && (
                                            <p className="text-sm text-slate-500 italic py-4">No hay empresas registradas.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
