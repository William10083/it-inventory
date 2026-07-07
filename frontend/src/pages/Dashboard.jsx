import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import PowerBIDashboard from '../components/PowerBIDashboard';
import LicensesPage from '../pages/LicensesPage';
import SoftwarePage from '../pages/SoftwarePage';
import EmployeeRegistrationModal from '../components/EmployeeRegistrationModal';
import TerminationModal from '../components/TerminationModal';
import TerminationsPage from './TerminationsPage';
import AuditLogsPage from './AuditLogsPage';
import ActasStatusPage from './ActasStatusPage';
import HRAlertsPage from './HRAlertsPage';
import IngressosPage from './IngressosPage';
import LanchasPage from './LanchasPage';
import SalesPage from './SalesPage';
import DevolucionesPage from './DevolucionesPage';
import ActiveDirectoryPage from './ActiveDirectoryPage';
import TonerRequestsPage from './TonerRequestsPage';
import DecommissionPage from './DecommissionPage';
import { useNotification } from '../context/NotificationContext';
import AlertsPanel from '../components/AlertsPanel';
import Pagination from '../components/Pagination';
import ExcelFilter from '../components/ExcelFilter';
import AssignmentActaModal from '../components/AssignmentActaModal';
import EmployeeCard from '../components/EmployeeCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import CountUpNumber from '../components/CountUpNumber';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Small illustrated accent mark for the Dashboard header — the one
// deliberately visible "wow" moment of this PR (unlike PR0's invisible
// foundation work). Pure CSS/SVG, no extra deps.
const DashboardHeaderAccent = () => (
    <div
        aria-hidden="true"
        className="hidden sm:flex w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 items-center justify-center flex-shrink-0"
    >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" className="text-accent" />
            <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-accent" />
            <circle cx="8" cy="9" r="1.3" fill="currentColor" className="text-device-laptop" />
            <circle cx="12" cy="9" r="1.3" fill="currentColor" className="text-device-monitor" />
            <circle cx="16" cy="9" r="1.3" fill="currentColor" className="text-device-mobile" />
        </svg>
    </div>
);

