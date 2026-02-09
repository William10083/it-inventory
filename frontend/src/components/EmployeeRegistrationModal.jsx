import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Building, Briefcase, IdCard, MapPin } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT_DEPARTMENTS = [
    'NEGOCIOS MARITIMOS',
    'REPRESENTACIONES Y BACKOFFICE',
    'TI'
];

const COMPANIES = [
    'TRANSTOTAL AGENCIA MARITIMA S.A.',
    'MALLKIRA S.A.'
];

const EmployeeRegistrationModal = ({ isOpen, onClose, onSuccess, employee = null, employees = [] }) => {
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        full_name: '',
        dni: '',
        email: '',
        company: 'TRANSTOTAL AGENCIA MARITIMA S.A.',
        department: '',
        position: '',
        location: 'Callao',
        expected_laptop_count: 1
    });
    const [loading, setLoading] = useState(false);
    const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);

    useEffect(() => {
        if (employee) {
            setFormData({
                full_name: employee.full_name || '',
                dni: employee.dni || '',
                email: employee.email || '',
                company: employee.company || 'TRANSTOTAL AGENCIA MARITIMA S.A.',
                department: employee.department || '',
                position: employee.position || '',
                location: employee.location || 'Callao',
                expected_laptop_count: employee.expected_laptop_count !== undefined ? employee.expected_laptop_count : 1
            });
            setIsEmailManuallyEdited(true); // Don't auto-overwrite existing emails on edit unless cleared? 
            // Actually, kept simpler: if editing, assume manual. 
        } else {
            setFormData({
                full_name: '',
                dni: '',
                email: '',
                company: 'TRANSTOTAL AGENCIA MARITIMA S.A.',
                department: '',
                position: '',
                location: 'Callao',
                expected_laptop_count: 1
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

    // Auto-generate email when name or company changes
    useEffect(() => {
        if (isEmailManuallyEdited || employee) return; // Don't overwrite if manual or editing existing

        if (!formData.full_name) {
            setFormData(prev => ({ ...prev, email: '' }));
            return;
        }

        const parts = formData.full_name.trim().split(' ');
        if (parts.length < 2) return; // Need at least 2 names

        const firstName = parts[0].toLowerCase();
        // Use the first word of the last name (or second part of the name string)
        const lastName = parts[1].toLowerCase();

        const firstInitial = firstName.charAt(0);
        const domain = formData.company === 'MALLKIRA S.A.' ? '@mallkira.com' : '@transtotalperu.com';

        const generatedEmail = `${firstInitial}${lastName}${domain}`;
        setFormData(prev => ({ ...prev, email: generatedEmail }));

    }, [formData.full_name, formData.company, isEmailManuallyEdited, employee]);

    const handleEmailChange = (e) => {
        setFormData({ ...formData, email: e.target.value });
        setIsEmailManuallyEdited(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (employee) {
                await axios.patch(`${API_URL}/employees/${employee.id}`, formData);
                showNotification('Empleado actualizado exitosamente', 'success');
            } else {
                await axios.post(`${API_URL}/employees/`, formData);
                showNotification('Empleado registrado exitosamente', 'success');
            }
            onSuccess();
            onClose();
            if (!employee) {
                setFormData({ full_name: '', dni: '', email: '', department: '', position: '', location: 'Callao', expected_laptop_count: 1 });
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{employee ? 'Editar Empleado' : 'Registrar Empleado'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <User className="w-4 h-4 inline mr-1" />
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            placeholder="Ej: Juan Pérez García"
                        />
                    </div>

                    {/* DNI */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <IdCard className="w-4 h-4 inline mr-1" />
                            DNI
                        </label>
                        <input
                            type="text"
                            required
                            pattern="[0-9]{8}"
                            value={formData.dni}
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            placeholder="12345678"
                            maxLength="8"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <Building className="w-4 h-4 inline mr-1" />
                            Empresa
                        </label>
                        <select
                            required
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                        >
                            {COMPANIES.map(comp => (
                                <option key={comp} value={comp}>{comp}</option>
                            ))}
                        </select>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleEmailChange}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            placeholder="generado.automaticamente@..."
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <Building className="w-4 h-4 inline mr-1" />
                            Departamento/Sede
                        </label>
                        <select
                            required
                            value={availableDepartments.includes(formData.department) || !formData.department ? formData.department : 'OTRO'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'OTRO') {
                                    setFormData({ ...formData, department: 'CUSTOM' }); // Placeholder to trigger input
                                } else {
                                    setFormData({ ...formData, department: val });
                                }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white mb-2"
                        >
                            <option value="">Seleccione Departamento</option>
                            {availableDepartments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                            <option value="OTRO">OTRO (INGRESAR MANUALMENTE)</option>
                        </select>

                        {showCustomInput && (
                            <input
                                type="text"
                                required
                                value={formData.department === 'CUSTOM' ? '' : formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500"
                                placeholder="Ingrese el nombre del departamento"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <Briefcase className="w-4 h-4 inline mr-1" />
                            Cargo
                        </label>
                        <input
                            type="text"
                            required
                            list="positions-list"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            placeholder="Ej: Analista de TI"
                        />
                        <datalist id="positions-list">
                            {[...new Set(employees?.map(e => e.position).filter(Boolean))].sort().map((pos, idx) => (
                                <option key={idx} value={pos} />
                            ))}
                        </datalist>
                    </div>

                    {/* Location/Sede */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Sede
                        </label>
                        <select
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
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

                    {/* Expected Laptop Count */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            <span className="w-4 h-4 inline-block mr-1">💻</span>
                            Laptops Requeridas
                        </label>
                        <input
                            type="number"
                            min="0"
                            required
                            value={formData.expected_laptop_count}
                            onChange={(e) => setFormData({ ...formData, expected_laptop_count: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Guardando...' : (employee ? 'Actualizar Empleado' : 'Registrar Empleado')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EmployeeRegistrationModal;
