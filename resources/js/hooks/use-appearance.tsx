import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'sykerio' | 'system';

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const saved = () => (localStorage.getItem('appearance') as Appearance | null) || 'system';

const applyTheme = (appearance: Appearance) => {
    const root = document.documentElement;
    root.classList.toggle('dark', appearance === 'dark' || (appearance === 'system' && mediaQuery.matches));
    root.classList.toggle('sykerio', appearance === 'sykerio');
};

const handleSystemThemeChange = () => applyTheme(saved());

export function initializeTheme() {
    applyTheme(saved());
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(saved);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    };

    useEffect(() => applyTheme(appearance), [appearance]);

    return { appearance, updateAppearance };
}
