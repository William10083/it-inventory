import React from 'react';
import { Box } from 'lucide-react';
import ImageBuilder from '../components/ImageBuilder';

const SoftwarePage = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Box className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                        Image Builder
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Construye scripts de aprovisionamiento para los nuevos equipos.</p>
                </div>
            </div>

            <ImageBuilder />
        </div>
    );
};

export default SoftwarePage;
