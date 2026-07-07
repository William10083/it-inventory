import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

// Guard against any raw dark:+slate pair anywhere in a class string.
const hasDarkSlatePair = (className) => /dark:[^\s]*slate/.test(className || '');

// Background is either an opacity-suffixed semantic hue (`bg-green-500/10`,
// `bg-device-laptop/20`) or a dedicated surface token (`bg-surface-secondary`) —
// both are token-based, theme-coherent backgrounds with no raw dark: override.
const hasTokenBackground = (className) => /bg-\S+\/\d+|bg-surface-\S+/.test(className || '');

describe('Badge', () => {
    describe('status variants', () => {
        it.each([
            ['available', 'Disponible'],
            ['assigned', 'Asignado'],
            ['retired', 'Retirado'],
            ['maintenance', 'Mantenimiento'],
            ['sold', 'Vendido'],
        ])('renders variant="%s" with token-based classes', (variant, label) => {
            render(<Badge variant={variant}>{label}</Badge>);
            const el = screen.getByText(label);
            expect(el).toBeInTheDocument();
            expect(hasTokenBackground(el.className)).toBe(true);
            expect(el.className).toMatch(/text-\S+/);
            expect(hasDarkSlatePair(el.className)).toBe(false);
        });
    });

    describe('neutral / fallback', () => {
        it('falls back to neutral classes for an unknown variant', () => {
            render(<Badge variant="not-a-real-variant">Desconocido</Badge>);
            const el = screen.getByText('Desconocido');
            expect(hasTokenBackground(el.className)).toBe(true);
            expect(el.className).toMatch(/text-muted/);
            expect(hasDarkSlatePair(el.className)).toBe(false);
        });

        it('defaults to neutral when no variant prop is passed', () => {
            render(<Badge>Sin variante</Badge>);
            const el = screen.getByText('Sin variante');
            expect(hasTokenBackground(el.className)).toBe(true);
            expect(el.className).toMatch(/text-muted/);
            expect(hasDarkSlatePair(el.className)).toBe(false);
        });
    });

    describe('license tier variants', () => {
        it.each(['premium', 'standard', 'basic', 'project'])(
            'renders license tier variant="%s" with token-based classes',
            (variant) => {
                render(<Badge variant={variant}>{variant}</Badge>);
                const el = screen.getByText(variant);
                expect(hasTokenBackground(el.className)).toBe(true);
                expect(hasDarkSlatePair(el.className)).toBe(false);
            }
        );

        it('uses muted ink for basic so it stays distinct from premium accent ink', () => {
            render(<Badge variant="basic">basic-tier</Badge>);
            render(<Badge variant="premium">premium-tier</Badge>);
            expect(screen.getByText('basic-tier').className).toMatch(/text-muted/);
            expect(screen.getByText('premium-tier').className).toMatch(/text-accent/);
        });
    });

    describe('device-hue variants', () => {
        it.each(['laptop', 'monitor', 'kit', 'backpack', 'headphones', 'mobile'])(
            'renders device-hue variant="%s" reusing --color-device-* tokens',
            (variant) => {
                render(<Badge variant={variant}>{variant}</Badge>);
                const el = screen.getByText(variant);
                expect(el.className).toMatch(new RegExp(`bg-device-${variant}/`));
                expect(el.className).toMatch(new RegExp(`text-device-${variant}`));
                expect(hasDarkSlatePair(el.className)).toBe(false);
            }
        );
    });

    describe('legibility across themes (token-based assertion)', () => {
        it.each(['available', 'assigned', 'retired', 'maintenance', 'sold', 'neutral'])(
            'variant="%s" uses a token-based class pair that resolves per-theme (no literal dark: slate override)',
            (variant) => {
                render(<Badge variant={variant}>{variant}</Badge>);
                const el = screen.getByText(variant);
                // Token-based background/text pair present (mode-invariant via CSS var,
                // resolves differently in light/dark without a separate dark: class).
                expect(hasTokenBackground(el.className)).toBe(true);
                expect(el.className).toMatch(/text-\S+/);
                expect(hasDarkSlatePair(el.className)).toBe(false);
            }
        );
    });
});
