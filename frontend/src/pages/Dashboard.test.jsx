import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './Dashboard';

vi.mock('axios');

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ token: 'test-token', user: { id: 1, username: 'tester' } }),
}));

vi.mock('../context/NotificationContext', () => ({
    useNotification: () => ({
        showNotification: vi.fn(),
        showConfirm: vi.fn().mockResolvedValue(true),
    }),
}));

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const mockDevices = [
    {
        id: 1,
        device_type: 'laptop',
        model: 'ThinkPad X1 Carbon Gen 11 Business Ultralight Edition',
        brand: 'Lenovo',
        serial_number: 'SN-0001',
        hostname: 'LT-CALLAO-001',
        inventory_code: 'INV-001',
        status: 'available',
        location: 'Callao',
    },
];

function mockAxiosDefaults() {
    axios.get.mockImplementation((url) => {
        if (url.includes('/devices/filter-options')) {
            return Promise.resolve({ data: { types: [], brands: [], statuses: [], locations: [] } });
        }
        if (url.includes('/devices/')) {
            return Promise.resolve({
                data: { items: mockDevices, total: mockDevices.length, pages: 1 },
            });
        }
        if (url.includes('/employees/')) {
            return Promise.resolve({ data: [] });
        }
        if (url.includes('/alerts/')) {
            return Promise.resolve({ data: [] });
        }
        if (url.includes('/companies/')) {
            return Promise.resolve({ data: [] });
        }
        if (url.includes('/analytics/')) {
            return Promise.resolve({
                data: {
                    devices: {
                        laptop: { total: 5, assigned: 2, available: 3 },
                        monitor: { total: 2, assigned: 1 },
                        celular: { total: 1, assigned: 0 },
                        'kit teclado/mouse': { total: 0, assigned: 0 },
                        auriculares: { total: 0, assigned: 0 },
                        mochila: { total: 0, assigned: 0 },
                    },
                },
            });
        }
        return Promise.resolve({ data: {} });
    });
}

function renderDashboard() {
    return render(
        <MemoryRouter>
            <Dashboard />
        </MemoryRouter>
    );
}

describe('Dashboard device table layout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAxiosDefaults();
    });

    it('1.1 renders the actions column header with an adequate width class and a scrollable table container', async () => {
        renderDashboard();

        const actionsHeader = await screen.findByTestId('actions-column-header');
        // w-24 (96px) clips the "Detalles" button at 963px; require w-32+ (128px min).
        expect(actionsHeader.className).toMatch(/\bw-(3[2-9]|[4-9]\d|\d{3,})\b/);

        const scrollContainer = actionsHeader.closest('[data-testid="device-table-scroll-container"]');
        expect(scrollContainer).not.toBeNull();
        expect(scrollContainer.className).toMatch(/overflow-x-auto/);
    });

    it('1.3 declares a min-width on the device table so columns do not compress', async () => {
        renderDashboard();
        const table = await screen.findByTestId('device-table');
        const hasMinWidthClass = /min-w-\[/.test(table.className);
        const hasInlineMinWidth = !!table.style.minWidth;
        expect(hasMinWidthClass || hasInlineMinWidth).toBe(true);
    });

    it('1.4 declares an explicit width on the MODELO/MARCA column header', async () => {
        renderDashboard();
        const modelHeader = await screen.findByTestId('model-column-header');
        expect(modelHeader.className).toMatch(/\bw-\d/);
    });

    it('1.5 truncates long model text and exposes the full text via title attribute', async () => {
        renderDashboard();
        const modelCell = await screen.findByTestId('model-cell-1');
        expect(modelCell.className).toMatch(/truncate/);
        expect(modelCell.getAttribute('title')).toBe(mockDevices[0].model);
    });

    it('1.8 uses the device-hue chip pattern (not raw blue-500/blue-300) for the hostname chip', async () => {
        renderDashboard();
        const chip = await screen.findByTestId('hostname-chip-1');
        expect(chip.className).not.toMatch(/bg-blue-500\/20/);
        expect(chip.className).not.toMatch(/text-blue-300/);
        expect(chip.className).toMatch(/device-laptop/);
    });
});

describe('Dashboard equipment-by-type chart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAxiosDefaults();
    });

    it('1.6/1.7 uses full category labels (not truncated forms) and rotates the XAxis for readability', async () => {
        // recharts' ResponsiveContainer needs real layout to render SVG ticks, which jsdom
        // does not provide — so the chart wrapper exposes its label set + XAxis angle via
        // data attributes for reliable assertion (see Dashboard.jsx chart container).
        renderDashboard();
        const chartWrapper = await screen.findByTestId('devices-by-type-chart');

        const labels = JSON.parse(chartWrapper.getAttribute('data-chart-labels'));
        expect(labels).toEqual(
            expect.arrayContaining(['Kits', 'Mochilas', 'Auriculares', 'Monitores', 'Laptops', 'Celulares'])
        );
        expect(labels).not.toEqual(expect.arrayContaining(['Moch', 'Aur']));

        expect(chartWrapper.getAttribute('data-chart-xaxis-angle')).toBe('-45');
    });
});
