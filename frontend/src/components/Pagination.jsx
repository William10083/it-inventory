import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    const navBtn = "p-2 rounded-xl text-muted hover:text-accent hover:bg-accent/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200";
    const pageBtn = "min-w-[36px] px-3 py-2 rounded-xl text-sm transition-all duration-200";

    return (
        <div className="flex items-center justify-between px-5 py-3.5 glass-nav border-t border-slate-200/40 dark:border-slate-700/30">
            <div className="text-sm text-muted">
                Mostrando <span className="font-semibold text-slate-900 dark:text-white">{startItem}</span> a{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{endItem}</span> de{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span> resultados
            </div>

            <div className="flex items-center gap-1.5">
                <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className={navBtn} title="Primera página">
                    <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={navBtn} title="Página anterior">
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-muted">...</span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`${pageBtn} ${currentPage === page
                                    ? 'bg-accent text-white font-semibold shadow-soft'
                                    : 'text-muted hover:bg-accent/8 hover:text-accent'
                                }`}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={navBtn} title="Página siguiente">
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className={navBtn} title="Última página">
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
