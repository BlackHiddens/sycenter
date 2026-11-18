import { useEffect, useRef } from 'react';

/**
 * Fond animé de la page de connexion : un maillage de vagues géométriques (segments droits reliés en triangles)
 * qui dérive très lentement. Traits très clairs, pris dans les couleurs du thème ; une ligne sur sept porte l'accent.
 * Fixe si le système demande moins d'animations ; en pause quand l'onglet est caché (requestAnimationFrame).
 */

const STEP = 56; // écart entre deux sommets d'une vague, en pixels
const LINES = 14;
const FPS = 30;

/** Lit une couleur du thème (#rrggbb) et la rend avec l'opacité voulue. */
function themeColor(name: string, alpha: number) {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return `rgba(127, 127, 127, ${alpha})`;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

export default function GeoWaves({ className }: { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const still = window.matchMedia('(prefers-reduced-motion: reduce)');
        let colors = { line: '', mesh: '', accent: '', dot: '' };
        const readColors = () => {
            colors = {
                line: themeColor('--foreground', 0.09),
                mesh: themeColor('--foreground', 0.035),
                accent: themeColor('--primary', 0.22),
                dot: themeColor('--foreground', 0.14),
            };
        };
        let width = 0;
        let height = 0;
        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        /** Points d'une vague à l'instant t (secondes). Deux sinus de fréquences différentes, décalés par ligne. */
        const wave = (i: number, t: number) => {
            const base = height * (0.08 + (0.9 * i) / (LINES - 1));
            const points: [number, number][] = [];
            for (let x = -STEP; x <= width + STEP; x += STEP) {
                const y = base
                    + 22 * Math.sin(x * 0.0042 + t * 0.11 + i * 0.42)
                    + 12 * Math.sin(x * 0.0091 - t * 0.07 + i * 0.9);
                points.push([x, y]);
            }
            return points;
        };

        const draw = (t: number) => {
            ctx.clearRect(0, 0, width, height);
            const rows = Array.from({ length: LINES }, (_, i) => wave(i, t));

            // Maillage : chaque sommet relié au sommet suivant de la vague d'en dessous (triangles).
            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.mesh;
            ctx.beginPath();
            for (let i = 0; i < LINES - 1; i++) {
                rows[i].forEach(([x, y], j) => {
                    const below = rows[i + 1][j + 1];
                    if (!below) return;
                    ctx.moveTo(x, y);
                    ctx.lineTo(below[0], below[1]);
                });
            }
            ctx.stroke();

            // Les vagues elles-mêmes, en segments droits.
            rows.forEach((points, i) => {
                ctx.beginPath();
                points.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
                const accent = i % 7 === 3;
                ctx.strokeStyle = accent ? colors.accent : colors.line;
                ctx.lineWidth = accent ? 1.4 : 1;
                ctx.stroke();
                if (i % 2 === 0) {
                    ctx.fillStyle = accent ? colors.accent : colors.dot;
                    points.forEach(([x, y]) => {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            });
        };

        readColors();
        resize();
        let frame = 0;
        let last = 0;
        const start = performance.now();
        const loop = (now: number) => {
            frame = requestAnimationFrame(loop);
            if (now - last < 1000 / FPS) return;
            last = now;
            draw((now - start) / 1000);
        };
        const run = () => {
            cancelAnimationFrame(frame);
            if (still.matches) draw(0);
            else frame = requestAnimationFrame(loop);
        };
        run();

        const onResize = () => {
            resize();
            if (still.matches) draw(0);
        };
        // Le thème change (clair, sombre, Sykerio) : on relit les couleurs.
        const observer = new MutationObserver(() => {
            readColors();
            if (still.matches) draw(0);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('resize', onResize);
        still.addEventListener('change', run);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', onResize);
            still.removeEventListener('change', run);
        };
    }, []);

    return <canvas ref={ref} aria-hidden className={className} />;
}
