import React from 'react';

/**
 * FormField — token-styled label + input/select + error wrapper.
 *
 * Props:
 *  - label: string (required)
 *  - name: string (required, used as id + htmlFor)
 *  - value: string
 *  - onChange: (value: string) => void  — receives the raw value, not the event
 *  - error?: string — when present, shows message + aria-invalid + aria-describedby
 *  - type?: 'text' | 'select' (default 'text')
 *  - options?: { value: string, label: string }[] — only for type="select"
 *  - placeholder?: string
 *  - disabled?: boolean
 *
 * Token-based classes only — no raw dark: slate pairs.
 */
const INPUT_CLASSES =
    'w-full px-3 py-2 rounded-lg border bg-bg border-border text-text placeholder:text-muted ' +
    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const LABEL_CLASSES = 'block text-sm font-medium text-text mb-1';
const ERROR_CLASSES = 'text-xs text-red-500 mt-1';

export default function FormField({
    label,
    name,
    value,
    onChange,
    error,
    type = 'text',
    options = [],
    placeholder,
    disabled,
}) {
    const errorId = `${name}-error`;

    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="w-full">
            <label htmlFor={name} className={LABEL_CLASSES}>
                {label}
            </label>
            {type === 'select' ? (
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className={INPUT_CLASSES}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? errorId : undefined}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={INPUT_CLASSES}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? errorId : undefined}
                />
            )}
            {error && (
                <p id={errorId} className={ERROR_CLASSES} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
