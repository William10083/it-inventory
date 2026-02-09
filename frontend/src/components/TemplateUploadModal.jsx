import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Eye, Save, Settings, Trash2, Star, Plus } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const extractFilename = (tempPath) => {
    if (!tempPath) return 'template.docx';
    // Remove "temp_UUID_" prefix
    const parts = tempPath.split('_');
    return parts.slice(2).join('_') || tempPath;
};

const SYSTEM_FIELDS = [
    { value: 'custom', label: 'Manual / Personalizado', sample: 'Texto libre' },
    { label: '--- Empleado ---', value: 'disabled_1', disabled: true },
    { value: 'EMPLOYEE_NAME', label: 'Nombre Completo', sample: 'GUSTAVO PESCETTO' },
    { value: 'EMPLOYEE_DNI', label: 'DNI / Identificación', sample: '08238728' },
    { value: 'EMPLOYEE_EMAIL', label: 'Email', sample: 'gpescetto@example.com' },
    { value: 'EMPLOYEE_POSITION', label: 'Cargo / Puesto', sample: 'ANALISTA DE SISTEMAS' },
    { value: 'EMPLOYEE_AREA', label: 'Área / Departamento', sample: 'TI' },
    { value: 'EMPLOYEE_COMPANY', label: 'Empresa', sample: 'RANSAC' },
    { value: 'EMPLOYEE_LOCATION', label: 'Sede / Ubicación', sample: 'OFICINA PRINCIPAL' },
    { label: '--- Dispositivo (Principal) ---', value: 'disabled_2', disabled: true },
    { value: 'DEVICE_TYPE', label: 'Tipo de Equipo', sample: 'LAPTOP' },
    { value: 'DEVICE_BRAND', label: 'Marca', sample: 'HP' },
    { value: 'DEVICE_MODEL', label: 'Modelo', sample: 'PROBOOK 440 G9' },
    { value: 'DEVICE_SERIAL', label: 'Número de Serie', sample: '5CG2345678' },
    { value: 'DEVICE_HOSTNAME', label: 'Hostname', sample: 'LAP-IT-01' },
    { value: 'DEVICE_INVENTORY_CODE', label: 'Código de Inventario', sample: 'INV-LAP-001' },
    { label: '--- Fechas ---', value: 'disabled_3', disabled: true },
    { value: 'CURRENT_DATE', label: 'Fecha Actual (dd/mm/yyyy)', sample: '12/01/2026' },
    { value: 'CURRENT_DATE_LONG', label: 'Fecha Larga', sample: '12 de Enero de 2026' },
    { label: '--- Contenido Dinámico ---', value: 'disabled_4', disabled: true },
    { value: 'ACTA_OBSERVATIONS', label: 'Observaciones del Acta', sample: 'El equipo se devuelve incompleto.' },
    { value: 'DEVICE_TABLE', label: 'Tabla de Dispositivos Asignados', sample: '[TABLA_ASIGNACIONES]' },
    { value: 'RETURNED_DEVICES_TABLE', label: 'Tabla de Dispositivos Devueltos', sample: '[TABLA_DEVOLUCION]' },
    { value: 'MOBILE_DEVICES_TABLE', label: 'Tabla de Dispositivos Móviles', sample: '[TABLA_CELULARES]' },
    { value: 'SALE_TABLE', label: 'Tabla de Ventas', sample: '[TABLA_VENTA]' },
    { label: '--- Bajas / Decommission ---', value: 'disabled_5', disabled: true },
    { value: 'FABRICATION_YEAR', label: 'Año de Fabricación', sample: '2020' },
    { value: 'USAGE_TIME', label: 'Tiempo de Uso (Calculado)', sample: '3 años' },
    { value: 'PURCHASE_REASON', label: 'Motivo de Compra', sample: 'Renovación Tecnológica' },
    { value: 'DECOMMISSION_OBSERVATIONS', label: 'Observaciones / Detalle', sample: 'Pantalla rota por caída accidental' },
    { value: 'CURRENT_YEAR', label: 'Año Actual (Sólo Año)', sample: '2026' },
    { value: 'CURRENT_MONTH', label: 'Mes Actual (Nombre)', sample: 'ENERO' },
    { value: 'DEVICE_IMAGE_PATH', label: 'Ruta Imagen Equipo', sample: '/uploads/device.jpg' },
    { value: 'SERIAL_IMAGE_PATH', label: 'Ruta Imagen Serie', sample: '/uploads/serial.jpg' },
    { value: 'DECOMMISSION_TABLE', label: 'Tabla de Baja (Resumen)', sample: '[TABLA_BAJA]' },
];