const Dashboard = () => {
    const { showNotification, showConfirm } = useNotification();
    const { token } = useAuth();
    const navigate = useNavigate();

    // 1. Core State
    const [devices, setDevices] = useState([]);
    const [allDevices, setAllDevices] = useState([]); // All devices for filters (no pagination)
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const filtersHasMounted = useRef(false);

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
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'assignments', 'analytics', 'licenses', 'decommissions'
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
    const [expandedDeviceId, setExpandedDeviceId] = useState(null);
    const statusES = (s) => ({ available: 'Disponible', assigned: 'Asignado', maintenance: 'Mantenimiento', decommissioned: 'De baja' }[s] || s || '—');
    const [selectedEmployeeForTermination, setSelectedEmployeeForTermination] = useState(null);
    const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
    const [selectedDevices, setSelectedDevices] = useState([]); // Cart
    const [selectedAssignmentForActa, setSelectedAssignmentForActa] = useState(null);
    const [isActaModalOpen, setIsActaModalOpen] = useState(false);

    // Paginación para Assignments
    const [assignmentsPage, setAssignmentsPage] = useState(1);
    const assignmentsPerPage = 12; // 12 empleados por página


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

    // Fetch distinct values for filter dropdowns — replaces loading 10 000 devices
    const fetchAllDevices = async () => {
        try {
            const response = await axios.get(`${API_URL}/devices/filter-options`);
            const opts = response.data;
            // ExcelFilter expects an array of objects and reads item[column].
            // We build a minimal combined array: each entry has only its own field set.
            // ExcelFilter already filters out null/undefined/'', so mixing is safe.
            setAllDevices([
                ...opts.types.map(t => ({ device_type: t })),
                ...opts.brands.map(b => ({ brand: b })),
                ...opts.statuses.map(s => ({ status: s })),
                ...opts.locations.map(l => ({ location: l })),
            ]);
        } catch (error) {
            console.error("Error fetching filter options:", error);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const delay = searchQuery ? 250 : 0; // Reducido de 500ms a 250ms para respuesta más rápida
        const handler = setTimeout(() => {
            fetchData(1);
        }, delay);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reload data when filters or sorting change — skip the initial mount (search debounce already handles it)
    useEffect(() => {
        if (!filtersHasMounted.current) { filtersHasMounted.current = true; return; }
        fetchData(1);
    }, [typeFilters, statusFilters, excelLocationFilters, brandFilters, locationFilter, sortConfig]);

    // Fetch analytics data on mount (for metrics cards)
    // fetchAnalytics() omitido aquí — el useEffect de locationFilter ya lo llama en el mount
    useEffect(() => {
        fetchAlertsCount();
        fetchAllDevices();
    }, []);


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

            // Location filter is handled server-side — no local re-filter needed
            // Search is handled server-side — no local re-filter needed

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
                e.position?.toLowerCase().includes(lowerSearch) ||
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
                    device.imei?.toLowerCase().includes(lowerSearch) ||
                    device.chip_imei?.toLowerCase().includes(lowerSearch) ||
                    device.phone_number?.toLowerCase().includes(lowerSearch) ||
                    device.inventory_code?.toLowerCase().includes(lowerSearch) ||
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
        const position   = (employee.position   || '').toLowerCase();
        const department = (employee.department || '').toLowerCase();

        // Roles sin equipo: marineros, patrones, choferes en departamento lanchas
        const isLanchas      = department.includes('lancha');
        const isMarinero     = position.includes('marinero') || position.includes('patrón') || position.includes('patron');
        const isChofer       = position.includes('chofer') || position.includes('conductor');
        const noEquipRole    = (isLanchas && isMarinero) || (isLanchas && isChofer);

        // Si expected_laptop_count está explícitamente en 0, o es un rol sin equipo → sin alertas de laptop
        const laptopExplicit = employee.expected_laptop_count !== null && employee.expected_laptop_count !== undefined;
        const needsLaptop  = laptopExplicit ? employee.expected_laptop_count > 0 : !noEquipRole;
        const needsCelular = (employee.expected_celular_count ?? 0) > 0;
        const expectedLaptops = employee.expected_laptop_count || 1;

        // Si no necesita ningún equipo → sin alertas
        if (!needsLaptop && !needsCelular) return [];

        if (needsLaptop) {
            const laptopCount = assets?.filter(a => a.device_type === 'laptop').length || 0;
            if (laptopCount < expectedLaptops) {
                const missingCount = expectedLaptops - laptopCount;
                missing.push({ type: 'laptop', label: missingCount > 1 ? `${missingCount} Laptops` : 'Laptop', color: 'blue' });
            }

            const hasMonitor     = assets?.some(a => a.device_type === 'monitor');
            const hasKit         = assets?.some(a => a.device_type === 'kit teclado/mouse');
            const hasKeyboard    = assets?.some(a => a.device_type === 'keyboard');
            const hasMouse       = assets?.some(a => a.device_type === 'mouse');
            const hasInputDevices= hasKit || (hasKeyboard && hasMouse);
            const hasBackpack    = assets?.some(a => a.device_type === 'mochila');
            const hasHeadphones  = assets?.some(a => a.device_type === 'auriculares');

            if (!hasMonitor)      missing.push({ type: 'monitor',    label: 'Monitor',         color: 'cyan'   });
            if (!hasInputDevices) missing.push({ type: 'kit',        label: 'Kit Teclado/Mouse',color: 'purple' });
            if (!hasBackpack)     missing.push({ type: 'backpack',   label: 'Mochila',          color: 'yellow' });
            if (!hasHeadphones)   missing.push({ type: 'headphones', label: 'Auriculares',      color: 'pink'   });
        }

        if (needsCelular) {
            const hasCelular = assets?.some(a => ['celular','mobile','smartphone'].includes((a.device_type || '').toLowerCase()));
            if (!hasCelular) missing.push({ type: 'celular', label: 'Celular', color: 'green' });
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

    // Unassign/Return device from employee — genera acta de devolución automáticamente
    const handleUnassignDevice = async (e, device, employee) => {
        e.stopPropagation();

        const empName = employee?.full_name || 'este empleado';
        const devDesc = `${device.brand || ''} ${device.model || ''}`.trim();
        const serial  = device.serial_number ? ` (SN: ${device.serial_number})` : '';

        const confirmed = await showConfirm(
            `¿Retirar "${devDesc}"${serial} de ${empName}?\n\n` +
            `• El dispositivo quedará disponible en stock\n` +
            `• Se generará y descargará el Acta de Devolución automáticamente`
        );

        if (!confirmed) return;

        try {
            const res = await axios.post(`${API_URL}/return/${device.id}`);
            const assignmentId = res.data?.assignment_id;

            showNotification(`✓ "${devDesc}" devuelto — generando acta...`, 'success');
            fetchData();

            // Descargar acta de devolución si existe assignment
            if (assignmentId) {
                try {
                    const actaRes = await axios.get(
                        `${API_URL}/assignments/${assignmentId}/acta?acta_type=return`,
                        { responseType: 'blob' }
                    );
                    // Verificar que sea un docx válido (no un JSON de error)
                    const contentType = actaRes.headers['content-type'] || '';
                    if (contentType.includes('json') || actaRes.data.size < 1000) {
                        // Es un error JSON, no un docx
                        const text = await actaRes.data.text();
                        console.error('Error generando acta:', text);
                        showNotification('Equipo devuelto. El acta no pudo generarse automáticamente.', 'warning');
                    } else {
                        const url = URL.createObjectURL(new Blob([actaRes.data], {
                            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        }));
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Acta_Devolucion_${empName.replace(/ /g,'_')}_${devDesc.replace(/ /g,'_')}.docx`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showNotification('✓ Acta de devolución descargada', 'success');
                    }
                } catch (err) {
                    console.error('Error descargando acta:', err);
                    showNotification('Equipo devuelto. El acta no pudo generarse automáticamente.', 'warning');
                }
            }
        } catch (err) {
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
        <div className="min-h-screen flex bg-bg text-slate-900 dark:text-slate-200 font-sans selection:bg-accent/30">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 min-w-0">
            <Navbar onAlertClick={() => setIsAlertsOpen(true)} notificationCount={alertsCount} />

            <AlertsPanel isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {activeTab === 'inventory' && (
                <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <DashboardHeaderAccent />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard de Inventario</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona dispositivos, asignaciones y empleados</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Global Location Filter */}
                        <select
                            value={locationFilter}
                            onChange={(e) => { setLocationFilter(e.target.value); setAssignmentsPage(1); }}
                            className="bg-surface border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-accent min-w-[150px]"
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
                            className="bg-accent hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" /> Nuevo Equipo
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    {[
                        { label: 'Kits', Icon: Box, chip: 'bg-device-kit/15 text-device-kit', bar: 'bg-device-kit', a: metrics.assignedKits, t: metrics.totalKits },
                        { label: 'Mochilas', Icon: Briefcase, chip: 'bg-device-backpack/15 text-device-backpack', bar: 'bg-device-backpack', a: metrics.assignedBackpacks, t: metrics.totalBackpacks },
                        { label: 'Auriculares', Icon: Headphones, chip: 'bg-device-headphones/15 text-device-headphones', bar: 'bg-device-headphones', a: metrics.assignedHeadphones, t: metrics.totalHeadphones },
                        { label: 'Monitores', Icon: Tv, chip: 'bg-device-monitor/15 text-device-monitor', bar: 'bg-device-monitor', a: metrics.assignedMonitors, t: metrics.totalMonitors },
                        { label: 'Laptops', Icon: Monitor, chip: 'bg-device-laptop/15 text-device-laptop', bar: 'bg-device-laptop', a: metrics.assignedLaptops, t: metrics.totalLaptops },
                        { label: 'Celulares', Icon: Smartphone, chip: 'bg-device-mobile/15 text-device-mobile', bar: 'bg-device-mobile', a: metrics.assignedMobiles, t: metrics.totalMobiles },
                    ].map(({ label, Icon, chip, bar, a, t }) => {
                        const pct = t ? Math.round((a / t) * 100) : 0;
                        return (
                            <div key={label} className="bg-surface rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${chip}`}>
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    {label}
                                </div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                                    <CountUpNumber value={a} /> <span className="text-sm text-slate-500 font-normal tabular-nums">/ {t}</span>
                                </p>
                                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 mt-3 overflow-hidden">
                                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>


                {/* 2. Controls: Search & Tabs - Grouped Navigation */}
                <div className="flex flex-col md:flex-row justify-end items-center mb-6 gap-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por Serie, Hostname, Nombre, DNI..."
                            className="w-full bg-surface border border-slate-300 dark:border-slate-600 rounded-md py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setAssignmentsPage(1); }}
                        />
                    </div>
                </div>
                </>
                )}

                {/* 3. Content Views */}
                {activeTab === 'inventory' && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        <aside className="lg:w-72 shrink-0 space-y-4">
                            <div className="bg-surface rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/50">
                                <div className="flex gap-6">
                                    <div>
                                        <div className="text-xs text-slate-400">En inventario</div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics.totalKits + metrics.totalBackpacks + metrics.totalHeadphones + metrics.totalMonitors + metrics.totalLaptops + metrics.totalMobiles}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400">Asignados</div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics.assignedKits + metrics.assignedBackpacks + metrics.assignedHeadphones + metrics.assignedMonitors + metrics.assignedLaptops + metrics.assignedMobiles}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/50">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Equipos por tipo</div>
                                <div
                                    style={{ width: '100%', height: 160 }}
                                    data-testid="devices-by-type-chart"
                                    data-chart-labels={JSON.stringify(['Kits', 'Mochilas', 'Auriculares', 'Monitores', 'Laptops', 'Celulares'])}
                                    data-chart-xaxis-angle="-45"
                                >
                                    <ResponsiveContainer>
                                        <AreaChart data={[
                                            { name: 'Kits', value: metrics.assignedKits },
                                            { name: 'Mochilas', value: metrics.assignedBackpacks },
                                            { name: 'Auriculares', value: metrics.assignedHeadphones },
                                            { name: 'Monitores', value: metrics.assignedMonitors },
                                            { name: 'Laptops', value: metrics.assignedLaptops },
                                            { name: 'Celulares', value: metrics.assignedMobiles },
                                        ]} margin={{ top: 5, right: 4, left: -24, bottom: 20 }}>
                                            <defs>
                                                <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#EE7AA0" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="#EE7AA0" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
                                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={22} allowDecimals={false} />
                                            <Tooltip cursor={{ stroke: '#EE7AA0', strokeWidth: 1 }} />
                                            <Area type="monotone" dataKey="value" name="Equipos" stroke="#EE7AA0" strokeWidth={2} fill="url(#roseGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="rounded-2xl p-4 bg-accent text-white">
                                <div className="text-sm font-semibold">Reporte de inventario</div>
                                <div className="text-xs opacity-90 mt-1">Exportá el estado actual del inventario.</div>
                                <button onClick={() => { window.location.href = `${API_URL}/export/excel?token=${token}`; showNotification('✓ Iniciando exportación...', 'success'); }} className="mt-3 bg-white text-accent text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90">Generar</button>
                            </div>
                        </aside>
                        <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex gap-4 mb-2 overflow-x-auto pb-2">
                                {/* Scanner Input */}
                                <ScannerInput onScan={handleScan} placeholder="Escanear código de barras..." />
                            </div>
                        <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto" data-testid="device-table-scroll-container">
                            <table className="w-full min-w-[850px] text-left text-sm text-slate-500 dark:text-slate-400" data-testid="device-table">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
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
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                        <th className="px-4 py-3 align-top w-48" data-testid="model-column-header">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
                                                    onClick={() => handleSort('model')}
                                                >
                                                    <span className="font-semibold text-xs uppercase tracking-wider">Modelo / Marca</span>
                                                    {sortConfig.key === 'model' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />
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
                                        <th className="px-4 py-3 w-40" data-testid="actions-column-header"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {getFilteredDevices().map(device => {
                                        const isSelected = selectedDevices.find(d => d.id === device.id);
                                        return (
                                            <React.Fragment key={device.id}>
                                            <tr
                                                onClick={() => toggleSelection(device)}
                                                className={`hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-accent/10' : ''}`}
                                            >
                                                <td className="px-4 py-3">{getIcon(device.device_type)}</td>
                                                <td
                                                    className="px-4 py-3 text-slate-900 dark:text-white font-medium max-w-[12rem] truncate"
                                                    title={device.model}
                                                    data-testid={`model-cell-${device.id}`}
                                                >
                                                    {device.model}
                                                    <div className="text-xs text-slate-500">{device.brand}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono tabular-nums">{device.serial_number}</td>
                                                <td className="px-4 py-3 font-mono">
                                                    {device.device_type === 'laptop' && device.hostname ? (
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="text-xs bg-device-laptop/20 text-device-laptop px-1.5 py-0.5 rounded"
                                                                title="Hostname"
                                                                data-testid={`hostname-chip-${device.id}`}
                                                            >
                                                                PC
                                                            </span>
                                                            <span className="text-device-laptop">{device.hostname}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono tabular-nums text-slate-300">
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
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${device.status === 'available' ? 'text-green-400 bg-green-500/10' :
                                                        device.status === 'assigned' ? 'text-blue-400 bg-blue-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>{statusES(device.status)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExpandedDeviceId(expandedDeviceId === device.id ? null : device.id); }}
                                                            className="text-slate-400 hover:text-accent transition-colors p-1"
                                                            title={expandedDeviceId === device.id ? 'Ocultar detalle' : 'Ver detalle'}
                                                        >
                                                            {expandedDeviceId === device.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
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
                                            {expandedDeviceId === device.id && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/30">
                                                    <td colSpan={7} className="px-4 py-4">
                                                        <div className="flex flex-col md:flex-row gap-4">
                                                            <div className="w-16 h-16 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                                                                {getIcon(device.device_type)}
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 flex-1 text-sm">
                                                                <div><div className="text-xs text-slate-400">Modelo</div><div className="text-slate-900 dark:text-white">{device.model || '—'}</div></div>
                                                                <div><div className="text-xs text-slate-400">Marca</div><div className="text-slate-900 dark:text-white">{device.brand || '—'}</div></div>
                                                                <div><div className="text-xs text-slate-400">Serie</div><div className="font-mono text-slate-900 dark:text-white">{device.serial_number || '—'}</div></div>
                                                                <div><div className="text-xs text-slate-400">Hostname</div><div className="font-mono text-slate-900 dark:text-white">{device.hostname || '—'}</div></div>
                                                                <div><div className="text-xs text-slate-400">Cód. inventario</div><div className="font-mono text-slate-900 dark:text-white">{device.inventory_code || '—'}</div></div>
                                                                <div><div className="text-xs text-slate-400">Estado</div><div className="text-slate-900 dark:text-white">{statusES(device.status)}</div></div>
                                                                <div><div className="text-xs text-slate-400">Sede</div><div className="text-slate-900 dark:text-white">{device.location || '—'}</div></div>
                                                            </div>
                                                            <button onClick={(e) => handleViewDetails(e, device)} className="self-start text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 flex-shrink-0">
                                                                Ver ficha completa
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {getFilteredDevices().length === 0 && (
                                <EmptyState
                                    title="No se encontraron equipos"
                                    description="Ajusta los filtros de búsqueda o registra un nuevo equipo."
                                />
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
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="space-y-6">
                        {/* Header with employee count and location filter */}
                        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-device-laptop" />
                                <span className="text-slate-900 dark:text-white font-medium">Empleados con Asignaciones</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Export to Excel Button */}
                                <button
                                    onClick={() => {
                                        window.location.href = `${API_URL}/export/assignments-template?token=${token}`;
                                        showNotification('✓ Iniciando exportación...', 'success');
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    title="Exportar asignaciones a Excel"
                                >
                                    <Download className="w-4 h-4" />
                                    Exportar a Excel
                                </button>



                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-400" />
                                    <select
                                        value={assignmentFilter}
                                        onChange={(e) => { setAssignmentFilter(e.target.value); setAssignmentsPage(1); }}
                                        className="bg-surface border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-900 dark:text-white"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="missing_headphones">Sin Auriculares</option>
                                    </select>
                                </div>

                                {/* Location Filter removed - now global in header */}
                                <div className="flex items-center gap-2">
                                </div>
                                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
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
                                        onUnassignDevice={(e, device) => handleUnassignDevice(e, device, emp)}
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

                {activeTab === 'analytics' && <AnalyticsDashboard employees={employees} locationFilter={locationFilter} />}
                {activeTab === 'powerbi' && <PowerBIDashboard locationFilter={locationFilter} />}
                {activeTab === 'actas' && <ActasStatusPage />}
                {activeTab === 'sales' && <SalesPage />}
                {activeTab === 'devoluciones' && <DevolucionesPage />}
                {activeTab === 'active_directory' && <ActiveDirectoryPage />}
                {activeTab === 'toner_requests' && <TonerRequestsPage />}
                {activeTab === 'licenses' && <LicensesPage />}
                {activeTab === 'software' && <SoftwarePage />}
                {activeTab === 'terminations' && <TerminationsPage />}
                {activeTab === 'decommissions' && <DecommissionPage />}
                {activeTab === 'logs' && <AuditLogsPage />}
                {activeTab === 'hr_alerts' && <HRAlertsPage />}
                {activeTab === 'ingresos' && <IngressosPage />}
                {activeTab === 'lanchas' && <LanchasPage />}

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
        </div>
    );
    // Helper to render individual asset card
    function renderAssetCard(asset, isGrouped = false, explicitLabel = null, onViewDetailsOverride = null, onUnassignDeviceOverride = null) {

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
                details.push(<span key="sn" className="text-slate-500">SN: <span className="text-slate-700 dark:text-slate-300 font-mono">{asset.serial_number}</span></span>);
            }
            if (asset.hostname) details.push(<span key="host" className="text-slate-500">Host: <span className="text-slate-700 dark:text-slate-300 font-mono">{asset.hostname}</span></span>);

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

                if (imei) details.push(<span key="imei" className="text-slate-500">IMEI: <span className="text-slate-700 dark:text-slate-300 font-mono">{imei}</span></span>);
                if (phone) details.push(<span key="phone" className="text-slate-500">Tel: <span className="text-slate-700 dark:text-slate-300 font-mono">{phone}</span></span>);
            }

            // Location Badge for Laptops (Casa vs Oficina)
            if (asset.device_type === 'laptop' && asset.location) {
                if (asset.location === 'Casa') {
                    details.push(<span key="loc-home" className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">CASA</span>);
                } else if (asset.location === 'Oficina') {
                    details.push(<span key="loc-office" className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">OFICINA</span>);
                }
            }

            return details;
        };

        return (
            <div key={asset.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isGrouped ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600' : 'bg-surface/50 border-slate-200/50 dark:border-slate-700/50 hover:border-accent/30'}`}>
                <div className="flex items-center gap-3 w-full min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${asset.device_type === 'laptop' ? 'bg-blue-500/15' :
                        asset.device_type === 'monitor' ? 'bg-cyan-500/15' :
                            asset.device_type === 'celular' ? 'bg-green-500/15' :
                                asset.device_type === 'charger' ? 'bg-orange-500/15' :
                                    asset.device_type === 'auriculares' ? 'bg-pink-500/15' :
                                        asset.device_type === 'mochila' ? 'bg-amber-500/15' :
                                            asset.device_type === 'kit teclado/mouse' ? 'bg-purple-500/15' :
                                                'bg-slate-400/15'
                        }`}>
                        {getIcon(asset.device_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                        {label && (
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${typeColorClass}`}>
                                {label}
                            </p>
                        )}
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm leading-tight truncate">
                            <span className="text-slate-500 dark:text-slate-400 font-normal mr-1">{asset.brand}</span>
                            {asset.model}
                        </h4>

                        {/* Details Grid */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] leading-tight item-center">
                            {renderDetails()}
                            {asset.status === 'assigned' && <span className="text-green-600 dark:text-green-400 font-medium text-[10px] border border-green-500/20 px-1 rounded bg-green-500/10 self-center">ACTIVO</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                        onClick={(e) => (onViewDetailsOverride || handleViewDetails)(e, asset)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Ver detalles"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => (onUnassignDeviceOverride || handleUnassignDevice)(e, asset)}
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
