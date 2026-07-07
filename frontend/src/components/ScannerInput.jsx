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
                e.target.value = '';
            }
        }
    };

    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-accent">
                <Scan className="w-5 h-5" />
            </div>
            <input
                ref={inputRef}
                type="text"
                className="block w-full p-3.5 pl-11 text-sm text-slate-900 dark:text-white border border-slate-300/50 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-white/5 placeholder:text-muted focus-ring transition-all duration-200 shadow-soft"
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                <kbd className="text-[10px] font-mono text-muted bg-slate-100/60 dark:bg-slate-700/40 px-1.5 py-0.5 rounded">Enter</kbd>
            </div>
        </div>
    );
};

export default ScannerInput;
