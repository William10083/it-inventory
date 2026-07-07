import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Controlled, column-def driven table shell. Presentational only:
// sort/filter/pagination state stays in the consumer page (see design's
// "Table primitive is controlled + column-def driven" decision).
//
// columns: { key, header, width?, sortable?, align?, cell?(row), headerCell?() }
// - No pagination logic here — ui/Pagination stays a sibling component.
// - No data fetching here.
// - Semantic tokens only: bg-bg/bg-surface-hover/border-surface-secondary/divide-surface-secondary
//   are mode-invariant CSS custom properties (see index.css) — no raw dark: override needed.
const Table = ({
    columns,
    data,
    sortState,
    onSort,
    renderFilter,
    emptyState,
    rowKey = (row, index) => (row && row.id !== undefined ? row.id : index),
}) => {
    const alignClass = (align) => {
        if (align === 'center') return 'text-center';
        if (align === 'right') return 'text-right';
        return 'text-left';
    };

    const handleHeaderClick = (column) => {
        if (column.sortable && onSort) {
            onSort(column.key);
        }
    };

    return (
        <table className="min-w-full">
            <thead className="bg-bg border-b border-surface-secondary">
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column.key}
                            className={`px-4 py-3 align-top ${alignClass(column.align)} ${column.width || ''}`.trim()}
                        >
                            {column.headerCell ? (
                                column.headerCell()
                            ) : (
                                <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : 'justify-between'}`}>
                                    <div
                                        className={`flex items-center gap-1 ${column.sortable ? 'cursor-pointer hover:text-accent transition-colors group' : ''}`}
                                        onClick={() => handleHeaderClick(column)}
                                    >
                                        <span className="font-semibold text-xs uppercase tracking-wider text-accent/70">
                                            {column.header}
                                        </span>
                                        {column.sortable && (
                                            sortState && sortState.key === column.key ? (
                                                sortState.direction === 'asc' ? (
                                                    <ChevronUp
                                                        data-testid={`sort-icon-${column.key}`}
                                                        data-direction="asc"
                                                        className="w-3 h-3 text-accent"
                                                    />
                                                ) : (
                                                    <ChevronDown
                                                        data-testid={`sort-icon-${column.key}`}
                                                        data-direction="desc"
                                                        className="w-3 h-3 text-accent"
                                                    />
                                                )
                                            ) : (
                                                <div className="w-3 h-3" />
                                            )
                                        )}
                                    </div>
                                    {renderFilter && renderFilter(column)}
                                </div>
                            )}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-surface-secondary">
                {data.length === 0
                    ? emptyState && (
                          <tr>
                              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                                  {emptyState}
                              </td>
                          </tr>
                      )
                    : data.map((row, index) => (
                          <tr key={rowKey(row, index)} className="hover:bg-surface-hover transition-colors">
                              {columns.map((column) => (
                                  <td key={column.key} className={`px-4 py-3 ${alignClass(column.align)}`.trim()}>
                                      {column.cell ? column.cell(row) : row[column.key]}
                                  </td>
                              ))}
                          </tr>
                      ))}
            </tbody>
        </table>
    );
};

export default Table;
