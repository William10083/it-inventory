import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Sun/moon icon-swap toggle button.
// Follows the same GSAP cleanup pattern as Dashboard.jsx's CountUpNumber:
// tween stored in a ref, killed before starting a new one and on unmount,
// with an early-return (no animation) path for prefers-reduced-motion.
const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const iconRef = useRef(null);
    const tweenRef = useRef(null);

    useEffect(() => {
        return () => {
            if (tweenRef.current) {
                tweenRef.current.kill();
                tweenRef.current = null;
            }
        };
    }, []);

    const handleClick = () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (tweenRef.current) {
            tweenRef.current.kill();
            tweenRef.current = null;
        }

        if (prefersReducedMotion) {
            toggleTheme();
            return;
        }

        if (iconRef.current) {
            tweenRef.current = gsap.timeline({
                onComplete: () => {
                    tweenRef.current = null;
                },
            })
                .to(iconRef.current, { rotation: 90, scale: 0, duration: 0.15, ease: 'power1.in' })
                .call(() => toggleTheme())
                .to(iconRef.current, { rotation: 0, scale: 1, duration: 0.15, ease: 'power1.out' });
        } else {
            toggleTheme();
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors"
        >
            <span ref={iconRef} className="inline-flex">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </span>
        </button>
    );
};

export default ThemeToggle;
