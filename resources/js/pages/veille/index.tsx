import { Kbd, useSlashFocus } from '@/components/notebook';
import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { postJson } from '@/lib/http';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { AppWindow, ArrowRight, Bookmark, BookmarkCheck, Check, Code2, ListPlus, type LucideIcon, Newspaper, Pencil, Plus, RefreshCw, Rss, Search, ShieldAlert, Trash2, TriangleAlert, X } from 'lucide-react';
import { type CSSProperties, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

type Theme = { name: string; icon: string; color: string };
type Source = { id: number; theme: string; name: string; url: string; lang: string | null; fetched_at: string | null; error: string | null };
type RawItem = { id: number; feed_source_id: number; title: string; summary: string | null; url: string; image: string | null; published_at: string; saved_at: string | null; created_at: string };
/** Article prêt pour l'affichage : sa source (clé) et son thème viennent du flux qui l'a apporté. */
type Item = RawItem & { source: string; theme: string };
type Props = {
    themes: Record<string, Theme>; sources: Source[]; items: RawItem[];
    seenAt: string | null; refreshedAt: string | null; stale: boolean; canWrite: boolean; canTask: boolean; maxSources: number;
};

const themeIcons: Record<string, LucideIcon> = { code: Code2, shield: ShieldAlert, monitor: AppWindow };
const PER_THEME = 6; // cartes par thème sur la vue « Tout » (divisible par 2 et 3 colonnes)
const grid = 'grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2 lg:grid-cols-3';

/** Les plus récents, une source après l'autre : une source bavarde ne doit pas occuper tout le thème. */
function mix(list: Item[], n: number) {
    const bySource = new Map<string, Item[]>();
    for (const i of list) bySource.set(i.source, [...(bySource.get(i.source) ?? []), i]);
    const queues = [...bySource.values()].sort((a, b) => b[0].published_at.localeCompare(a[0].published_at));
    const out: Item[] = [];
    for (let round = 0; out.length < n && queues.some((q) => q.length > round); round++) {
        for (const q of queues) if (q[round] && out.length < n) out.push(q[round]);
    }
    return out;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
function ago(iso: string | null) {
    if (!iso) return '';
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
    if (min < 1) return "à l'instant";
    if (min < 60) return rtf.format(-min, 'minute');
    if (min < 24 * 60) return rtf.format(-Math.round(min / 60), 'hour');
    if (min < 7 * 24 * 60) return rtf.format(-Math.round(min / 1440), 'day');
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
function dayLabel(key: string) {
    const today = new Date().toLocaleDateString('en-CA');
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return "Aujourd'hui";
    if (key === y.toLocaleDateString('en-CA')) return 'Hier';
    const label = new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return label[0].toUpperCase() + label.slice(1);
}

/** Tuile de thème : pictogramme blanc sur la couleur du thème (couleur de repère, pas de texte dessus). */
function ThemeTile({ theme, className }: { theme: Theme; className?: string }) {
    const Icon = themeIcons[theme.icon] ?? Newspaper;
    return (
        <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[0.625rem] text-white', className)}
            style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${theme.color} 72%, #fff), ${theme.color})` }}>
            <Icon className="size-[55%]" />
        </span>
    );
}

/** Couverture de l'article : son image si le flux en donne une, sinon une affiche aux couleurs du thème. */
function Cover({ item, theme, source }: { item: Item; theme: Theme; source: Source }) {
    const [broken, setBroken] = useState(false);
    // Une petite image (souvent un logo) serait floue une fois agrandie : on la pose entière sur un fond neutre.
    const [small, setSmall] = useState(false);
    const Icon = themeIcons[theme.icon] ?? Newspaper;
    if (item.image && !broken) {
        return (
            <div className={cn('aspect-[5/2] sm:aspect-[2/1] w-full overflow-hidden', small ? 'bg-muted grid place-items-center p-5' : 'bg-muted')}>
                <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)}
                    onLoad={(e) => setSmall(e.currentTarget.naturalWidth < 480 || e.currentTarget.naturalHeight < 220)}
                    className={small ? 'max-h-full max-w-full rounded-md object-contain' : 'size-full object-cover'} />
            </div>
        );
    }
    return (
        <div aria-hidden className="relative grid aspect-[5/2] sm:aspect-[2/1] w-full place-items-center overflow-hidden"
            style={{ background: `repeating-linear-gradient(135deg, transparent 0 0.75rem, color-mix(in oklab, ${theme.color} 7%, transparent) 0.75rem 1.5rem), color-mix(in oklab, ${theme.color} 13%, var(--card))` } as CSSProperties}>
            <Icon className="absolute -right-4 -bottom-6 size-28 opacity-15" style={{ color: theme.color }} strokeWidth={1.5} />
            <span className="grid justify-items-center gap-2">
                <ThemeTile theme={theme} className="size-11" />
                <span className="text-foreground/80 text-xs font-semibold tracking-wide">{source.name}</span>
            </span>
        </div>
    );
}

type CardProps = {
    item: Item; theme: Theme; source: Source; isNew: boolean; saved: boolean; tasked: boolean;
    canWrite: boolean; canTask: boolean; onSave: (i: Item) => void; onTask: (i: Item) => void;
};

function ArticleCard({ item, theme, source, isNew, saved, tasked, canWrite, canTask, onSave, onTask }: CardProps) {
    return (
        <article className="bg-card focus-within:ring-ring relative grid min-w-0 grid-cols-[minmax(0,1fr)] content-start overflow-hidden rounded-[0.875rem] border transition-shadow focus-within:ring-2 hover:shadow-md">
            <Cover item={item} theme={theme} source={source} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 p-3.5">
                <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                    <i className="size-2 shrink-0 rounded-full" style={{ background: theme.color }} />
                    <span className="text-foreground/80 truncate font-medium">{source.name}</span>
                    {source.lang === 'en' && <span className="shrink-0 rounded border px-1 text-[0.625rem] leading-4 font-medium" title="Article en anglais">EN</span>}
                    <time dateTime={item.published_at} className="shrink-0 whitespace-nowrap">· {ago(item.published_at)}</time>
                    {isNew && <span className="ml-auto shrink-0"><Pill tone="success">Nouveau</Pill></span>}
                </div>
                <h3 className="line-clamp-3 text-[0.9375rem] leading-snug font-semibold [overflow-wrap:anywhere]">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 focus:outline-none">{item.title}</a>
                </h3>
                {item.summary && <p className="text-muted-foreground line-clamp-3 text-[0.8125rem] leading-relaxed [overflow-wrap:anywhere]">{item.summary}</p>}
                {(canWrite || canTask) && (
                    <div className="relative z-10 -mb-1 flex justify-end gap-1">
                        {canTask && (
                            <Button variant="ghost" size="sm" className={cn('h-7 px-2 text-xs', tasked && 'text-success')} disabled={tasked} onClick={() => onTask(item)} title="En faire une tâche">
                                {tasked ? <Check /> : <ListPlus />}<span className="max-sm:sr-only">{tasked ? 'Tâche créée' : 'Tâche'}</span>
                            </Button>
                        )}
                        {canWrite && (
                            <Button variant="ghost" size="sm" className={cn('h-7 px-2 text-xs', saved && 'text-foreground')} onClick={() => onSave(item)} aria-pressed={saved} title={saved ? 'Retirer de « À lire plus tard »' : 'À lire plus tard'}>
                                {saved ? <BookmarkCheck /> : <Bookmark />}<span className="max-sm:sr-only">{saved ? 'Gardé' : 'Plus tard'}</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

/** Ajouter un flux (adresse d'un flux ou d'un site) ou modifier son nom et son thème. */
function SourceDialog({ themes, editing, onClose }: { themes: Record<string, Theme>; editing: Source | 'new' | null; onClose: () => void }) {
    const form = useForm({ url: '', name: '', theme: Object.keys(themes)[0] });
    useEffect(() => {
        if (!editing) return;
        form.clearErrors();
        form.setData(editing === 'new' ? { url: '', name: '', theme: Object.keys(themes)[0] } : { url: editing.url, name: editing.name, theme: editing.theme });
    }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
    const options = { preserveScroll: true, onSuccess: onClose };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (editing === 'new') form.post(route('veille.sources.store'), options);
        else if (editing) form.put(route('veille.sources.update', editing.id), options);
    };
    const remove = () => editing && editing !== 'new' && router.delete(route('veille.sources.destroy', editing.id), options);
    const err = (k: 'url' | 'name' | 'theme') => form.errors[k] && <span className="text-danger text-xs font-normal">{form.errors[k]}</span>;
    const hint = (t: string) => <span className="text-muted-foreground text-xs font-normal">{t}</span>;

    return (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{editing === 'new' ? 'Ajouter un flux' : 'Modifier le flux'}</DialogTitle>
                        <DialogDescription>{editing === 'new' ? 'L’adresse d’un site suffit : le flux est trouvé tout seul.' : 'Son nom et son thème.'}</DialogDescription>
                    </DialogHeader>
                    {editing === 'new' ? (
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Adresse
                            <input className={fieldClass} required autoFocus type="url" inputMode="url" placeholder="https://www.lemagit.fr" value={form.data.url} onChange={(e) => form.setData('url', e.target.value)} />
                            {hint('Le site, ou directement son flux RSS ou Atom.')}{err('url')}
                        </label>
                    ) : (
                        <p className="text-muted-foreground flex items-center gap-2 text-xs [overflow-wrap:anywhere]"><Rss className="size-3.5 shrink-0" />{form.data.url}</p>
                    )}
                    <fieldset className="grid gap-1.5">
                        <legend className="mb-1.5 text-[0.8125rem] font-medium">Thème</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(themes).map(([k, t]) => (
                                <label key={k} className={cn('flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-xs font-medium transition-colors', form.data.theme === k ? 'border-foreground/50 bg-accent' : 'hover:bg-accent/60')}>
                                    <input type="radio" name="theme" value={k} checked={form.data.theme === k} onChange={() => form.setData('theme', k)} className="sr-only" />
                                    <ThemeTile theme={t} />{t.name}
                                </label>
                            ))}
                        </div>
                        {err('theme')}
                    </fieldset>
                    <label className="grid gap-1.5 text-[0.8125rem] font-medium"><span>Nom{editing === 'new' && <span className="text-muted-foreground font-normal"> (facultatif)</span>}</span>
                        <input className={fieldClass} required={editing !== 'new'} maxLength={80} placeholder={editing === 'new' ? 'Repris du flux si vide' : undefined} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        {err('name')}
                    </label>
                    {editing !== 'new' && editing?.error && (
                        <p className="bg-warning-soft text-warning flex items-center gap-2 rounded-lg px-3 py-2 text-xs"><TriangleAlert className="size-3.5 shrink-0" />{`Dernière lecture ratée : ${editing.error}.`}</p>
                    )}
                    <DialogFooter className="sm:justify-between">
                        {editing !== 'new' ? <Button type="button" variant="outline" onClick={remove} title="Ses articles partent aussi, même ceux gardés pour plus tard"><Trash2 /> Retirer</Button> : <span />}
                        <Button type="submit" disabled={form.processing}>{form.processing ? (editing === 'new' ? 'Recherche du flux…' : 'Enregistrement…') : editing === 'new' ? 'Ajouter' : 'Enregistrer'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Veille({ themes, sources: sourceRows, items: rawItems, seenAt, refreshedAt, stale, canWrite, canTask, maxSources }: Props) {
    const sources = useMemo(() => Object.fromEntries(sourceRows.map((s) => [String(s.id), s])), [sourceRows]);
    const items: Item[] = useMemo(() => rawItems.filter((i) => sources[String(i.feed_source_id)])
        .map((i) => ({ ...i, source: String(i.feed_source_id), theme: sources[String(i.feed_source_id)].theme })), [rawItems, sources]);
    const savedIds = useMemo(() => rawItems.filter((i) => i.saved_at).map((i) => i.id), [rawItems]);
    const [editing, setEditing] = useState<Source | 'new' | null>(null);
    const [view, setView] = useState<string>('all');
    const [source, setSource] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState<number[]>(savedIds);
    const [tasked, setTasked] = useState<number[]>([]);
    const searchRef = useSlashFocus();
    useEffect(() => setSaved(savedIds), [savedIds]);

    const refresh = useCallback((force: boolean) => {
        setBusy(true);
        postJson<{ refreshed: boolean }>(route('veille.refresh'), { force })
            .then((r) => { if (r.refreshed) router.reload({ only: ['items', 'sources', 'refreshedAt', 'stale'] }); })
            .catch(() => {})
            .finally(() => setBusy(false));
    }, []);
    // Les flux ont vieilli : on affiche ce qu'on a, et on récupère la suite sans bloquer la page.
    useEffect(() => { if (stale) refresh(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const isNew = (i: Item) => !!seenAt && i.created_at > seenAt;
    const q = fold(query.trim());
    const filtered = useMemo(() => items.filter((i) => (!source || i.source === source)
        && (!q || q.split(/\s+/).every((w) => fold(`${i.title} ${i.summary ?? ''} ${sources[i.source]?.name ?? ''}`).includes(w)))), [items, source, q, sources]);

    const toggleSave = (i: Item) => {
        const was = saved.includes(i.id);
        setSaved(was ? saved.filter((id) => id !== i.id) : [i.id, ...saved]);
        postJson(route('veille.save', i.id)).catch(() => setSaved(saved));
    };
    const toTask = (i: Item) => {
        setTasked([...tasked, i.id]);
        postJson(route('veille.task', i.id)).catch(() => setTasked(tasked.filter((id) => id !== i.id)));
    };
    const card = (i: Item) => (
        <ArticleCard key={i.id} item={i} theme={themes[i.theme]} source={sources[i.source]} isNew={isNew(i)} saved={saved.includes(i.id)} tasked={tasked.includes(i.id)}
            canWrite={canWrite} canTask={canTask} onSave={toggleSave} onTask={toTask} />
    );
    const choose = (v: string) => { setView(v); if (source && v !== 'all' && v !== 'saved' && sources[source]?.theme !== v) setSource(null); };

    const themeKeys = Object.keys(themes);
    const tabs: { key: string; name: string; tile: ReactNode; count: number; fresh: number }[] = [
        { key: 'all', name: 'Tout', tile: <span aria-hidden className="bg-foreground text-background grid size-9 shrink-0 place-items-center rounded-[0.625rem]"><Newspaper className="size-[55%]" /></span>, count: items.length, fresh: items.filter(isNew).length },
        ...themeKeys.map((k) => ({ key: k, name: themes[k].name, tile: <ThemeTile theme={themes[k]} />, count: items.filter((i) => i.theme === k).length, fresh: items.filter((i) => i.theme === k && isNew(i)).length })),
        { key: 'saved', name: 'À lire plus tard', tile: <span aria-hidden className="bg-muted text-foreground grid size-9 shrink-0 place-items-center rounded-[0.625rem] border"><Bookmark className="size-[50%]" /></span>, count: saved.length, fresh: 0 },
    ];

    const panel = (
        <>
            <PanelSection label="Mes flux" aside={canWrite && sourceRows.length < maxSources
                ? <button onClick={() => setEditing('new')} className="text-foreground hover:bg-accent -my-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium normal-case tracking-normal"><Plus className="size-3.5" />Ajouter</button>
                : <Pill>{sourceRows.length}</Pill>}>
                {themeKeys.map((t) => {
                    const list = sourceRows.filter((s) => s.theme === t);
                    return (
                        <div key={t} className="grid grid-cols-[minmax(0,1fr)] gap-0.5 pb-1.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-xs font-medium">
                                <i className="size-2 rounded-full" style={{ background: themes[t].color }} />{themes[t].name}
                            </span>
                            {list.length === 0 && <span className="text-muted-foreground px-2 py-1 text-xs">Aucun flux.</span>}
                            {list.map((s) => {
                                const key = String(s.id);
                                return (
                                    <div key={key} className="group flex items-center gap-0.5">
                                        <button className={cn(rowClass, 'w-auto min-w-0 flex-1 font-normal', source === key && 'bg-accent font-medium')} aria-pressed={source === key}
                                            onClick={() => { const on = source !== key; setSource(on ? key : null); if (on) setView(t); }}>
                                            <span className="min-w-0 flex-1 truncate">{s.name}</span>
                                            {s.error && <TriangleAlert className="text-warning size-3.5 shrink-0" aria-label={`Dernière lecture ratée : ${s.error}`} />}
                                            {s.lang === 'en' && <span className="text-muted-foreground rounded border px-1 text-[0.625rem] leading-4">EN</span>}
                                            <Pill>{items.filter((i) => i.source === key).length}</Pill>
                                        </button>
                                        {canWrite && (
                                            <button onClick={() => setEditing(s)} aria-label={`Modifier le flux ${s.name}`} title="Modifier ou retirer"
                                                className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md opacity-60 group-hover:opacity-100 focus-visible:opacity-100">
                                                <Pencil className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                {canWrite && sourceRows.length < maxSources && (
                    <Button variant="outline" size="sm" className="mx-1 mt-1" onClick={() => setEditing('new')}><Plus /> Ajouter un flux</Button>
                )}
            </PanelSection>
            <PanelSection>
                <p className="text-muted-foreground px-1 text-xs leading-relaxed">Relus à chaque ouverture de l'app.</p>
            </PanelSection>
        </>
    );

    const shownItems = view === 'saved' ? saved.map((id) => filtered.find((i) => i.id === id)).filter((i): i is Item => !!i) : view === 'all' ? filtered : filtered.filter((i) => i.theme === view);
    const days = useMemo(() => {
        const groups: [string, Item[]][] = [];
        for (const i of shownItems) {
            const k = dayKey(i.published_at);
            const last = groups[groups.length - 1];
            if (last && last[0] === k) last[1].push(i); else groups.push([k, [i]]);
        }
        return groups;
    }, [shownItems]);

    return (
        <AppLayout title="Veille" panel={panel} panelTitle="Veille"
            actions={
                <Button size="sm" variant="outline" onClick={() => refresh(true)} disabled={busy} title={refreshedAt ? `Dernière récupération ${ago(refreshedAt)}` : undefined}>
                    <RefreshCw className={cn(busy && 'animate-spin')} />
                    <span className="max-sm:sr-only">{busy ? 'Récupération…' : refreshedAt ? `À jour ${ago(refreshedAt)}` : 'Récupérer'}</span>
                </Button>
            }>
            <Head title="Veille" />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="tablist" aria-label="Thèmes">
                    {tabs.map((t) => (
                        <button key={t.key} role="tab" aria-selected={view === t.key} onClick={() => choose(t.key)}
                            className={cn('bg-card flex shrink-0 items-center gap-2.5 rounded-xl border py-2 pr-3.5 pl-2 text-left transition-colors', view === t.key ? 'border-foreground/50 bg-accent' : 'hover:bg-accent/60')}>
                            {t.tile}
                            <span className="grid">
                                <span className="text-sm font-medium whitespace-nowrap">{t.name}</span>
                                <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                                    {t.count}{t.fresh > 0 && <span className="text-success font-medium">{` · ${t.fresh} nouveau${t.fresh > 1 ? 'x' : ''}`}</span>}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="relative block min-w-0 flex-1 basis-64 sm:max-w-md">
                        <span className="sr-only">Chercher dans la veille</span>
                        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                        <input ref={searchRef} className={`${fieldClass} pr-9 pl-9`} type="search" placeholder="Un mot, une faille, un produit…" value={query} onChange={(e) => setQuery(e.target.value)} />
                        {!query && <Kbd>/</Kbd>}
                    </label>
                    {source && sources[source] && (
                        <button onClick={() => setSource(null)} className="bg-accent flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium">
                            {sources[source].name}<X className="text-muted-foreground size-3.5" /><span className="sr-only">Retirer le filtre</span>
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    busy ? (
                        <div className={grid} aria-label="Récupération des articles">
                            {Array.from({ length: 6 }, (_, n) => (
                                <div key={n} className="bg-card overflow-hidden rounded-[0.875rem] border">
                                    <div className="bg-muted aspect-[5/2] sm:aspect-[2/1] animate-pulse" />
                                    <div className="grid gap-2 p-3.5"><div className="bg-muted h-3 w-1/3 animate-pulse rounded" /><div className="bg-muted h-4 w-5/6 animate-pulse rounded" /><div className="bg-muted h-3 w-full animate-pulse rounded" /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card grid justify-items-center gap-4 rounded-[0.875rem] border px-6 py-10 text-center">
                            <div className="flex gap-2.5" aria-hidden>{themeKeys.map((k, n) => <ThemeTile key={k} theme={themes[k]} className={cn('size-12', n === 0 && '-rotate-6', n === 2 && 'rotate-6')} />)}</div>
                            {sourceRows.length === 0 ? (
                                <>
                                    <p className="text-muted-foreground max-w-sm text-sm">Aucun flux suivi. Ajoute l'adresse d'un site d'actualité, rangée dans un thème.</p>
                                    {canWrite && <Button onClick={() => setEditing('new')}><Plus /> Ajouter un flux</Button>}
                                </>
                            ) : (
                                <>
                                    <p className="text-muted-foreground max-w-sm text-sm">Pas encore d'articles dans tes flux.</p>
                                    <Button onClick={() => refresh(true)}><RefreshCw /> Récupérer</Button>
                                </>
                            )}
                        </div>
                    )
                ) : shownItems.length === 0 ? (
                    <div className="text-muted-foreground flex items-center gap-3 py-6 text-sm">
                        {view === 'saved' ? <><Bookmark className="size-5" />Rien de mis de côté. Le signet d'une carte la garde ici.</> : <><Search className="size-5" />Rien ne correspond.</>}
                    </div>
                ) : view === 'all' && !q && !source ? (
                    themeKeys.map((k) => {
                        const list = filtered.filter((i) => i.theme === k);
                        if (!list.length) return null;
                        return (
                            <section key={k} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" aria-label={themes[k].name}>
                                <button onClick={() => choose(k)} className="group flex w-fit items-center gap-2.5 text-left">
                                    <ThemeTile theme={themes[k]} className="size-8" />
                                    <h2 className="text-base font-semibold">{themes[k].name}</h2>
                                    <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 text-xs">{`Tout voir · ${list.length}`}<ArrowRight className="size-3" /></span>
                                </button>
                                <div className={grid}>{mix(list, PER_THEME).map(card)}</div>
                            </section>
                        );
                    })
                ) : view === 'saved' ? (
                    <div className={grid}>{shownItems.map(card)}</div>
                ) : (
                    days.map(([k, list]) => (
                        <section key={k} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" aria-label={dayLabel(k)}>
                            <h2 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">{dayLabel(k)}<span className="bg-border h-px flex-1" /></h2>
                            <div className={grid}>{list.map(card)}</div>
                        </section>
                    ))
                )}
            </div>
            <SourceDialog themes={themes} editing={editing} onClose={() => setEditing(null)} />
        </AppLayout>
    );
}
