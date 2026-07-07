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
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted hover:text-accent hover:bg-accent/8 transition-all duration-200"
        >
            <span ref={iconRef} className="inline-flex">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </span>
        </button>
    );
};

export default ThemeToggle;
