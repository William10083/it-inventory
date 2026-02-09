import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * Componente de filtro estilo Excel para columnas de tabla
 * Muestra un dropdown con checkboxes para filtrar valores únicos
 */
const ExcelFilter = ({
    column,           // Nombre de la columna
    data,             // Array de datos completo
    selectedValues,   // Valores actualmente seleccionados
    onFilterChange,   // Callback cuando cambia el filtro
    placeholder = "Filtrar..."
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Obtener valores únicos de la columna
    const uniqueValues = React.useMemo(() => {
        const values = data
            .map(item => item[column])
            .filter(value => value !== null && value !== undefined && value !== '');

        // Eliminar duplicados y ordenar
        return [...new Set(values)].sort((a, b) => {
            if (typeof a === 'string') return a.localeCompare(b);
            return a - b;
        });
    }, [data, column]);

    // Filtrar valores según búsqueda
    const filteredValues = uniqueValues.filter(value =>
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle selección de un valor
    const toggleValue = (value) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];

        onFilterChange(newSelected);
    };

    // Seleccionar/Deseleccionar todos
    const toggleAll = () => {
        if (selectedValues.length === uniqueValues.length) {
            onFilterChange([]);
        } else {
            onFilterChange(uniqueValues);
        }
    };

    const allSelected = selectedValues.length === uniqueValues.length;
    const someSelected = selectedValues.length > 0 && selectedValues.length < uniqueValues.length;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón de filtro */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${selectedValues.length > 0 && selectedValues.length < uniqueValues.length
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                title={`Filtrar ${column}`}
            >
                <ChevronDown className="w-3 h-3" />
                {selectedValues.length > 0 && selectedValues.length < uniqueValues.length && (
                    <span className="text-xs font-medium">({selectedValues.length})</span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
                    {/* Header con búsqueda */}
                    <div className="p-2 border-b border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={placeholder}
                                className="w-full pl-8 pr-8 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Seleccionar/Deseleccionar todos */}
                    <div className="p-2 border-b border-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 px-2 py-1.5 rounded">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) el.indeterminate = someSelected;
                                }}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-300 font-medium">
                                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                            </span>
                        </label>
                    </div>

                    {/* Lista de valores */}
                    <div className="overflow-y-auto flex-1 p-2">
                        {filteredValues.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                No se encontraron resultados
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredValues.map((value) => (
                                    <label
                                        key={value}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 px-2 py-1.5 rounded transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedValues.includes(value)}
                                            onChange={() => toggleValue(value)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-0"
                                        />
                                        <span className="text-sm text-slate-300 truncate flex-1">
                                            {value}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer con contador */}
                    <div className="p-2 border-t border-slate-700 text-xs text-slate-500">
                        {selectedValues.length} de {uniqueValues.length} seleccionados
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelFilter;
