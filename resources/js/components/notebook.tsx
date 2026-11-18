import { cn } from '@/lib/utils';
import { Lightbulb, SquareTerminal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Le carnet : commandes et astuces qu'on oublie, retrouvées et copiées en un clic.
 * Partagé entre la page Carnet et la carte du tableau des tâches.
 */
export type Entry = { id: number; title: string; category: string; body: string; uses: number };

/** Catégorie technique, ou contenu qui commence comme une commande : la fiche s'affiche en bloc de code. */
const CODE_CATEGORY = /\b(cmd|powershell|ps1?|bash|shell|sh|zsh|sql|git|linux|unix|docker|ssh|cli|commandes?|scripts?|terminal|regex|api)\b/i;
const CODE_START = /^\s*(\$ |> |sudo |git |npm |npx |php |composer |docker |kubectl |ssh |scp |curl |wget |cd |ls |cat |grep |find |chmod |chown |systemctl |journalctl |tail |(Get|Set|New|Remove|Invoke|Start|Stop|Restart|Test)-\w|ipconfig|ping |nslookup|netstat|tracert|robocopy|xcopy|net |sc |reg |wmic|gpupdate|gpresult|dism |sfc |SELECT |UPDATE |INSERT |DELETE |ALTER |CREATE )/i;
export const isCode = (e: Pick<Entry, 'category' | 'body'>) => CODE_CATEGORY.test(e.category) || CODE_START.test(e.body);

const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
/** Une couleur par catégorie, stable tant que la liste des catégories ne change pas. */
export const categoryColors = (entries: Pick<Entry, 'category'>[]) => {
    const categories = [...new Set(entries.map((e) => e.category))].sort((a, b) => a.localeCompare(b, 'fr'));
    return { categories, color: (c: string) => palette[Math.max(0, categories.indexOf(c)) % palette.length] };
};

/** Pictogramme de la fiche : un terminal pour une commande, une ampoule pour une astuce, teinté par la catégorie. */
export function EntryTile({ entry, color, className }: { entry: Pick<Entry, 'category' | 'body'>; color: string; className?: string }) {
    const Icon = isCode(entry) ? SquareTerminal : Lightbulb;
    return (
        <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[0.625rem]', className)}
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
            <Icon className="size-[55%]" strokeWidth={2} />
        </span>
    );
}

/** Recherche sans accents ni majuscules, sur le titre, la catégorie et le contenu. Tous les mots doivent y être. */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const matches = (e: Entry, query: string) => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const hay = fold(`${e.title} ${e.category} ${e.body}`);
    return words.every((w) => hay.includes(w));
};

const xsrf = () => decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');

/** Copie le contenu et compte l'usage côté serveur (sans recharger la page) : les fiches utiles remontent. */
export function useCopy(onUsed?: (id: number) => void) {
    const [copied, setCopied] = useState<number | null>(null);
    const timer = useRef<number>(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const copy = useCallback((e: Entry) => {
        navigator.clipboard.writeText(e.body).then(() => {
            setCopied(e.id);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(null), 1500);
            onUsed?.(e.id);
            fetch(route('practices.used', e.id), {
                method: 'POST',
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrf() },
            }).catch(() => {});
        }).catch(() => {});
    }, [onUsed]);
    return { copied, copy };
}

/** La touche « / » place le curseur dans la recherche, sauf si on écrit déjà quelque part. */
export function useSlashFocus() {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            const t = ev.target as HTMLElement | null;
            if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
            if (document.querySelector('[role="dialog"]')) return;
            ev.preventDefault();
            ref.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return ref;
}

/** Petite touche clavier affichée dans le champ de recherche. */
export const Kbd = ({ children }: { children: string }) => (
    <kbd className="text-muted-foreground bg-muted pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[0.6875rem] leading-5 sm:block">{children}</kbd>
);
