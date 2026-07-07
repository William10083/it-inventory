import React from 'react';

// Variant -> token-based class pair map. Each entry is `bg-<token>/10 text-<token>`
// so the badge stays legible in both themes without a raw dark-mode-only override —
// the underlying CSS custom property already resolves per-theme (see index.css).
//
// - status: semantic Tailwind palette hues (green/blue/red/orange) carry meaning
//   (available=green, assigned=blue, retired/sold=red, maintenance=orange).
// - license tiers: lavender/accent-family hues, ranked by tier.
// - device hues: reuse --color-device-* tokens (mode-invariant, same as DeviceChip).
const VARIANT_CLASSES = {
    // Status
    available: 'bg-green-500/10 text-green-500',
    assigned: 'bg-blue-500/10 text-blue-500',
    retired: 'bg-red-500/10 text-red-500',
    maintenance: 'bg-orange-500/10 text-orange-500',
    sold: 'bg-red-500/10 text-red-500',

    // License tiers
    premium: 'bg-accent/10 text-accent',
    standard: 'bg-blue-500/10 text-blue-500',
    basic: 'bg-surface-secondary text-muted',
    project: 'bg-purple-500/10 text-purple-500',

    // Device hues (reuse --color-device-* tokens, same pattern as DeviceChip.jsx)
    laptop: 'bg-device-laptop/20 text-device-laptop',
    monitor: 'bg-device-monitor/20 text-device-monitor',
    kit: 'bg-device-kit/20 text-device-kit',
    backpack: 'bg-device-backpack/20 text-device-backpack',
    headphones: 'bg-device-headphones/20 text-device-headphones',
    mobile: 'bg-device-mobile/20 text-device-mobile',

    // Fallback
    neutral: 'bg-surface-secondary text-muted',
};

const Badge = ({ variant, children, className = '' }) => {
    const variantClasses = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;

    return (
        <span
            className={`px-2 py-1 rounded text-xs font-bold ${variantClasses} ${className}`.trim()}
        >
            {children}
        </span>
    );
};

export default Badge;
