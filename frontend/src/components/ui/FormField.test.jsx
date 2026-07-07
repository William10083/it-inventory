import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormField from './FormField';

describe('FormField', () => {
    describe('text input', () => {
        it('associates label with input via htmlFor/id', () => {
            render(
                <FormField label="Serial" name="serial" value="" onChange={() => {}} />
            );
            const input = screen.getByLabelText('Serial');
            expect(input).toBeInTheDocument();
            expect(input.id).toBe('serial');
        });

        it('shows error message and sets aria-invalid when error prop is provided', () => {
            render(
                <FormField label="Serial" name="serial" value="" onChange={() => {}} error="Requerido" />
            );
            const input = screen.getByLabelText('Serial');
            expect(input).toHaveAttribute('aria-invalid', 'true');
            expect(screen.getByText('Requerido')).toBeInTheDocument();
            expect(input.getAttribute('aria-describedby')).toMatch(/error$/);
        });
    });

    describe('select input', () => {
        it('renders a select with options and fires onChange with selected value', () => {
            const handleChange = vi.fn();
            render(
                <FormField
                    type="select"
                    label="Sede"
                    name="location"
                    value=""
                    onChange={handleChange}
                    options={[
                        { value: 'BOG', label: 'Bogotá' },
                        { value: 'MED', label: 'Medellín' },
                    ]}
                />
            );
            const select = screen.getByLabelText('Sede');
            expect(select.tagName).toBe('SELECT');
            expect(screen.getByText('Bogotá')).toBeInTheDocument();

            fireEvent.change(select, { target: { value: 'MED' } });
            expect(handleChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('token hygiene', () => {
        it('has no dark:+slate class pairs in source', () => {
            // Import raw source to check class strings
            // This is a static guard — the component must not introduce raw dark: slate overrides
            const fs = require('fs');
            const path = require('path');
            const src = fs.readFileSync(
                path.resolve(__dirname, 'FormField.jsx'),
                'utf-8'
            );
            expect(/dark:[^\s]*slate/.test(src)).toBe(false);
        });
    });
});
