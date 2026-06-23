import React from 'react';

// Reusable illustrated empty state. Renders a small accent-colored icon
// badge (or custom icon) above a title and optional description/action.
// Tokens used (bg-surface, text-accent, etc.) auto-flip with the `dark`
// class on <html> — no `dark:` pairing needed for those.
const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
}) => {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                {Icon ? (
                    <Icon className="w-7 h-7 text-accent" />
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" className="text-accent" />
                        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="7" cy="6.5" r="0.6" fill="currentColor" className="text-accent" />
                    </svg>
                )}
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">{title}</p>
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};

export default EmptyState;
