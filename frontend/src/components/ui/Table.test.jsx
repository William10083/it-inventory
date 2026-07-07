import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import Table from './Table';

// Guard against any raw dark:+slate pair anywhere in the source (same pattern as Badge.test.jsx).
const hasDarkSlatePair = (source) => /dark:[^\s]*slate/.test(source || '');

const columns = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'status', header: 'Estado', align: 'center', width: 'w-32' },
];

const data = [
    { id: 1, name: 'Alpha', status: 'available' },
    { id: 2, name: 'Beta', status: 'assigned' },
];

describe('Table', () => {
    it('renders column headers', () => {
        render(<Table columns={columns} data={data} />);
        expect(screen.getByText('Nombre')).toBeInTheDocument();
        expect(screen.getByText('Estado')).toBeInTheDocument();
    });

    it('renders a row cell per column using the raw field value when no cell renderer is given', () => {
        render(<Table columns={columns} data={data} />);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText('available')).toBeInTheDocument();
        expect(screen.getByText('assigned')).toBeInTheDocument();
    });

    it('renders a custom cell via column.cell(row)', () => {
        const withCell = [
            { key: 'name', header: 'Nombre', cell: (row) => <strong>{row.name.toUpperCase()}</strong> },
        ];
        render(<Table columns={withCell} data={data} />);
        expect(screen.getByText('ALPHA')).toBeInTheDocument();
        expect(screen.getByText('BETA')).toBeInTheDocument();
    });

    it('renders a custom header via column.headerCell()', () => {
        const withHeaderCell = [
            { key: 'name', header: 'Nombre', headerCell: () => <span data-testid="custom-header">Custom</span> },
        ];
        render(<Table columns={withHeaderCell} data={data} />);
        expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    });

    it('fires onSort(key) when a sortable header is clicked', () => {
        const onSort = vi.fn();
        render(<Table columns={columns} data={data} onSort={onSort} sortState={{ key: null, direction: 'asc' }} />);
        fireEvent.click(screen.getByText('Nombre'));
        expect(onSort).toHaveBeenCalledWith('name');
    });

    it('does not fire onSort for a non-sortable header click', () => {
        const onSort = vi.fn();
        render(<Table columns={columns} data={data} onSort={onSort} />);
        fireEvent.click(screen.getByText('Estado'));
        expect(onSort).not.toHaveBeenCalled();
    });

    it('toggles sort indicator direction based on sortState (asc<->desc semantics live in the consumer)', () => {
        const { rerender } = render(
            <Table columns={columns} data={data} sortState={{ key: 'name', direction: 'asc' }} onSort={() => {}} />
        );
        expect(screen.getByTestId('sort-icon-name')).toHaveAttribute('data-direction', 'asc');

        rerender(
            <Table columns={columns} data={data} sortState={{ key: 'name', direction: 'desc' }} onSort={() => {}} />
        );
        expect(screen.getByTestId('sort-icon-name')).toHaveAttribute('data-direction', 'desc');
    });

    it('renders renderFilter injection per column', () => {
        const renderFilter = (column) => <input data-testid={`filter-${column.key}`} />;
        render(<Table columns={columns} data={data} renderFilter={renderFilter} />);
        expect(screen.getByTestId('filter-name')).toBeInTheDocument();
        expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    });

    it('applies width and align classes to the header cell', () => {
        render(<Table columns={columns} data={data} />);
        const statusHeader = screen.getByText('Estado').closest('th');
        expect(statusHeader.className).toMatch(/w-32/);
        expect(statusHeader.className).toMatch(/text-center/);
    });

    it('renders the emptyState node when data is empty and emptyState is provided', () => {
        render(<Table columns={columns} data={[]} emptyState={<span>Sin resultados</span>} />);
        expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    });

    it('renders nothing extra when data is empty and no emptyState is provided', () => {
        render(<Table columns={columns} data={[]} />);
        expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument();
    });

    it('uses row.id as key when present (no console key warnings) — smoke check via row count', () => {
        render(<Table columns={columns} data={data} />);
        const rows = screen.getAllByRole('row');
        // 1 header row + 2 data rows
        expect(rows).toHaveLength(3);
    });

    it('source contains no raw dark:+slate class pairs (semantic tokens only)', () => {
        const tablePath = path.resolve(__dirname, './Table.jsx');
        const source = readFileSync(tablePath, 'utf-8');
        expect(hasDarkSlatePair(source)).toBe(false);
    });
});
