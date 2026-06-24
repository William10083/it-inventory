import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Building, Briefcase, IdCard, MapPin, Calendar } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT_DEPARTMENTS = [
    'NEGOCIOS MARITIMOS',
    'REPRESENTACIONES Y BACKOFFICE',
    'TI'
];

const EmployeeRegistrationModal = ({ isOpen, onClose, onSuccess, employee = null, employees = [] }) => {
    const { showNotification } = useNotification();
    const [companies, setCompanies] = useState([]);
    const [formData, setFormData] = useState({
        full_name: '',
        dni: '',
        email: '',
        company: '',
        company_id: null,
        department: '',
        position: '',
        location: 'Callao',
        expected_laptop_count: 1,
        expected_celular_count: 0,
        hire_date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);
    const [emailLocal, setEmailLocal] = useState('');
    const [emailDomain, setEmailDomain] = useState('transtotalperu.com');

    useEffect(() => {
        axios.get(`${API_URL}/companies/`).then(res => {
            setCompanies(res.data);
            if (!employee && res.data.length > 0) {
                const first = res.data.find(c => c.name === 'TRANSTOTAL AGENCIA MARITIMA S.A.') || res.data[0];
                setFormData(prev => ({ ...prev, company: first.name, company_id: first.id }));
            }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (employee) {
            const [local = '', domain = 'transtotalperu.com'] = (employee.email || '').split('@');
            setEmailLocal(local);
            setEmailDomain(domain);
            setFormData({
                full_name: employee.full_name || '',
                dni: employee.dni != null ? String(employee.dni) : '',
                email: employee.email || '',
                company: employee.company || '',
                company_id: employee.company_id || null,
                department: employee.department || '',
                position: employee.position || '',
                location: employee.location || 'Callao',
                expected_laptop_count: employee.expected_laptop_count !== undefined ? Math.min(employee.expected_laptop_count, 2) : 1,
                expected_celular_count: employee.expected_celular_count !== undefined ? Math.min(employee.expected_celular_count, 2) : 0,
                hire_date: employee.hire_date || new Date().toISOString().split('T')[0]
            });
            setIsEmailManuallyEdited(true);
        } else {
            const first = companies.find(c => c.name === 'TRANSTOTAL AGENCIA MARITIMA S.A.') || companies[0];
            const defaultDomain = first?.email_domain || 'transtotalperu.com';
            setEmailLocal('');
            setEmailDomain(defaultDomain);
            setFormData({
                full_name: '',
                dni: '',
                email: '',
                company: first?.name || '',
                company_id: first?.id || null,
                department: '',
                position: '',
                location: 'Callao',
                expected_laptop_count: 1,
                expected_celular_count: 0,
                hire_date: new Date().toISOString().split('T')[0]
            });
            setIsEmailManuallyEdited(false);
        }
    }, [employee, isOpen]);

    // Generate unique departments from defaults + existing employees
    const availableDepartments = useMemo(() => {
        const distinct = new Set(DEFAULT_DEPARTMENTS);
        employees.forEach(e => {
            if (e.department) distinct.add(e.department);
        });
        return Array.from(distinct).sort();
    }, [employees]);

    const isCustomDepartment = formData.department && !availableDepartments.includes(formData.department) && formData.department !== 'CUSTOM';
    const showCustomInput = formData.department === 'CUSTOM' || isCustomDepartment;

    // Auto-update domain when company changes
    useEffect(() => {
        const selectedCompany = companies.find(c => c.id === formData.company_id);
        if (selectedCompany?.email_domain) setEmailDomain(selectedCompany.email_domain);
    }, [formData.company_id, companies]);

    // Sync email into formData whenever local or domain changes
    useEffect(() => {
        const full = emailLocal ? `${emailLocal}@${emailDomain}` : '';
        setFormData(prev => ({ ...prev, email: full }));
    }, [emailLocal, emailDomain]);

    // Auto-generate local part when name changes (new employee only)
    useEffect(() => {
        if (isEmailManuallyEdited || employee) return;
        const parts = formData.full_name.trim().split(' ');
        if (parts.length < 2) return;
        const local = `${parts[0].charAt(0)}${parts[1]}`.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setEmailLocal(local);
    }, [formData.full_name, isEmailManuallyEdited, employee]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData };
            if (employee) {
                await axios.patch(`${API_URL}/employees/${employee.id}`, payload);
                showNotification('Empleado actualizado exitosamente', 'success');
            } else {
                await axios.post(`${API_URL}/employees/`, payload);
                showNotification('Empleado registrado exitosamente', 'success');
            }
            onSuccess();
            onClose();
            if (!employee) {
                const first = companies.find(c => c.name === 'TRANSTOTAL AGENCIA MARITIMA S.A.') || companies[0];
                setEmailLocal(''); setEmailDomain(first?.email_domain || 'transtotalperu.com');
                setFormData({ full_name: '', dni: '', email: '', company: first?.name || '', company_id: first?.id || null, department: '', position: '', location: 'Callao', expected_laptop_count: 1, expected_celular_count: 0, hire_date: new Date().toISOString().split('T')[0] });
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            showNotification(error.response?.data?.detail || 'Error al guardar empleado', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-bg/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{employee ? 'Editar Empleado' : 'Registrar Empleado'}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">

                        {/* Nombre Completo — full width */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <User className="w-3 h-3 inline mr-1" />Nombre Completo
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                placeholder="Ej: Juan Pérez García"
                            />
                        </div>

                        {/* DNI */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <IdCard className="w-3 h-3 inline mr-1" />DNI
                            </label>
                            <input
                                type="text"
                                required
                                pattern="[0-9]{8}"
                                value={formData.dni}
                                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                placeholder="12345678"
                                maxLength="8"
                            />
                        </div>

                        {/* Empresa */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <Building className="w-3 h-3 inline mr-1" />Empresa
                            </label>
                            <select
                                required
                                value={formData.company_id || ''}
                                onChange={(e) => {
                                    const selected = companies.find(c => c.id === parseInt(e.target.value));
                                    setFormData({ ...formData, company_id: selected?.id || null, company: selected?.name || '' });
                                }}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar empresa...</option>
                                {companies.map(comp => (
                                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Email — full width */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <Mail className="w-3 h-3 inline mr-1" />Email
                            </label>
                            <div className="flex items-center bg-bg border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                                <input
                                    type="text"
                                    required
                                    value={emailLocal}
                                    onChange={(e) => { setEmailLocal(e.target.value.replace(/[^a-z0-9._-]/gi, '')); setIsEmailManuallyEdited(true); }}
                                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none min-w-0"
                                    placeholder="usuario"
                                />
                                <span className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border-l border-slate-300 dark:border-slate-600 whitespace-nowrap select-none">
                                    @{emailDomain}
                                </span>
                            </div>
                        </div>

                        {/* Departamento */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <Building className="w-3 h-3 inline mr-1" />Departamento
                            </label>
                            <select
                                required
                                value={availableDepartments.includes(formData.department) || !formData.department ? formData.department : 'OTRO'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, department: val === 'OTRO' ? 'CUSTOM' : val });
                                }}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccione</option>
                                {availableDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                                <option value="OTRO">OTRO (manual)</option>
                            </select>
                            {showCustomInput && (
                                <input
                                    type="text"
                                    required
                                    value={formData.department === 'CUSTOM' ? '' : formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full mt-1 bg-bg border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500"
                                    placeholder="Nombre del departamento"
                                    autoFocus
                                />
                            )}
                        </div>

                        {/* Cargo */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <Briefcase className="w-3 h-3 inline mr-1" />Cargo
                            </label>
                            <input
                                type="text"
                                required
                                list="positions-list"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                placeholder="Ej: Analista de TI"
                            />
                            <datalist id="positions-list">
                                {[...new Set(employees?.map(e => e.position).filter(Boolean))].sort().map((pos, idx) => (
                                    <option key={idx} value={pos} />
                                ))}
                            </datalist>
                        </div>

                        {/* Sede */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <MapPin className="w-3 h-3 inline mr-1" />Sede
                            </label>
                            <select
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="Callao">Callao</option>
                                <option value="San Isidro">San Isidro</option>
                                <option value="Mollendo">Mollendo</option>
                                <option value="Ilo">Ilo</option>
                                <option value="Pucallpa">Pucallpa</option>
                                <option value="Chimbote">Chimbote</option>
                                <option value="Supe">Supe</option>
                                <option value="Tacna">Tacna</option>
                            </select>
                        </div>

                        {/* Fecha de Ingreso */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                <Calendar className="w-3 h-3 inline mr-1" />Fecha de Ingreso
                            </label>
                            <input
                                type="date"
                                value={formData.hire_date}
                                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Equipos requeridos */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                💻 Laptops Requeridas
                            </label>
                            <select
                                value={formData.expected_laptop_count}
                                onChange={(e) => setFormData({ ...formData, expected_laptop_count: parseInt(e.target.value) })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value={0}>0</option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                📱 Celulares Requeridos
                            </label>
                            <select
                                value={formData.expected_celular_count}
                                onChange={(e) => setFormData({ ...formData, expected_celular_count: parseInt(e.target.value) })}
                                className="w-full bg-bg border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value={0}>0</option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                            </select>
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors text-sm"
                    >
                        {loading ? 'Guardando...' : (employee ? 'Actualizar Empleado' : 'Registrar Empleado')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EmployeeRegistrationModal;
