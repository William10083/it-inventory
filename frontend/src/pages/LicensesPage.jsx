import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Shield, FolderKey, Loader2, AlertCircle, KeyRound, User, Database, BarChart2, Lock, GitCompare, Copy, FileDown } from 'lucide-react';
import XLSXStyle from 'xlsx-js-style';
import SoftwareList from '../components/SoftwareList';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SAP_LICENSE_MAP = { P: 'Professional', F: 'Ltd Financials', L: 'Ltd Logistics' };
const SAP_LICENSE_CLS = { P: 'text-emerald-600 dark:text-emerald-400', F: 'text-sky-600 dark:text-sky-400', L: 'text-violet-600 dark:text-violet-400' };

function getSapLicense(name) {
    const m = (name || '').match(/\(([PFL])\)\s*$/);
    if (m) return { label: SAP_LICENSE_MAP[m[1]], cls: SAP_LICENSE_CLS[m[1]], key: m[1] };
    if (/\(Desarrollo\)\s*$/i.test(name || '')) return { label: 'Professional', cls: 'text-emerald-600 dark:text-emerald-400', key: 'P' };
    return { label: 'Sin licencia', cls: 'text-slate-500 italic', key: null };
}

const LicensesPage = () => {
    const [activeSubTab, setActiveSubTab] = useState('m365'); // 'm365' | 'sap' | 'otros'
    const [searchTerm, setSearchTerm] = useState('');
    const [allLicenses, setAllLicenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // SAP state
    const SAP_COMPANIES = ['TAM', 'ULOG', 'TLS', 'AMK', 'MALLK', 'UMIN'];
    const [sapCompany, setSapCompany] = useState('RESUMEN');  // 'RESUMEN' = sub-tab resumen
    const [sapUsers, setSapUsers] = useState([]);
    const [sapLoading, setSapLoading] = useState(false);
    const [sapError, setSapError] = useState(null);
    const [sapSearch, setSapSearch] = useState('');

    // SAP Resumen state
    const [sapResumen, setSapResumen] = useState(null);
    const [sapResumenLoading, setSapResumenLoading] = useState(false);
    const [sapResumenError, setSapResumenError] = useState(null);

    useEffect(() => {
        if (activeSubTab === 'm365' && allLicenses.length === 0) {
            fetchAllLicenses();
        }
        if (activeSubTab === 'sap') {
            fetchSapResumen();
        }
    }, [activeSubTab]);

    const fetchAllLicenses = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/m365/licenses`);
            setAllLicenses(res.data);
        } catch (err) {
            console.error("Error fetching m365 licenses:", err);
            setError(err.response?.data?.detail || "Error al cargar las licencias");
        } finally {
            setLoading(false);
        }
    };

    const getLicenseColor = (name) => {
        if (!name) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
        const lower = name.toLowerCase();
        if (lower.includes('premium') || lower.includes('e5')) return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
        if (lower.includes('standard') || lower.includes('e3') || lower.includes('e4')) return 'bg-blue-500/20 text-accent border-blue-500/30';
        if (lower.includes('basic') || lower.includes('f1')) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
        if (lower.includes('project')) return 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30';
        if (lower.includes('visio')) return 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30';
        if (lower.includes('fabric') || lower.includes('power bi')) return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
        return 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
    };

    const fetchSapUsers = async (company = sapCompany) => {
        setSapLoading(true);
        setSapError(null);
        setSapUsers([]);
        try {
            const res = await axios.get(`${API_URL}/sap/users`, { params: { company } });
            setSapUsers(res.data.users);
        } catch (err) {
            setSapError(err.response?.data?.detail || "Error al conectar con SAP HANA");
        } finally {
            setSapLoading(false);
        }
    };

    const fetchSapResumen = async () => {
        setSapResumenLoading(true);
        setSapResumenError(null);
        try {
            const res = await axios.get(`${API_URL}/sap/resumen`);
            setSapResumen(res.data);
        } catch (err) {
            setSapResumenError(err.response?.data?.detail || "Error al generar resumen SAP");
        } finally {
            setSapResumenLoading(false);
        }
    };

    const exportSapResumenExcel = () => {
        if (!sapResumen) return;
        const cos = Object.keys(sapResumen.empresas_consultadas);
        const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const wb = XLSXStyle.utils.book_new();

        // ── Estilos ─────────────────────────────────────────────────────
        const HDR_MAIN = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '1E3A5F' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: '2563EB' } } } };
        const HDR_CO   = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '92400E' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'F59E0B' } } } };
        const HDR_WARN = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'A78BFA' } } } };
        const CELL     = (rgb) => ({ font: { sz: 10 }, fill: { fgColor: { rgb } }, alignment: { vertical: 'center' }, border: { right: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } } });
        const CELL_CTR = (rgb) => ({ ...CELL(rgb), alignment: { horizontal: 'center', vertical: 'center' } });
        const ACTIVO   = { ...CELL_CTR('D1FAE5'), font: { sz: 10, color: { rgb: '065F46' }, bold: true } };
        const BLOQ     = { ...CELL_CTR('FEE2E2'), font: { sz: 10, color: { rgb: '991B1B' }, bold: true } };
        const DASH     = { ...CELL_CTR('F8FAFC'), font: { sz: 10, color: { rgb: '94A3B8' } } };
        const CESADO   = { ...CELL('FEF3C7'), font: { sz: 10, color: { rgb: '92400E' }, bold: true } };
        const DUPL     = { ...CELL('EDE9FE'), font: { sz: 10, color: { rgb: '4C1D95' } } };
        const ROW_ODD  = 'F8FAFC';
        const ROW_EVEN = 'FFFFFF';

        const mkCell = (v, style) => ({ v: v ?? '', t: 's', s: style });

        const buildSheet = (headers, mainHdrs, coHdrs, warnHdrs, rows, colWidths) => {
            const ws = {};
            const R = 0;
            // headers row
            headers.forEach((h, C) => {
                const isMain = mainHdrs.includes(h);
                const isCo   = coHdrs.includes(h);
                ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = mkCell(h, isMain ? HDR_MAIN : isCo ? HDR_CO : HDR_WARN);
            });
            rows.forEach((row, ri) => {
                const bg = ri % 2 === 0 ? ROW_ODD : ROW_EVEN;
                headers.forEach((h, C) => {
                    const v = row[h] ?? '';
                    let s = CELL(bg);
                    if (coHdrs.includes(h)) {
                        s = v === 'Activo' ? ACTIVO : v === 'Bloqueado' ? BLOQ : DASH;
                    } else if (h === 'Cesado' && v === 'SÍ') {
                        s = CESADO;
                    } else if (h === 'Duplicado' && v) {
                        s = DUPL;
                    } else if (h === 'Código') {
                        s = { ...CELL(bg), font: { sz: 10, bold: true, color: { rgb: '1E40AF' } } };
                    } else if (warnHdrs && warnHdrs.includes(h)) {
                        s = { ...CELL_CTR(bg), font: { sz: 10, color: { rgb: 'D97706' } } };
                    }
                    ws[XLSXStyle.utils.encode_cell({ r: ri + 1, c: C })] = mkCell(String(v), s);
                });
            });
            ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } });
            ws['!cols'] = colWidths;
            ws['!freeze'] = { xSplit: 0, ySplit: 1 };
            return ws;
        };

        // ── Hoja 1: Activos ──────────────────────────────────────────────
        const actHdrs   = ['Código', 'Nombre', 'Correo', 'Departamento', 'Sucursal', 'Licencia', 'Cesado', 'Duplicado', ...cos];
        const actRows   = sapResumen.activos.map(u => {
            const r = { Código: u.user_code, Nombre: u.nombre, Correo: u.email, Departamento: u.departamento, Sucursal: u.sucursal, Licencia: getSapLicense(u.nombre).label, Cesado: u.cesado ? 'SÍ' : 'No', Duplicado: u.duplicado_de?.length ? `Dup: ${u.duplicado_de.join(', ')}` : '' };
            cos.forEach(co => { r[co] = u.empresas_activo.includes(co) ? 'Activo' : u.empresas_bloqueado.includes(co) ? 'Bloqueado' : '—'; });
            return r;
        });
        const actCols   = [{ wch: 10 }, { wch: 28 }, { wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 22 }, ...cos.map(() => ({ wch: 11 }))];
        XLSXStyle.utils.book_append_sheet(wb, buildSheet(actHdrs, ['Código','Nombre','Correo','Departamento','Sucursal','Licencia','Cesado','Duplicado'], cos, [], actRows, actCols), '✅ Activos');

        // ── Hoja 2: Inconsistencias ──────────────────────────────────────
        const inconsHdrs = ['Código', 'Nombre', 'Campo', ...cos];
        const inconsRows = [];
        sapResumen.inconsistencias.forEach(item => {
            item.diferencias.forEach(d => {
                const r = { Código: item.user_code, Nombre: item.nombre, Campo: d.campo };
                cos.forEach(co => { r[co] = d.valores[co] ?? '—'; });
                inconsRows.push(r);
            });
        });
        const inconsCols = [{ wch: 10 }, { wch: 28 }, { wch: 16 }, ...cos.map(() => ({ wch: 18 }))];
        XLSXStyle.utils.book_append_sheet(wb, buildSheet(inconsHdrs, ['Código','Nombre','Campo'], cos, [], inconsRows, inconsCols), '⚠️ Inconsistencias');

        // ── Hoja 3: Bloqueados ───────────────────────────────────────────
        const bloquHdrs = ['Código', 'Nombre', 'Licencia', ...cos];
        const bloquRows = sapResumen.bloqueados.map(b => {
            const r = { Código: b.user_code, Nombre: b.nombre, Licencia: getSapLicense(b.nombre).label };
            cos.forEach(co => { r[co] = b.empresas.includes(co) ? 'Bloqueado' : '—'; });
            return r;
        });
        const bloquCols = [{ wch: 10 }, { wch: 28 }, { wch: 20 }, ...cos.map(() => ({ wch: 11 }))];
        XLSXStyle.utils.book_append_sheet(wb, buildSheet(bloquHdrs, ['Código','Nombre','Licencia'], cos, [], bloquRows, bloquCols), '🔒 Bloqueados');

        XLSXStyle.writeFile(wb, `SAP_Resumen_${fecha.replace(/\//g, '-')}.xlsx`);
    };

    const filteredUsers = allLicenses.filter(u => {
        const term = searchTerm.toLowerCase();
        return (u.display_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    });

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <KeyRound className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                        Licencias
                    </h1>
                    <p className="text-muted mt-1">Gestiona licencias Microsoft 365 y otras licencias de software</p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex bg-surface/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-fit">
                <button
                    onClick={() => setActiveSubTab('m365')}
                    className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeSubTab === 'm365'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <Shield className="w-4 h-4" />
                    Microsoft 365
                </button>
                <button
                    onClick={() => setActiveSubTab('sap')}
                    className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeSubTab === 'sap'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                        : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    SAP
                </button>
                <button
                    onClick={() => setActiveSubTab('otros')}
                    className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeSubTab === 'otros'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                >
                    <FolderKey className="w-4 h-4" />
                    Otros
                </button>
            </div>

            {/* Microsoft 365 Tab */}
            {activeSubTab === 'm365' && (
                <div className="space-y-6">

                    {/* Search & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Filtrar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-muted text-sm font-medium">
                                Total Usuarios: <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded ml-1">{allLicenses.length}</strong>
                            </span>
                            <button
                                onClick={fetchAllLicenses}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Refrescar
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
                            <span className="ml-3 text-muted">Consultando licencias globales...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                            <span className="text-red-600 dark:text-red-300 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Desktop Table View */}
                    {!loading && !error && filteredUsers.length > 0 && (
                        <div className="bg-surface/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg">
                            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-bg border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Usuario</th>
                                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Email Principal</th>
                                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Licencias Asignadas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group">
                                                <td className="p-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-4 h-4 text-muted" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                                                            {user.display_name || 'Sin nombre'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <span className="text-sm text-muted">
                                                        {user.email || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-wrap gap-2">
                                                        {user.licenses?.length > 0 ? (
                                                            user.licenses.map((lic, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2.5 py-1 text-xs font-medium border rounded-md ${getLicenseColor(lic.license_name)}`}
                                                                    title={lic.sku_part_number}
                                                                >
                                                                    {lic.license_name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-500 italic">Ninguna</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !error && filteredUsers.length === 0 && allLicenses.length > 0 && (
                        <div className="text-center py-12 bg-surface/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-muted">No se encontraron usuarios coincidiendo con "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* SAP Tab */}
            {activeSubTab === 'sap' && (
                <div className="space-y-4">
                    {/* SAP company sub-tabs */}
                    <div className="flex bg-bg/60 rounded-lg p-1 border border-slate-200 dark:border-slate-700/50 w-fit gap-1 flex-wrap">
                        <button
                            onClick={() => { setSapCompany('RESUMEN'); if (!sapResumen) fetchSapResumen(); }}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${sapCompany === 'RESUMEN'
                                ? 'bg-blue-500/20 text-accent border border-blue-500/40'
                                : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            Resumen
                        </button>
                        {SAP_COMPANIES.map(co => (
                            <button
                                key={co}
                                onClick={() => { setSapCompany(co); setSapSearch(''); fetchSapUsers(co); }}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${sapCompany === co
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                                    : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {co}
                            </button>
                        ))}
                    </div>

                    {sapCompany !== 'RESUMEN' && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    className="w-full bg-bg border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Filtrar por usuario..."
                                    value={sapSearch}
                                    onChange={(e) => setSapSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-muted text-sm font-medium">
                                    {sapCompany} — Usuarios activos: <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded ml-1">{sapUsers.length}</strong>
                                </span>
                                <button
                                    onClick={() => fetchSapUsers(sapCompany)}
                                    disabled={sapLoading}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {sapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    Actualizar
                                </button>
                            </div>
                        </div>
                    )}

                    {sapCompany !== 'RESUMEN' && sapLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin" />
                            <span className="ml-3 text-muted">Consultando SAP HANA...</span>
                        </div>
                    )}

                    {sapCompany !== 'RESUMEN' && sapError && !sapLoading && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                            <span className="text-red-600 dark:text-red-300 text-sm">{sapError}</span>
                        </div>
                    )}

                    {sapCompany !== 'RESUMEN' && !sapLoading && !sapError && sapUsers.length > 0 && (() => {
                        const filtered = sapUsers.filter(u =>
                            (u.USER_CODE?.toLowerCase().includes(sapSearch.toLowerCase())) ||
                            (u.U_NAME?.toLowerCase().includes(sapSearch.toLowerCase())) ||
                            (u.E_Mail?.toLowerCase().includes(sapSearch.toLowerCase()))
                        );
                        return (
                            <div className="bg-surface/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg">
                                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-bg border-b border-slate-200 dark:border-slate-700">
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Código</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Nombre</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Correo</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Departamento</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Sucursal</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Licencia</th>
                                                <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Último Login</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                            {filtered.map((user) => {
                                                const isLocked = user.Locked === 'Y';
                                                return (
                                                    <tr key={user.USER_CODE} className={`transition-colors group ${isLocked ? 'bg-red-100/40 dark:bg-red-950/20 opacity-60' : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'}`}>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isLocked ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                                                                    {isLocked ? <Lock className="w-4 h-4 text-red-500 dark:text-red-400" /> : <User className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                                                                </div>
                                                                <div>
                                                                    <span className={`text-sm font-mono font-medium ${isLocked ? 'text-red-500 dark:text-red-400 line-through' : 'text-amber-600 dark:text-amber-300 group-hover:text-amber-700 dark:group-hover:text-amber-200'} transition-colors`}>
                                                                        {user.USER_CODE}
                                                                    </span>
                                                                    {isLocked && <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-500/70 dark:text-red-400/70 font-normal"><Lock className="w-3 h-3" />bloqueado</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={`p-4 text-sm ${isLocked ? 'text-muted' : 'text-slate-900 dark:text-white'}`}>{user.U_NAME || <span className="italic text-muted">—</span>}</td>
                                                        <td className={`p-4 text-sm ${isLocked ? 'text-muted' : 'text-muted'}`}>{user.E_Mail || <span className="italic text-muted">—</span>}</td>
                                                        <td className={`p-4 text-sm ${isLocked ? 'text-muted' : 'text-muted'}`}>{user.DEPT_NAME || <span className="italic text-muted">—</span>}</td>
                                                        <td className={`p-4 text-sm ${isLocked ? 'text-muted' : 'text-muted'}`}>{user.Branch != null && user.Branch !== '' ? user.Branch : <span className="italic text-muted">—</span>}</td>
                                                        <td className="p-4 text-sm">
                                                            {(() => {
                                                                const lic = getSapLicense(user.U_NAME);
                                                                const cls = isLocked ? 'text-muted italic' : lic.cls;
                                                                return <span className={`text-xs font-medium ${cls}`}>{lic.label}</span>;
                                                            })()}
                                                        </td>
                                                        <td className={`p-4 text-sm ${isLocked ? 'text-muted' : 'text-muted'}`}>
                                                            {user.lastLogin
                                                                ? new Date(user.lastLogin).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                                                : <span className="italic text-muted">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {filtered.length === 0 && sapSearch && (
                                    <div className="text-center py-8 text-muted text-sm">
                                        No hay usuarios que coincidan con "{sapSearch}"
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Resumen panel */}
                    {sapCompany === 'RESUMEN' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {sapResumenLoading && <><Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" /><span className="text-muted text-sm">Consultando las 5 empresas...</span></>}
                                    {sapResumen && !sapResumenLoading && (
                                        <div className="flex gap-4 flex-wrap">
                                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                                                <User className="w-4 h-4" /> {sapResumen.total_activos} activos
                                            </span>
                                            <span className="bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                                                <GitCompare className="w-4 h-4" /> {sapResumen.total_inconsistencias} inconsistencias
                                            </span>
                                            <span className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                                                <Lock className="w-4 h-4" /> {sapResumen.total_bloqueados} bloqueados
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {sapResumen && !sapResumenLoading && (
                                        <button onClick={exportSapResumenExcel}
                                            className="px-4 py-2 bg-emerald-600/20 dark:bg-emerald-700/60 hover:bg-emerald-600/30 dark:hover:bg-emerald-600/70 text-emerald-700 dark:text-emerald-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-emerald-600/40">
                                            <FileDown className="w-4 h-4" />
                                            Exportar Excel
                                        </button>
                                    )}
                                    <button onClick={fetchSapResumen} disabled={sapResumenLoading}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {sapResumenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                                        Actualizar
                                    </button>
                                </div>
                            </div>

                            {sapResumenError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                                    <span className="text-red-600 dark:text-red-300 text-sm">{sapResumenError}</span>
                                </div>
                            )}

                            {sapResumen && !sapResumenLoading && (
                                <>
                                    {/* Conteo por empresa */}
                                    <div className="grid grid-cols-6 gap-3">
                                        {Object.entries(sapResumen.empresas_consultadas).map(([co, total]) => (
                                            <div key={co} className="bg-surface/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                                                <div className="text-amber-600 dark:text-amber-300 font-bold text-lg">{co}</div>
                                                <div className="text-slate-900 dark:text-white text-2xl font-bold">{total}</div>
                                                <div className="text-muted text-xs mt-1">usuarios US*</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Usuarios activos */}
                                    {sapResumen.activos?.length > 0 && (() => {
                                        const allCos = Object.keys(sapResumen.empresas_consultadas);
                                        return (
                                            <div className="bg-surface/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                                    <span className="text-slate-900 dark:text-white font-semibold">Usuarios activos</span>
                                                    <span className="text-muted text-sm">({sapResumen.activos.length} usuarios)</span>
                                                </div>
                                                <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-bg border-b border-slate-200 dark:border-slate-700">
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Código</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Nombre</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Correo</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Departamento</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Sucursal</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Licencia</th>
                                                                {allCos.map(co => (
                                                                    <th key={co} className="p-3 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase text-center">{co}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                                            {sapResumen.activos.map(u => (
                                                                <tr key={u.user_code} className="hover:bg-slate-100 dark:hover:bg-slate-800/60">
                                                                    <td className="p-3 font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">{u.user_code}</td>
                                                                    <td className="p-3 text-sm">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-slate-900 dark:text-white">{u.nombre || <span className="italic text-muted">—</span>}</span>
                                                                            {u.cesado && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40">
                                                                                    <AlertCircle className="w-3 h-3" />Usuario cesado
                                                                                </span>
                                                                            )}
                                                                            {u.duplicado_de?.length > 0 && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/40" title={`Mismo correo que: ${u.duplicado_de.join(', ')}`}>
                                                                                    <Copy className="w-3 h-3" />Duplicado de {u.duplicado_de.join(', ')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-sm text-muted">{u.email || <span className="italic text-muted">—</span>}</td>
                                                                    <td className="p-3 text-sm text-muted">{u.departamento || <span className="italic text-muted">—</span>}</td>
                                                                    <td className="p-3 text-sm text-muted">{u.sucursal || <span className="italic text-muted">—</span>}</td>
                                                                    <td className="p-3 text-sm">{(() => {
                                                                        const lic = getSapLicense(u.nombre);
                                                                        return <span className={`text-xs font-medium ${lic.cls}`}>{lic.label}</span>;
                                                                    })()}</td>
                                                                    {allCos.map(co => (
                                                                        <td key={co} className="p-3 text-center">
                                                                            {u.empresas_activo.includes(co) ? (
                                                                                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold" title="Activo">✓</span>
                                                                            ) : u.empresas_bloqueado.includes(co) ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30" title="Bloqueado en esta empresa">
                                                                                    <Lock className="w-3 h-3" />
                                                                                </span>
                                                                            ) : (
                                                                                <span className="italic text-muted text-xs">—</span>
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Inconsistencias — tabla matricial */}
                                    {sapResumen.inconsistencias.length > 0 && (() => {
                                        const allCos = Object.keys(sapResumen.empresas_consultadas);
                                        // Valor mayoritario: el que más se repite entre empresas
                                        const majority = (valores) => {
                                            const freq = {};
                                            Object.values(valores).forEach(v => { freq[v] = (freq[v] || 0) + 1; });
                                            return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
                                        };
                                        return (
                                            <div className="bg-surface/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <GitCompare className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                                                        <span className="text-slate-900 dark:text-white font-semibold">Inconsistencias entre empresas</span>
                                                        <span className="text-muted text-sm">({sapResumen.inconsistencias.length} usuarios)</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>Coincide con mayoría</span>
                                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>Valor diferente</span>
                                                        <span className="flex items-center gap-1 text-slate-500 border border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 px-1.5 py-0.5 rounded italic">sin dato</span>
                                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded"><Lock className="w-3 h-3" />bloqueado</span>
                                                        <span className="flex items-center gap-1 text-muted italic">—&nbsp;no existe</span>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-bg/80 border-b border-slate-200 dark:border-slate-700">
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase sticky left-0 bg-bg/80 min-w-[120px]">Usuario</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase min-w-[90px]">Campo</th>
                                                                {allCos.map(co => (
                                                                    <th key={co} className="p-3 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase text-center min-w-[140px]">{co}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sapResumen.inconsistencias.map((item) => (
                                                                item.diferencias.map((d, di) => {
                                                                    const maj = majority(d.valores);
                                                                    return (
                                                                        <tr key={`${item.user_code}-${d.campo}`}
                                                                            className={`border-b border-slate-200 dark:border-slate-700/40 ${di === 0 ? 'border-t-2 border-t-slate-400 dark:border-t-slate-600' : ''} hover:bg-slate-100 dark:hover:bg-slate-800/60`}>
                                                                            {di === 0 && (
                                                                                <td className="p-3 sticky left-0 bg-surface/90" rowSpan={item.diferencias.length}>
                                                                                    <div className="font-mono font-bold text-amber-600 dark:text-amber-300 text-sm">{item.user_code}</div>
                                                                                    <div className="text-muted text-xs mt-0.5 max-w-[100px] truncate">{item.nombre}</div>
                                                                                </td>
                                                                            )}
                                                                            <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{d.campo}</td>
                                                                            {allCos.map(co => {
                                                                                const val = d.valores[co];
                                                                                const exists = val !== undefined;
                                                                                const isBlocked = !exists && (item.bloqueado_en || []).includes(co);
                                                                                const hasValue = exists && val !== '';
                                                                                const matches = hasValue && val === maj;
                                                                                return (
                                                                                    <td key={co} className="p-3 text-center">
                                                                                        {isBlocked ? (
                                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30" title="Usuario bloqueado en esta empresa">
                                                                                                <Lock className="w-3 h-3" />bloqueado
                                                                                            </span>
                                                                                        ) : !exists ? (
                                                                                            <span className="text-muted text-xs italic" title="Usuario no existe en esta empresa">—</span>
                                                                                        ) : !hasValue ? (
                                                                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs italic text-slate-500 border border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40" title="Campo vacío">sin dato</span>
                                                                                        ) : (
                                                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium max-w-[130px] truncate ${matches
                                                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                                                                                    : 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                                                                                                }`} title={val}>
                                                                                                {matches ? '✓' : '⚠'} {val}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    );
                                                                })
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Bloqueados */}
                                    {sapResumen.bloqueados.length > 0 && (() => {
                                        const allCos = Object.keys(sapResumen.empresas_consultadas);
                                        const rows = sapResumen.bloqueados;
                                        return (
                                            <div className="bg-surface/50 border border-red-300 dark:border-red-900/30 rounded-xl overflow-hidden">
                                                <div className="px-5 py-3 border-b border-red-300 dark:border-red-900/30 flex items-center gap-2">
                                                    <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                    <span className="text-slate-900 dark:text-white font-semibold">Usuarios bloqueados en todas sus empresas</span>
                                                    <span className="text-muted text-sm">({rows.length} usuarios)</span>
                                                </div>
                                                <div className="overflow-y-auto max-h-[400px]">
                                                    <table className="w-full text-left">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-bg border-b border-slate-200 dark:border-slate-700">
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Código</th>
                                                                <th className="p-3 text-xs font-semibold text-muted uppercase">Nombre</th>
                                                                {allCos.map(co => (
                                                                    <th key={co} className="p-3 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase text-center">{co}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                                            {rows.map(b => (
                                                                <tr key={b.user_code} className="bg-red-100/40 dark:bg-red-950/10 hover:bg-red-100/70 dark:hover:bg-red-950/20">
                                                                    <td className="p-3 font-mono text-sm font-semibold text-red-600 dark:text-red-400 line-through">{b.user_code}</td>
                                                                    <td className="p-3 text-sm text-muted">{b.nombre || <span className="italic text-muted">—</span>}</td>
                                                                    {allCos.map(co => (
                                                                        <td key={co} className="p-3 text-center">
                                                                            {b.empresas.includes(co)
                                                                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30" title="Bloqueado">
                                                                                    <Lock className="w-3 h-3" /> bloqueado
                                                                                  </span>
                                                                                : <span className="italic text-muted text-xs">—</span>}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {sapResumen.inconsistencias.length === 0 && sapResumen.bloqueados.length === 0 && (
                                        <div className="text-center py-12 text-muted">
                                            Sin inconsistencias ni usuarios bloqueados.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Otros Tab */}
            {activeSubTab === 'otros' && <SoftwareList />}
        </div>
    );
};

export default LicensesPage;
