import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ScannerInput from '../components/ScannerInput';
import AssignmentModal from '../components/AssignmentModal';
import ManualDeviceModal from '../components/ManualDeviceModal';
import AssignmentCart from '../components/AssignmentCart';
import axios from 'axios';
import { Plus, Search, Download, Package, Users, Monitor, Smartphone, Box, Laptop, X, Trash2, UserX, Briefcase, CheckCircle, AlertCircle, Filter, Keyboard, Mouse, BatteryCharging, Headphones, Tv, MapPin, FileText, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import DeviceDetailsModal from '../components/DeviceDetailsModal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import SoftwareList from '../components/SoftwareList';
import EmployeeRegistrationModal from '../components/EmployeeRegistrationModal';
import TerminationModal from '../components/TerminationModal';
import TerminationsPage from './TerminationsPage';
import AuditLogsPage from './AuditLogsPage';
import ActasStatusPage from './ActasStatusPage';
import SalesPage from './SalesPage';
import DecommissionPage from './DecommissionPage';
import { useNotification } from '../context/NotificationContext';
import AlertsPanel from '../components/AlertsPanel';
import Pagination from '../components/Pagination';
import ExcelFilter from '../components/ExcelFilter';
import AssignmentActaModal from '../components/AssignmentActaModal';
import EmployeeCard from '../components/EmployeeCard';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Dashboard = () => {
    const { showNotification, showConfirm } = useNotification();
    const navigate = useNavigate();

    // 1. Core State
    const [devices, setDevices] = useState([]);
    const [allDevices, setAllDevices] = useState([]); // All devices for filters (no pagination)
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 50;

    // Analytics State (for metrics cards)
    const [analyticsData, setAnalyticsData] = useState(null);

    // Alerts State (for notification badge)
    const [alertsCount, setAlertsCount] = useState(0);

    // 2. UI State
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'assignments', 'analytics', 'software', 'decommissions'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('type'); // 'type', 'brand', 'model', 'status', 'serial'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
    const [locationFilter, setLocationFilter] = useState('all'); // Location filter state
    const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'missing_headphones'

    // Excel-style filters state
    const [typeFilters, setTypeFilters] = useState([]);
    const [statusFilters, setStatusFilters] = useState([]);
    const [excelLocationFilters, setExcelLocationFilters] = useState([]);
    const [brandFilters, setBrandFilters] = useState([]);
    const [isAlertsOpen, setIsAlertsOpen] = useState(false); // Alerts Panel State

    // 4. Excel-like Sort & Filter State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnFilters, setColumnFilters] = useState({
        type: '',
        model: '', // Matches brand or model
        serial: '',
        hostname: '',
        inventory_code: '',
        status: ''
    });

    // 3. Modals
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [isManualDeviceModalOpen, setIsManualDeviceModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);
    const [selectedDeviceDetail, setSelectedDeviceDetail] = useState(null);
    const [selectedEmployeeForTermination, setSelectedEmployeeForTermination] = useState(null);
    const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
    const [selectedDevices, setSelectedDevices] = useState([]); // Cart
    const [selectedAssignmentForActa, setSelectedAssignmentForActa] = useState(null);
    const [isActaModalOpen, setIsActaModalOpen] = useState(false);

    // Paginación para Assignments
    const [assignmentsPage, setAssignmentsPage] = useState(1);
    const assignmentsPerPage = 12; // 12 empleados por página

    // Dropdown menu state for grouped navbar
    const [openDropdown, setOpenDropdown] = useState(null);

    // Fetch Data with Pagination
    const fetchData = useCallback(async (page = currentPage) => {
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;

            const [devRes, empRes] = await Promise.all([
                axios.get(`${API_URL}/devices/`, {
                    params: {
                        skip,
                        limit: itemsPerPage,
                        search: searchQuery || undefined,
                        device_type: typeFilters.length > 0 ? typeFilters.join(',') : undefined,
                        status: statusFilters.length > 0 ? statusFilters.join(',') : undefined,
                        location: excelLocationFilters.length > 0 ? excelLocationFilters.join(',') : (locationFilter !== 'all' ? locationFilter : undefined),
                        sort_by: sortConfig.key || undefined,
                        sort_order: sortConfig.direction
                    }
                }),
                // Optimize: Only load active employees with assignments when in Assignments tab
                axios.get(`${API_URL}/employees/`, {
                    params: {
                        limit: 1000,
                        active_only: activeTab === 'assignments' ? true : undefined
                    }
                })
            ]);

            // Handle paginated response
            if (devRes.data.items) {
                setDevices(devRes.data.items);
                setTotalItems(devRes.data.total);
                setTotalPages(devRes.data.pages);
            } else {
                // Fallback for old API format
                setDevices(devRes.data);
            }

            setEmployees(empRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, typeFilters, statusFilters, excelLocationFilters, locationFilter, sortConfig, activeTab]);

    // Fetch all devices for filter dropdowns (no pagination)
    const fetchAllDevices = async () => {
        try {
            const response = await axios.get(`${API_URL}/devices/`, {
                params: {
                    skip: 0,
                    limit: 10000, // Get all devices for filters
                    include_deleted: false
                }
            });
            setAllDevices(response.data.items || []);
        } catch (error) {
            console.error("Error fetching all devices:", error);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const delay = searchQuery ? 500 : 0;
        const handler = setTimeout(() => {
            fetchData(1);
        }, delay);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reload data when filters or sorting change (Immediate)
    useEffect(() => {
        fetchData(1);
    }, [typeFilters, statusFilters, excelLocationFilters, brandFilters, locationFilter, sortConfig]);

    // Fetch analytics data on mount (for metrics cards)
    useEffect(() => {
        fetchAnalytics();
        fetchAlertsCount();
        fetchAllDevices(); // Load all devices for filters
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown && !event.target.closest('.relative')) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdown]);

    const fetchAnalytics = async (location = null) => {
        try {
            const params = {};
            if (location && location !== 'all') {
                params.location = location;
            }
            const response = await axios.get(`${API_URL}/analytics/`, { params });
            setAnalyticsData(response.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    // Reload analytics when location filter changes
    useEffect(() => {
        fetchAnalytics(locationFilter);
    }, [locationFilter]);

    const fetchAlertsCount = async () => {
        try {
            const response = await axios.get(`${API_URL}/alerts/`);
            setAlertsCount(response.data.length);
        } catch (error) {
            console.error("Error fetching alerts count:", error);
        }
    };

    // Handler for page change - memoized to prevent re-creation
    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
        fetchData(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchData]);  // fetchData is stable, no dependencies needed

    // 4. Metrics - Use analytics data from backend instead of client-side filtering
    // This ensures metrics are accurate even with pagination
    // Memoized to avoid recalculation on every render
    const metrics = useMemo(() => analyticsData ? {

        totalLaptops: analyticsData.devices['laptop']?.total || 0,
        assignedLaptops: analyticsData.devices['laptop']?.assigned || 0,
        availableLaptops: analyticsData.devices['laptop']?.available || 0,
        totalMonitors: analyticsData.devices['monitor']?.total || 0,
        assignedMonitors: analyticsData.devices['monitor']?.assigned || 0,
        totalMobiles: analyticsData.devices['celular']?.total || 0,
        assignedMobiles: analyticsData.devices['celular']?.assigned || 0,
        totalKits: analyticsData.devices['kit teclado/mouse']?.total || 0,
        assignedKits: analyticsData.devices['kit teclado/mouse']?.assigned || 0,
        totalHeadphones: analyticsData.devices['auriculares']?.total || 0,
        assignedHeadphones: analyticsData.devices['auriculares']?.assigned || 0,
        totalBackpacks: analyticsData.devices['mochila']?.total || 0,
        assignedBackpacks: analyticsData.devices['mochila']?.assigned || 0,

    } : {
        // Fallback to 0 while loading
        totalKits: 0,
        assignedKits: 0,
        totalBackpacks: 0,
        assignedBackpacks: 0,
        totalHeadphones: 0,
        assignedHeadphones: 0,
        totalMonitors: 0,
        assignedMonitors: 0,
        totalLaptops: 0,
        assignedLaptops: 0,
        availableLaptops: 0,
        totalMobiles: 0,
        assignedMobiles: 0,
    }, [analyticsData]);

    // 5. Device type display names for search
    const deviceTypeNames = {
        'laptop': 'laptop',
        'monitor': 'monitor',
        'auriculares': 'auriculares headphones',
        'keyboard': 'teclado keyboard',
        'mouse': 'mouse raton',
        'mochila': 'mochila backpack',
        'stand': 'soporte stand',
        'celular': 'celular mobile phone',
        'charger': 'cargador charger',
        'chip': 'chip sim',
        'kit teclado/mouse': 'kit teclado mouse'
    };

    // Device type sort order (for grouping)
    const deviceTypeOrder = {
        'laptop': 1,
        'monitor': 2,
        'celular': 3,
        'auriculares': 4,
        'kit teclado/mouse': 5,
        'mochila': 6,
        'charger': 7,
        'keyboard': 8,
        'mouse': 9,
        'stand': 10,
        'chip': 11
    };

    // Filtering Logic
    // Excel-like Sort Handler
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Excel-like Filter Handler
    const handleColumnFilterChange = (key, value) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }));
    };

    // Main Filter Logic
    const getFilteredDevices = () => {
        const lowerSearch = searchQuery.toLowerCase();

        let filtered = devices.filter(d => {
            // Exclude chargers from inventory table (they are shown in mobile device details)
            if (d.device_type === 'charger') return false;

            // 1. Basic Filters (Location, Search bar)
            if (locationFilter !== 'all' && d.location !== locationFilter) return false;

            // Global Search (Legacy)
            if (lowerSearch) {
                const matchBasic = d.serial_number?.toLowerCase().includes(lowerSearch) ||
                    d.model?.toLowerCase().includes(lowerSearch) ||
                    d.brand?.toLowerCase().includes(lowerSearch) ||
                    d.hostname?.toLowerCase().includes(lowerSearch) ||
                    (deviceTypeNames[d.device_type] || '').toLowerCase().includes(lowerSearch);

                const matchStatus = d.status?.toLowerCase().includes(lowerSearch);
                const assignedTo = d.assignments?.find(a => !a.returned_date)?.employee?.full_name || '';
                const matchEmployee = assignedTo.toLowerCase().includes(lowerSearch);

                if (!matchBasic && !matchStatus && !matchEmployee) return false;
            }

            // 2. Column Specific Filters (Excel-style)
            if (columnFilters.type && !(deviceTypeNames[d.device_type] || '').toLowerCase().includes(columnFilters.type.toLowerCase())) return false;
            if (columnFilters.model) {
                const term = columnFilters.model.toLowerCase();
                const matchModel = (d.model || '').toLowerCase().includes(term);
                const matchBrand = (d.brand || '').toLowerCase().includes(term);
                if (!matchModel && !matchBrand) return false;
            }
            if (columnFilters.serial && !(d.serial_number || '').toLowerCase().includes(columnFilters.serial.toLowerCase())) return false;
            if (columnFilters.hostname && !(d.hostname || '').toLowerCase().includes(columnFilters.hostname.toLowerCase())) return false;
            if (columnFilters.inventory_code && !(d.inventory_code || '').toLowerCase().includes(columnFilters.inventory_code.toLowerCase())) return false;
            if (columnFilters.status && !(d.status || '').toLowerCase().includes(columnFilters.status.toLowerCase())) return false;

            return true;
        });



        // Sorting is now handled on the server, but we keep this for client-side fallback or refined filtering of fetched page if needed. 
        // actually, if we server sort, we should trust the server order.
        // However, `filtered` is derived from `devices` which is just the current page.
        // If we filter mostly via API, this function becomes lighter.

        return filtered;
    };



    const getFilteredEmployees = () => {
        const lowerSearch = searchQuery.toLowerCase();
        return employees.filter(e => {
            // Apply location filter first
            if (locationFilter !== 'all' && e.location !== locationFilter) {
                return false;
            }

            // Filter out inactive employees from Assignments view
            if (!e.is_active) return false;

            // Apply assignment filter (Missing Headphones)
            if (assignmentFilter === 'missing_headphones') {
                const hasHeadphones = e.assignments?.some(a =>
                    !a.returned_date && a.device?.device_type === 'headphones'
                );
                if (hasHeadphones) return false;
            }

            // Match employee basic info
            const matchEmployee =
                e.full_name?.toLowerCase().includes(lowerSearch) ||
                e.dni?.includes(lowerSearch) ||
                e.location?.toLowerCase().includes(lowerSearch) ||
                e.department?.toLowerCase().includes(lowerSearch) ||
                e.email?.toLowerCase().includes(lowerSearch);

            // Match any of the employee's assigned devices
            const matchDevices = e.assignments?.some(a => {
                if (a.returned_date) return false; // Skip returned devices
                const device = a.device;
                if (!device) return false;

                return (
                    device.serial_number?.toLowerCase().includes(lowerSearch) ||
                    device.model?.toLowerCase().includes(lowerSearch) ||
                    device.brand?.toLowerCase().includes(lowerSearch) ||
                    device.hostname?.toLowerCase().includes(lowerSearch) ||
                    (deviceTypeNames[device.device_type] || device.device_type || '').toLowerCase().includes(lowerSearch)
                );
            });

            return matchEmployee || matchDevices;
        }).map(emp => {
            // Backend now returns Assignments in EmployeeDetail
            // Filter only active assignments
            const assets = emp.assignments ? emp.assignments.filter(a => !a.returned_date).map(a => a.device) : [];
            return { ...emp, assets };
        }).sort((a, b) => {
            // Sort employees by name
            return (a.full_name || '').localeCompare(b.full_name || '');
        });
    };

    // Helper to detect missing essential equipment for an employee
    const getMissingEquipment = (assets, employee) => {
        const missing = [];
        const laptopCount = assets?.filter(a => a.device_type === 'laptop').length || 0;
        const expectedLaptops = employee.expected_laptop_count || 1;

        const hasMonitor = assets?.some(a => a.device_type === 'monitor');
        const hasKit = assets?.some(a => a.device_type === 'kit teclado/mouse');
        // Check for standalone keyboard/mouse if kit is missing
        const hasKeyboard = assets?.some(a => a.device_type === 'keyboard');
        const hasMouse = assets?.some(a => a.device_type === 'mouse');
        const hasInputDevices = hasKit || (hasKeyboard && hasMouse);

        const hasBackpack = assets?.some(a => a.device_type === 'mochila');
        const hasHeadphones = assets?.some(a => a.device_type === 'auriculares');

        if (laptopCount < expectedLaptops) {
            const missingCount = expectedLaptops - laptopCount;
            const label = missingCount > 1 ? `${missingCount} Laptops` : 'Laptop';
            missing.push({ type: 'laptop', label: label, color: 'blue' });
        }

        // Logic for Specific Roles that don't need full kit
        const position = (employee.position || '').toLowerCase();
        const isLightRole = position.includes('chofer') || position.includes('conductor');

        if (!isLightRole) {
            if (!hasMonitor) missing.push({ type: 'monitor', label: 'Monitor', color: 'cyan' });
            if (!hasInputDevices) missing.push({ type: 'kit', label: 'Kit Teclado/Mouse', color: 'purple' });
            if (!hasBackpack) missing.push({ type: 'backpack', label: 'Mochila', color: 'yellow' });
            if (!hasHeadphones) missing.push({ type: 'headphones', label: 'Auriculares', color: 'pink' });
        }

        return missing;
    };

    // Get employees with active assignments (for counting) - OPTIMIZED
    const employeesWithAssignments = useMemo(() => {
        return getFilteredEmployees().filter(emp => emp.assets?.length > 0);
    }, [employees, searchQuery, locationFilter, assignmentFilter]);

    const totalEmployeesWithAssets = useMemo(() => {
        return employees.filter(e =>
            e.assignments?.some(a => !a.returned_date)
        ).length;
    }, [employees]);

    // Paginación para Assignments - OPTIMIZED
    const paginatedEmployees = useMemo(() => {
        const filtered = getFilteredEmployees();
        const startIndex = (assignmentsPage - 1) * assignmentsPerPage;
        const endIndex = startIndex + assignmentsPerPage;
        return filtered.slice(startIndex, endIndex);
    }, [employees, searchQuery, locationFilter, assignmentFilter, assignmentsPage, assignmentsPerPage]);

    const totalAssignmentsPages = useMemo(() => {
        return Math.ceil(getFilteredEmployees().length / assignmentsPerPage);
    }, [employees, searchQuery, locationFilter, assignmentFilter, assignmentsPerPage]);
    // Actions
    const handleScan = async (value) => {
        const device = devices.find(d => d.serial_number === value || d.barcode === value);
        if (device) {
            if (device.status === 'available') {
                toggleSelection(device);
            } else {
                showNotification(`Device is ${device.status}`, 'info');
            }
        } else {
            const confirmed = await showConfirm(`Device ${value} not found. Register?`);
            if (confirmed) setIsManualModalOpen(true);
        }
    };

    const toggleSelection = (device) => {
        if (device.status !== 'available') return;
        if (selectedDevices.find(d => d.id === device.id)) {
            setSelectedDevices(selectedDevices.filter(d => d.id !== device.id));
        } else {
            setSelectedDevices([...selectedDevices, device]);
        }
    };

    const handleViewDetails = async (e, device) => {
        e.stopPropagation();
        try {
            const res = await axios.get(`${API_URL}/devices/${device.id}`);
            setSelectedDeviceDetail(res.data);
            // Modal opens automatically when selectedDeviceDetail is set
        } catch (err) { console.error(err); }
    };

    const handleDeleteDevice = async (e, device) => {
        e.stopPropagation();

        const confirmed = await showConfirm(`¿Está seguro de que desea eliminar "${device.brand} ${device.model}" (${device.serial_number})?\n\nEsta acción se puede revertir desde el registro de auditoría.`);
        if (!confirmed) return;

        try {
            // Token is already set in axios.defaults by AuthContext
            await axios.delete(`${API_URL}/devices/${device.id}`);
            showNotification('✓ Dispositivo eliminado exitosamente', 'success');
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error deleting device:', err);
            showNotification('Error al eliminar dispositivo: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    // Unassign/Return device from employee
    const handleUnassignDevice = async (e, device) => {
        e.stopPropagation();

        const confirmed = await showConfirm(
            `¿Está seguro de quitar "${device.brand} ${device.model}" (${device.serial_number}) de este empleado?\n\nEl dispositivo quedará disponible para asignar a otro usuario.`
        );

        if (!confirmed) return;

        try {
            await axios.post(`${API_URL}/return/${device.id}`);
            showNotification(`✓ Dispositivo "${device.model}" devuelto exitosamente`, 'success');
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error returning device:', err);
            showNotification('Error al devolver el dispositivo: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const handleUpdateEmployeeLocation = async (employeeId, newLocation) => {
        try {
            await axios.patch(`${API_URL}/employees/${employeeId}`, { location: newLocation });
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error updating employee location:', err);
            alert('Error al actualizar sede: ' + (err.response?.data?.detail || err.message));
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'laptop': return <Monitor className="w-5 h-5 text-blue-400" />;
            case 'celular': return <Smartphone className="w-5 h-5 text-green-400" />;
            case 'kit teclado/mouse': return <Box className="w-5 h-5 text-purple-400" />;
            case 'mochila': return <Briefcase className="w-5 h-5 text-yellow-400" />;
            case 'charger': return <BatteryCharging className="w-5 h-5 text-orange-400" />;
            case 'auriculares': return <Headphones className="w-5 h-5 text-pink-400" />;
            case 'monitor': return <Tv className="w-5 h-5 text-cyan-400" />;
            default: return <Monitor className="w-5 h-5 text-slate-400" />;
        }
    };

    const handleDownloadActa = async (e, employee) => {
        e.stopPropagation();

        if (!employee.assignments || employee.assignments.length === 0) {
            showNotification('Este empleado no tiene asignaciones', 'warning');
            return;
        }

        // Pass the assignment object with employee property to match modal expectations
        setSelectedAssignmentForActa({
            employee: employee,
            id: employee.assignments?.[0]?.id || null,
            assignment_id: employee.assignments?.[0]?.id || null
        });
        setIsActaModalOpen(true);
    };


    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
            <Navbar onAlertClick={() => setIsAlertsOpen(true)} notificationCount={alertsCount} />

            <AlertsPanel isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard de Inventario</h1>
                        <p className="text-slate-400 mt-1">Gestiona dispositivos, asignaciones y empleados</p>
                    </div>
                    <div className="flex gap-3">

                        <button
                            onClick={() => {
                                setSelectedEmployeeForEdit(null);
                                setIsEmployeeModalOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                        >
                            <Users className="w-5 h-5" /> Agregar Empleado
                        </button>
                        <button
                            onClick={() => setIsManualDeviceModalOpen(true)}
                            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" /> Nuevo Equipo
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-purple-500">
                        <div className="bg-purple-500/20 p-3 rounded-lg"><Box className="w-6 h-6 text-purple-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Kits</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedKits} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalKits}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-yellow-500">
                        <div className="bg-yellow-500/20 p-3 rounded-lg"><Briefcase className="w-6 h-6 text-yellow-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Mochilas</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedBackpacks} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalBackpacks}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-pink-500">
                        <div className="bg-pink-500/20 p-3 rounded-lg"><Headphones className="w-6 h-6 text-pink-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Auriculares</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedHeadphones} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalHeadphones}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-cyan-500">
                        <div className="bg-cyan-500/20 p-3 rounded-lg"><Tv className="w-6 h-6 text-cyan-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Monitores</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedMonitors} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalMonitors}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-blue-500">
                        <div className="bg-blue-500/20 p-3 rounded-lg"><Monitor className="w-6 h-6 text-blue-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Laptops</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedLaptops} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalLaptops}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-green-500">
                        <div className="bg-green-500/20 p-3 rounded-lg"><Smartphone className="w-6 h-6 text-green-400" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Celulares</p>
                            <p className="text-2xl font-bold text-white">{metrics.assignedMobiles} <span className="text-sm text-slate-500 font-normal">/ {metrics.totalMobiles}</span></p>
                        </div>
                    </div>
                </div>

                {/* 2. Controls: Search & Tabs - Grouped Navigation */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <div className="flex gap-2 w-full md:w-auto items-center">
                        {/* Gestión Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setOpenDropdown(openDropdown === 'gestion' ? null : 'gestion')}
                                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['inventory', 'assignments', 'terminations'].includes(activeTab)
                                    ? 'text-white bg-slate-700'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Gestión
                                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'gestion' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'gestion' && (
                                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                                    <button
                                        onClick={() => { setActiveTab('inventory'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'inventory' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        📦 Inventario
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('assignments'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'assignments' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        👥 Asignaciones
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('terminations'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'terminations' ? 'text-white bg-red-500/20 border-l-2 border-red-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        🚪 Ceses
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('decommissions'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors rounded-b-lg border-t border-slate-700/50 ${activeTab === 'decommissions' ? 'text-white bg-red-500/20 border-l-2 border-red-500' : 'text-slate-400 hover:text-white hover:bg-slate-700 hover:bg-red-900/20'}`}
                                    >
                                        🛑 Bajas
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Documentos Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setOpenDropdown(openDropdown === 'documentos' ? null : 'documentos')}
                                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['actas', 'sales'].includes(activeTab)
                                    ? 'text-white bg-slate-700'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Documentos
                                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'documentos' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'documentos' && (
                                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                                    <button
                                        onClick={() => { setActiveTab('actas'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'actas' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        📄 Actas
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('sales'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors rounded-b-lg ${activeTab === 'sales' ? 'text-white bg-green-500/20 border-l-2 border-green-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        💰 Ventas
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Otros Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setOpenDropdown(openDropdown === 'otros' ? null : 'otros')}
                                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 rounded ${['analytics', 'software', 'logs'].includes(activeTab)
                                    ? 'text-white bg-slate-700'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Otros
                                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'otros' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'otros' && (
                                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                                    <button
                                        onClick={() => { setActiveTab('analytics'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'analytics' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        📊 Analytics
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('software'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${activeTab === 'software' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        💿 Software
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('logs'); setOpenDropdown(null); }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors rounded-b-lg ${activeTab === 'logs' ? 'text-white bg-primary/20 border-l-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        📋 Logs
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por Serie, Hostname, Nombre, DNI..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:border-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* 3. Content Views */}
                {activeTab === 'inventory' && (
                    <div className="grid grid-cols-1 gap-4">
                        {activeTab === 'inventory' && (
                            <div className="flex gap-4 mb-2 overflow-x-auto pb-2">
                                {/* Scanner Input */}
                                <ScannerInput onScan={handleScan} placeholder="Escanear código de barras..." />

                                {/* Spacer to push location filter to the right */}
                                <div className="flex-1"></div>

                                {/* Location Filter - Moved to right */}
                                <select
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:border-primary min-w-[160px]"
                                >
                                    <option value="all">Todas las Sedes</option>
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
                        )}
                        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-800 text-slate-200">
                                    <tr>
                                        {/* Combined Header & Filter: Type */}
                                        <th className="px-4 py-3 align-top w-24">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('type')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Tipo</span>
                                                    {sortConfig.key === 'type' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="device_type"
                                                    data={allDevices}
                                                    selectedValues={typeFilters}
                                                    onFilterChange={setTypeFilters}
                                                    placeholder="Buscar tipo..."
                                                />
                                            </div>
                                        </th>

                                        {/* Combined Header & Filter: Model/Brand */}
                                        <th className="px-4 py-3 align-top">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('model')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Modelo / Marca</span>
                                                    {sortConfig.key === 'model' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="brand"
                                                    data={allDevices}
                                                    selectedValues={brandFilters}
                                                    onFilterChange={setBrandFilters}
                                                    placeholder="Buscar marca..."
                                                />
                                            </div>
                                        </th>

                                        {/* Combined Header & Filter: Serial */}
                                        <th className="px-4 py-3 align-top w-40">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('serial')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Serie</span>
                                                    {sortConfig.key === 'serial' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="serial_number"
                                                    data={allDevices}
                                                    selectedValues={[]}
                                                    onFilterChange={() => { }}
                                                    placeholder="Buscar serie..."
                                                />
                                            </div>
                                        </th>

                                        {/* Combined Header & Filter: Hostname */}
                                        <th className="px-4 py-3 align-top w-40">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('hostname')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Hostname</span>
                                                    {sortConfig.key === 'hostname' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="hostname"
                                                    data={allDevices}
                                                    selectedValues={[]}
                                                    onFilterChange={() => { }}
                                                    placeholder="Buscar hostname..."
                                                />
                                            </div>
                                        </th>

                                        {/* Combined Header & Filter: Inventory Code */}
                                        <th className="px-4 py-3 align-top w-40">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('inventory_code')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Cod. Inventario</span>
                                                    {sortConfig.key === 'inventory_code' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="inventory_code"
                                                    data={allDevices}
                                                    selectedValues={[]}
                                                    onFilterChange={() => { }}
                                                    placeholder="Buscar código..."
                                                />
                                            </div>
                                        </th>

                                        {/* Combined Header & Filter: Status */}
                                        <th className="px-4 py-3 align-top w-32">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('status')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Estado</span>
                                                    {sortConfig.key === 'status' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <div className="flex flex-col opacity-0 group-hover:opacity-30">
                                                            <ChevronUp className="w-2 h-2" />
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ExcelFilter
                                                    column="status"
                                                    data={allDevices}
                                                    selectedValues={statusFilters}
                                                    onFilterChange={setStatusFilters}
                                                    placeholder="Buscar estado..."
                                                />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {getFilteredDevices().map(device => {
                                        const isSelected = selectedDevices.find(d => d.id === device.id);
                                        return (
                                            <tr
                                                key={device.id}
                                                onClick={() => toggleSelection(device)}
                                                className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                                            >
                                                <td className="px-4 py-3">{getIcon(device.device_type)}</td>
                                                <td className="px-4 py-3 text-white font-medium">
                                                    {device.model}
                                                    <div className="text-xs text-slate-500">{device.brand}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono">{device.serial_number}</td>
                                                <td className="px-4 py-3 font-mono">
                                                    {device.device_type === 'laptop' && device.hostname ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded" title="Hostname">PC</span>
                                                            <span className="text-blue-300">{device.hostname}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-300">
                                                    {device.inventory_code ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded select-none">INV</span>
                                                            <span className="text-cyan-100">{device.inventory_code}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${device.status === 'available' ? 'text-green-400 bg-green-500/10' :
                                                        device.status === 'assigned' ? 'text-blue-400 bg-blue-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>{device.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button onClick={(e) => handleViewDetails(e, device)} className="text-xs bg-slate-700 text-white px-2 py-1 rounded hover:bg-slate-600">
                                                            Detalles
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteDevice(e, device)}
                                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                                            title="Eliminar dispositivo"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {getFilteredDevices().length === 0 && (
                                <div className="p-8 text-center text-slate-500">No se encontraron equipos.</div>
                            )}
                        </div>

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="space-y-6">
                        {/* Header with employee count and location filter */}
                        <div className="flex items-center justify-between bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-medium">Empleados con Asignaciones</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Export to Excel Button */}
                                <a
                                    href={`${API_URL}/export/assignments-template`}
                                    target="_blank"
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    title="Exportar asignaciones a Excel"
                                >
                                    <Download className="w-4 h-4" />
                                    Exportar a Excel
                                </a>



                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-400" />
                                    <select
                                        value={assignmentFilter}
                                        onChange={(e) => setAssignmentFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="missing_headphones">Sin Auriculares</option>
                                    </select>
                                </div>

                                {/* Location Filter */}
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <select
                                        value={locationFilter}
                                        onChange={(e) => setLocationFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                    >
                                        <option value="all">Todas las Sedes</option>
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
                                <span className="text-2xl font-bold text-white">
                                    {employeesWithAssignments.length}
                                    <span className="text-sm text-slate-500 font-normal ml-1">/ {employees.filter(e => e.is_active).length} total</span>
                                </span>
                            </div>
                        </div>

                        {/* Employee cards grid - OPTIMIZED */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {paginatedEmployees.map(emp => {
                                const missingEquipment = getMissingEquipment(emp.assets, emp);
                                return (
                                    <EmployeeCard
                                        key={emp.id}
                                        employee={emp}
                                        missingEquipment={missingEquipment}
                                        onDownloadActa={handleDownloadActa}
                                        onEditEmployee={(emp) => {
                                            setSelectedEmployeeForEdit(emp);
                                            setIsEmployeeModalOpen(true);
                                        }}
                                        onTerminateEmployee={(emp) => {
                                            setSelectedEmployeeForTermination(emp);
                                            setIsTerminationModalOpen(true);
                                        }}
                                        onUpdateLocation={handleUpdateEmployeeLocation}
                                        onViewDetails={handleViewDetails}
                                        onUnassignDevice={handleUnassignDevice}
                                        renderAssetCard={renderAssetCard}
                                    />
                                );
                            })}
                        </div>

                        {/* Paginación para Assignments */}
                        {totalAssignmentsPages > 1 && (
                            <div className="mt-6">
                                <Pagination
                                    currentPage={assignmentsPage}
                                    totalPages={totalAssignmentsPages}
                                    totalItems={getFilteredEmployees().length}
                                    itemsPerPage={assignmentsPerPage}
                                    onPageChange={(page) => {
                                        setAssignmentsPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && <AnalyticsDashboard employees={employees} />}
                {activeTab === 'actas' && <ActasStatusPage />}
                {activeTab === 'sales' && <SalesPage />}
                {activeTab === 'software' && <SoftwareList />}
                {activeTab === 'terminations' && <TerminationsPage />}
                {activeTab === 'decommissions' && <DecommissionPage />}
                {activeTab === 'logs' && <AuditLogsPage />}

            </div>

            <AssignmentCart
                selectedDevices={selectedDevices}
                onRemove={(id) => setSelectedDevices(selectedDevices.filter(d => d.id !== id))}
                onClear={() => setSelectedDevices([])}
                onAssign={() => setIsAssignmentModalOpen(true)}
            />

            <AssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} devices={selectedDevices} onSuccess={() => { setSelectedDevices([]); fetchData(); }} />
            <ManualDeviceModal isOpen={isManualDeviceModalOpen} onClose={() => setIsManualDeviceModalOpen(false)} onSuccess={fetchData} />
            <DeviceDetailsModal isOpen={selectedDeviceDetail !== null} onClose={() => setSelectedDeviceDetail(null)} device={selectedDeviceDetail} onUpdate={fetchData} />
            <EmployeeRegistrationModal
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
                onSuccess={fetchData}
                employee={selectedEmployeeForEdit}
                employees={employees}
            />
            <TerminationModal
                isOpen={isTerminationModalOpen}
                onClose={() => {
                    setIsTerminationModalOpen(false);
                    setSelectedEmployeeForTermination(null);
                }}
                employee={selectedEmployeeForTermination}
                onSuccess={fetchData}
            />
            <AssignmentActaModal
                isOpen={isActaModalOpen}
                onClose={() => {
                    setIsActaModalOpen(false);
                    setSelectedAssignmentForActa(null);
                }}
                assignment={selectedAssignmentForActa}
                onSuccess={async () => {
                    // Recargar datos
                    await fetchData();
                    // Cerrar modal temporalmente
                    setIsActaModalOpen(false);
                    // Reabrir después de un momento para mostrar datos actualizados
                    setTimeout(() => {
                        setIsActaModalOpen(true);
                    }, 100);
                }}
            />
        </div>
    );
    // Helper to render individual asset card
    function renderAssetCard(asset, isGrouped = false, explicitLabel = null) {

        // Determine label if not explicit
        let label = explicitLabel;

        // Visual colors based on type
        const typeColorClass = asset.device_type === 'laptop' ? 'text-blue-400' :
            asset.device_type === 'charger' ? 'text-yellow-500' :
                asset.device_type === 'monitor' ? 'text-purple-400' : 'text-slate-400';

        // Detail Fields Logic
        const renderDetails = () => {
            const details = [];

            // Common - Show SN for everything EXCEPT mobile/chip (as requested)
            if (asset.serial_number && asset.device_type !== 'mobile' && asset.device_type !== 'chip') {
                details.push(<span key="sn" className="text-slate-500">SN: <span className="text-slate-300 font-mono">{asset.serial_number}</span></span>);
            }
            if (asset.hostname) details.push(<span key="host" className="text-slate-500">Host: <span className="text-slate-300 font-mono">{asset.hostname}</span></span>);

            // Mobile Specific
            if (asset.device_type === 'mobile' || asset.device_type === 'chip') {
                let imei = asset.imei;
                let phone = asset.phone_number;

                // Fallback to specs
                if (!imei || !phone) {
                    try {
                        if (typeof asset.specifications === 'string' && asset.specifications.trim().startsWith('{')) {
                            const specs = JSON.parse(asset.specifications);
                            if (!imei) imei = specs.imei;
                            if (!phone) phone = specs.phone_number;
                        }
                    } catch (e) { }
                }

                if (imei) details.push(<span key="imei" className="text-slate-500">IMEI: <span className="text-slate-300 font-mono">{imei}</span></span>);
                if (phone) details.push(<span key="phone" className="text-slate-500">Tel: <span className="text-slate-300 font-mono">{phone}</span></span>);
            }

            // Location Badge for Laptops (Casa vs Oficina)
            if (asset.device_type === 'laptop' && asset.location) {
                if (asset.location === 'Casa') {
                    details.push(<span key="loc-home" className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">CASA</span>);
                } else if (asset.location === 'Oficina') {
                    details.push(<span key="loc-office" className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">OFICINA</span>);
                }
            }

            return details;
        };

        return (
            <div key={asset.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isGrouped ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-slate-900/50 border-slate-700/50 hover:border-primary/30'}`}>
                <div className="flex items-center gap-3 w-full min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${asset.device_type === 'laptop' ? 'bg-blue-500/20 text-blue-400' :
                        asset.device_type === 'charger' ? 'bg-yellow-500/20 text-yellow-500' :
                            asset.device_type === 'monitor' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-slate-700 text-slate-400'
                        }`}>
                        {getIcon(asset.device_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                        {label && (
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${typeColorClass}`}>
                                {label}
                            </p>
                        )}
                        <h4 className="font-medium text-white text-sm leading-tight truncate">
                            <span className="text-slate-400 font-normal mr-1">{asset.brand}</span>
                            {asset.model}
                        </h4>

                        {/* Details Grid */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] leading-tight item-center">
                            {renderDetails()}
                            {asset.status === 'assigned' && <span className="text-green-500/80 font-medium text-[10px] border border-green-500/20 px-1 rounded bg-green-500/10 self-center">ACTIVO</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                        onClick={(e) => handleViewDetails(e, asset)}
                        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        title="Ver detalles"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => handleUnassignDevice(e, asset)}
                        className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                        title="Quitar asignación"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

};

export default Dashboard;
