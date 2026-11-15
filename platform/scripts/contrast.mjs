// Vérifie le contraste WCAG 2.1 de chaque association texte/fond des thèmes (resources/css/app.css).
// Règle : AA (4,5:1) pour toutes les paires, AAA (7:1) pour le texte courant. Lancer : npm run contrast
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../resources/css/app.css', import.meta.url), 'utf8');
const themes = { clair: ':root', sombre: '.dark', sykerio: '.sykerio' };
const AAA = [['foreground', 'background'], ['card-foreground', 'card'], ['popover-foreground', 'popover'], ['sidebar-accent-foreground', 'sidebar-accent'], ['foreground', 'muted']];
const AA = [
    ['muted-foreground', 'background'], ['muted-foreground', 'card'], ['muted-foreground', 'muted'], ['primary-foreground', 'primary'],
    ['secondary-foreground', 'secondary'], ['accent-foreground', 'accent'], ['destructive-foreground', 'destructive'],
    ['sidebar-foreground', 'sidebar-background'], ['sidebar-foreground', 'sidebar-accent'], ['sidebar-primary-foreground', 'sidebar-primary'],
    ['success', 'success-soft'], ['warning', 'warning-soft'], ['danger', 'danger-soft'], ['destructive', 'background'], ['primary', 'background'],
];
const parse = (sel) => Object.fromEntries([...css.split(`\n${sel} {`)[1].split('}')[0].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => ((x, y) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05))(lum(a), lum(b));

const base = parse(':root');
let fail = 0, total = 0;
for (const [name, sel] of Object.entries(themes)) {
    const t = { ...base, ...parse(sel) };
    for (const [pairs, min] of [[AAA, 7], [AA, 4.5]]) {
        for (const [fg, bg] of pairs) {
            total++;
            const r = ratio(t[fg], t[bg]);
            if (r < min) { fail++; console.log(`ÉCHEC ${name}: ${fg} sur ${bg} = ${r.toFixed(2)} (minimum ${min})`); }
        }
    }
}
console.log(`${total - fail}/${total} associations conformes (${Math.round(((total - fail) / total) * 100)} %)`);
process.exit(fail ? 1 : 0);