const TemplateUploadModal = ({ isOpen, onClose, onSuccess, templateToEdit }) => {
    const { showNotification } = useNotification();
    const [step, setStep] = useState(1); // 1: Upload, 2: Configure, 3: Preview, 4: Save
    const [file, setFile] = useState(null);
    const [extractedVars, setExtractedVars] = useState([]);
    const [tempFilename, setTempFilename] = useState('');
    const [variables, setVariables] = useState([]);
    const [templateData, setTemplateData] = useState({
        name: '',
        description: '',
        template_type: 'ASSIGNMENT_COMPUTER'
    });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const isEditing = !!templateToEdit;

    useEffect(() => {
        if (isOpen && templateToEdit) {
            setTemplateData({
                name: templateToEdit.name,
                description: templateToEdit.description || '',
                template_type: templateToEdit.template_type
            });
            if (templateToEdit.variables) {
                setVariables(JSON.parse(templateToEdit.variables));
            }
            setStep(2); // Start at configuration step to allow mapping edits
        } else if (isOpen) {
            // Reset for new template
            setStep(1);
            setTemplateData({ name: '', description: '', template_type: 'ASSIGNMENT_COMPUTER' });
            setVariables([]);
            setFile(null);
        }
    }, [isOpen, templateToEdit]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);


    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.name.endsWith('.docx')) {
            setFile(selected);
        } else {
            showNotification('Solo se permiten archivos .docx', 'error');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}/templates/upload`, formData);
            setExtractedVars(res.data.variables);
            setTempFilename(res.data.temp_path);

            // Initialize variables with labels
            const initialVars = res.data.variables.map(varName => ({
                name: varName,
                label: varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'text',
                sample_value: `Ejemplo de ${varName}`
            }));
            setVariables(initialVars);

            setStep(2);
            showNotification(`${res.data.variables.length} variables detectadas`, 'success');
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al subir archivo', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = async () => {
        setLoading(true);
        try {
            // Create sample data from variables
            const sampleData = {};
            variables.forEach(v => {
                sampleData[v.name] = v.sample_value || `[${v.label}]`;
            });

            // Add MOCK devices for table preview if it's an assignment template
            if (templateData.template_type.startsWith('ASSIGNMENT')) {
                const isMobile = templateData.template_type.includes('MOBILE');
                if (isMobile) {
                    sampleData['_devices_info'] = [
                        { type: 'mobile', brand: 'SAMSUNG', model: 'GALAXY S23', imei: '354412345678901', operator: 'CLARO' },
                        { type: 'chip', brand: 'CLARO', model: '4G LTE', serial: '8951123456789012345' }
                    ];
                } else {
                    sampleData['_devices_info'] = [
                        { type: 'laptop', brand: 'HP', model: 'ELITEBOOK 840', serial: '5CG1234567', hostname: 'LAP-IT-01' },
                        { type: 'monitor', brand: 'DELL', model: 'P2422H', serial: 'CN-0ABCDE-12345' },
                        { type: 'backpack', brand: 'TARGUS', model: 'CLASSIC', serial: 'N/A' }
                    ];
                }
            }

            // Call backend to generate preview PDF from temp file or existing template
            let urlParam = '';
            if (tempFilename) {
                urlParam = `temp_filename=${tempFilename}`;
            } else if (templateToEdit) {
                urlParam = `template_id=${templateToEdit.id}`;
            }

            const res = await axios.post(
                `${API_URL}/templates/upload/preview?${urlParam}`,
                sampleData,
                { responseType: 'blob' }
            );

            // Clean up previous preview URL if exists
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            // Create new preview URL
            // Since backend returns DOCX, we use the correct mime type.
            // Note: Browsers generally download DOCX rather than displaying inline.
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
            setPreviewUrl(url);

            setStep(3);
            showNotification('Preview generado correctamente', 'success');
        } catch (error) {
            console.error('Error generating preview:', error);
            showNotification('Error generando preview', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!templateData.name.trim()) {
            showNotification('El nombre del template es requerido', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: templateData.name,
                description: templateData.description,
                template_type: templateData.template_type,
                variables: JSON.stringify(variables)
            };

            if (isEditing) {
                await axios.put(
                    `${API_URL}/templates/${templateToEdit.id}`,
                    payload,
                    { headers: { 'Content-Type': 'application/json' } }
                );
                showNotification('Template actualizado exitosamente', 'success');
            } else {
                await axios.post(
                    `${API_URL}/templates/?temp_filename=${tempFilename}`,
                    payload,
                    { headers: { 'Content-Type': 'application/json' } }
                );
                showNotification('Template guardado exitosamente', 'success');
            }
            onSuccess();
            handleClose();
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al guardar template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setStep(1);
        setFile(null);
        setExtractedVars([]);
        setVariables([]);
        setTemplateData({ name: '', description: '', template_type: 'ASSIGNMENT_COMPUTER' });
        setPreviewUrl(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {isEditing ? 'Editar Template' : 'Subir Nuevo Template'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {isEditing ? 'Actualiza la información del documento' : `Paso ${step} de 4`}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Step Progress */}
                {!isEditing && (
                    <div className="flex items-center justify-between mb-8">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${s <= step ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {s}
                                </div>
                                {s < 4 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-blue-600' : 'bg-slate-700'}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Selecciona un archivo .docx</h3>
                            <p className="text-slate-400 mb-4">Usa {"{{variable_name}}"} para definir placeholders</p>
                            <input
                                type="file"
                                accept=".docx"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer font-medium"
                            >
                                Seleccionar Archivo
                            </label>
                            {file && (
                                <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-400 inline mr-2" />
                                    <span className="text-white">{file.name}</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors"
                        >
                            {loading ? 'Subiendo...' : 'Continuar'}
                        </button>
                    </div>
                )}

                {/* Step 2: Configure Variables */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Variables Detectadas: {variables.length}</h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {variables.map((variable, index) => (
                                    <div key={index} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* System Mapping (New Field) */}
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Variable: <code className="text-blue-400 font-bold">{`{{${variable.name}}}`}</code>
                                                </label>
                                                <div className="flex gap-2 items-center mb-2">
                                                    <span className="text-sm text-slate-400">Mapear a:</span>
                                                    <select
                                                        value={variable.map_to || 'custom'}
                                                        onChange={(e) => {
                                                            const newVars = [...variables];
                                                            const selectedVal = e.target.value;
                                                            newVars[index].map_to = selectedVal;

                                                            // Auto-fill label and sample if a system field is selected
                                                            const fieldDef = SYSTEM_FIELDS.find(f => f.value === selectedVal);
                                                            if (fieldDef && selectedVal !== 'custom') {
                                                                newVars[index].label = fieldDef.label; // Optional: keep original label or overwrite
                                                                newVars[index].sample_value = fieldDef.sample;
                                                            }

                                                            setVariables(newVars);
                                                        }}
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                                    >
                                                        {SYSTEM_FIELDS.map(f => (
                                                            <option key={f.value} value={f.value} disabled={f.disabled}>
                                                                {f.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Etiqueta (Label)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={variable.label}
                                                    onChange={(e) => {
                                                        const newVars = [...variables];
                                                        newVars[index].label = e.target.value;
                                                        setVariables(newVars);
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                                    placeholder="Label amigable"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                                                <select
                                                    value={variable.type}
                                                    onChange={(e) => {
                                                        const newVars = [...variables];
                                                        newVars[index].type = e.target.value;
                                                        setVariables(newVars);
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                                >
                                                    <option value="text">Texto</option>
                                                    <option value="date">Fecha</option>
                                                    <option value="number">Número</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-slate-300 mb-1 flex justify-between">
                                                    <span>Valor de Ejemplo (para preview)</span>
                                                    <span className="text-xs text-slate-500 font-normal">Se usará el valor real al generar el acta</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={variable.sample_value}
                                                    onChange={(e) => {
                                                        const newVars = [...variables];
                                                        newVars[index].sample_value = e.target.value;
                                                        setVariables(newVars);
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                                    placeholder="Ejemplo: Juan Pérez García"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-lg font-bold"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={handleGeneratePreview}
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold"
                            >
                                {loading ? 'Generando...' : 'Generar Preview'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-blue-400" />
                                    Preview del Template
                                </h3>
                                <p className="text-slate-400 text-sm">Validación con datos de ejemplo</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Variables Sidebar */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-slate-800 p-4 rounded border border-slate-600">
                                        <p className="text-white font-bold text-sm mb-3 border-b border-slate-700 pb-2">Datos de Prueba:</p>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                            {variables.map((v, i) => (
                                                <div key={i} className="text-sm">
                                                    <p className="text-blue-400 font-mono text-xs">{`{{${v.name}}}`}</p>
                                                    <p className="text-slate-300 truncate" title={v.sample_value}>{v.sample_value || '(vacío)'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 text-xs text-blue-300 italic">
                                        Nota: El preview es una representación aproximada del documento final.
                                    </div>
                                </div>

                                {/* PDF Viewer */}
                                <div className="lg:col-span-2 bg-slate-900 rounded-lg border border-slate-600 overflow-hidden h-[500px]">
                                    {previewUrl ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                                            <FileText className="w-16 h-16 mb-4 text-blue-500/50" />
                                            <h4 className="text-lg font-bold text-white mb-2">Vista Previa Generada</h4>
                                            <p className="text-sm mb-6 max-w-sm">
                                                Los archivos .docx no se pueden visualizar directamente en el navegador.
                                                Haz clic abajo para descargar el archivo con los datos de prueba.
                                            </p>
                                            <a
                                                href={previewUrl}
                                                download={`preview_${extractFilename(tempFilename) || 'template.docx'}`}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <Upload className="w-5 h-5 rotate-180" /> {/* Download icon */}
                                                Descargar Preview
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <FileText className="w-12 h-12 mb-2 opacity-20" />
                                            <p>No se pudo cargar el preview</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-lg font-bold"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={() => setStep(4)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Save */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Template *</label>
                            <input
                                type="text"
                                value={templateData.name}
                                onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-3 text-white"
                                placeholder="Ej: Acta de Entrega v2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                            <textarea
                                value={templateData.description}
                                onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-3 text-white h-24"
                                placeholder="Descripción del template..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Template</label>
                            <select
                                value={templateData.template_type}
                                onChange={(e) => setTemplateData({ ...templateData, template_type: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-3 text-white"
                            >
                                <option value="ASSIGNMENT_COMPUTER">Acta de Entrega - Equipo Cómputo</option>
                                <option value="ASSIGNMENT_MOBILE">Acta de Entrega - Celular</option>
                                <option value="RETURN_COMPUTER">Acta de Devolución - Equipo Cómputo</option>
                                <option value="RETURN_MOBILE">Acta de Devolución - Celular</option>
                                <option value="ACTA_BAJA">Acta de Baja (Decommission)</option>
                                <option value="ACTA_VENTA">Acta de Venta</option>
                                <option value="OTROS">Otros</option>
                            </select>
                        </div>
                        <div className="flex gap-4">
                            {!isEditing && (
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-lg font-bold"
                                >
                                    Atrás
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Guardando...' : (isEditing ? 'Actualizar Template' : 'Guardar Template')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateUploadModal;
