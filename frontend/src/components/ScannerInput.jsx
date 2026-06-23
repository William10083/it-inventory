import React, { useRef, useEffect } from 'react';
import { Scan } from 'lucide-react';

const ScannerInput = ({ onScan, placeholder = "Scan Barcode...", autoFocus = true }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const value = e.target.value;
            if (value.trim()) {
                onScan(value.trim());
                e.target.value = ''; // Clear after scan
            }
        }
    };

    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-accent">
                <Scan className="w-5 h-5" />
            </div>
            <input
                ref={inputRef}
                type="text"
                className="block w-full p-4 pl-10 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg bg-surface focus:ring-accent focus:border-accent placeholder-slate-400 dark:placeholder-slate-400 focus:ring-2 outline-none transition-all shadow-lg"
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs text-slate-500">Press Enter</span>
            </div>
        </div>
    );
};

export default ScannerInput;
