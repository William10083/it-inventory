import React from 'react';
import { ShoppingBag, X, Check } from 'lucide-react';

const AssignmentCart = ({ selectedDevices, onRemove, onClear, onAssign }) => {
    if (selectedDevices.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4 animation-fade-in-up">
            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-80">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-accent" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Assignment Cart</h3>
                        <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                            {selectedDevices.length}
                        </span>
                    </div>
                    <button
                        onClick={onClear}
                        className="text-muted hover:text-red-500 dark:hover:text-red-400 text-xs"
                    >
                        Clear All
                    </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-1 scrollbar-thin">
                    {selectedDevices.map(device => (
                        <div key={device.id} className="flex justify-between items-center bg-bg p-2 rounded border border-slate-200 dark:border-slate-700">
                            <div className="overflow-hidden">
                                <p className="text-sm text-slate-900 dark:text-white font-medium truncate">{device.model}</p>
                                <p className="text-xs text-slate-500 font-mono truncate">{device.serial_number}</p>
                            </div>
                            <button
                                onClick={() => onRemove(device.id)}
                                className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onAssign}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Check className="w-4 h-4" />
                    Assign {selectedDevices.length} Items
                </button>
            </div>
        </div>
    );
};

export default AssignmentCart;
