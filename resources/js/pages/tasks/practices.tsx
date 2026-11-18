import { categoryColors, type Entry, EntryTile, isCode, Kbd, matches, useCopy, useSlashFocus } from '@/components/notebook';
import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDownAZ, Check, Clock3, Copy, Flame, Lightbulb, Pencil, Plus, Search, SquareTerminal, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useState } from 'react';

type Practice = Entry & { last_used_at: string | null; updated_at: string };
type Props = { practices: Practice[]; openTasks: number; archivedCount: number; canWrite: boolean };
type Sort = 'used' | 'recent' | 'alpha';

const blank = { title: '', category: '', body: '' };
const sorts: { key: Sort; icon: typeof Flame; label: string }[] = [
    { key: 'used', icon: Flame, label: 'Plus utilisées' },
    { key: 'recent', icon: Clock3, label: 'Dernières notées' },
    { key: 'alpha', icon: ArrowDownAZ, label: 'De A à Z' },
];

export default function Notebook({ practices, openTasks, archivedCount, canWrite }: Props) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [sort, setSort] = useState<Sort>('used');
    const [editing, setEditing] = useState<Practice | 'new' | null>(null);
    // Copies faites sur cette page : le compteur bouge tout de suite, l'ordre ne change qu'au prochain passage.
    const [bumps, setBumps] = useState<Record<number, number>>({});
    const onUsed = useCallback((id: number) => setBumps((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 })), []);
    const { copied, copy } = useCopy(onUsed);
    const searchRef = useSlashFocus();
    const form = useForm(blank);

    const { categories, color } = categoryColors(practices);
    const shown = practices
        .filter((p) => (!category || p.category === category) && matches(p, query))
        .sort(sort === 'alpha' ? (a, b) => a.title.localeCompare(b.title, 'fr') : sort === 'recent' ? (a, b) => b.updated_at.localeCompare(a.updated_at) : () => 0);
    const uses = (p: Practice) => p.uses + (bumps[p.id] ?? 0);
    const codeCount = practices.filter(isCode).length;

    const open = (p: Practice | 'new') => {
        form.clearErrors();
        form.setData(p === 'new' ? { ...blank, category: category ?? '' } : { title: p.title, category: p.category, body: p.body });
        setEditing(p);
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing === 'new') form.post(route('practices.store'), options);
        else if (editing) form.put(route('practices.update', editing.id), options);
    };
    const remove = () => editing && editing !== 'new' && router.delete(route('practices.destroy', editing.id), { preserveScroll: true, onSuccess: () => setEditing(null) });
    const err = (k: keyof typeof blank) => form.errors[k] && <span className="text-danger text-xs font-normal">{form.errors[k]}</span>;
    const hint = (text: string) => <span className="text-muted-foreground text-xs font-normal">{text}</span>;
    const draftIsCode = isCode(form.data);

    const panel = (
        <TasksPanel current="practices" openTasks={openTasks} practiceCount={practices.length} archivedCount={archivedCount}>
            {practices.length > 0 && (
                <PanelSection label="Dans le carnet">
                    <div className="grid grid-cols-2 gap-2 px-1 pb-1">
                        <div className="bg-muted/60 grid gap-1 rounded-lg p-2.5"><SquareTerminal className="text-muted-foreground size-4" /><span className="text-lg leading-none font-medium tabular-nums">{codeCount}</span><span className="text-muted-foreground text-xs">commande{codeCount > 1 ? 's' : ''}</span></div>
                        <div className="bg-muted/60 grid gap-1 rounded-lg p-2.5"><Lightbulb className="text-muted-foreground size-4" /><span className="text-lg leading-none font-medium tabular-nums">{practices.length - codeCount}</span><span className="text-muted-foreground text-xs">astuce{practices.length - codeCount > 1 ? 's' : ''}</span></div>
                    </div>
                </PanelSection>
            )}
            {categories.length > 0 && (
                <PanelSection label="Catégories" aside={<Pill>{categories.length}</Pill>}>
                    <button className={`${rowClass} ${category === null ? 'bg-accent' : ''}`} onClick={() => setCategory(null)}><span className="flex-1">Toutes</span><Pill>{practices.length}</Pill></button>
                    {categories.map((c) => (
                        <button key={c} className={`${rowClass} ${category === c ? 'bg-accent' : ''}`} onClick={() => setCategory(category === c ? null : c)} aria-pressed={category === c}>
                            <i className="size-[0.4375rem] shrink-0 rounded-full" style={{ background: color(c) }} />
                            <span className="min-w-0 flex-1 truncate">{c}</span>
                            <Pill>{practices.filter((p) => p.category === c).length}</Pill>
                        </button>
                    ))}
                </PanelSection>
            )}
        </TasksPanel>
    );

    return (
        <AppLayout title="Carnet" panel={panel} panelTitle="Tâches" actions={canWrite && <Button size="sm" onClick={() => open('new')}><Plus /> Noter</Button>}>
            <Head title="Carnet" />
            {practices.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5">
                    <label className="relative block min-w-0 flex-1 basis-64 sm:max-w-md">
                        <span className="sr-only">Rechercher dans le carnet</span>
                        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                        <input ref={searchRef} className={`${fieldClass} pr-9 pl-9`} type="search" placeholder="Une commande, un mot, un outil…" value={query} onChange={(e) => setQuery(e.target.value)} />
                        {!query && <Kbd>/</Kbd>}
                    </label>
                    <div className="bg-muted flex gap-0.5 rounded-lg p-0.5" role="group" aria-label="Trier">
                        {sorts.map((s) => (
                            <button key={s.key} onClick={() => setSort(s.key)} aria-pressed={sort === s.key} title={s.label}
                                className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium', sort === s.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                                <s.icon className="size-3.5" /><span className="max-sm:sr-only">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {practices.length === 0 ? (
                <div className="bg-card grid justify-items-center gap-4 rounded-[0.875rem] border px-6 py-10 text-center">
                    <div className="flex gap-2.5" aria-hidden>
                        <EntryTile entry={{ category: 'PowerShell', body: '' }} color="var(--chart-1)" className="size-12 -rotate-6" />
                        <EntryTile entry={{ category: 'Astuce', body: '' }} color="var(--chart-3)" className="size-12 rotate-6" />
                    </div>
                    <div className="grid max-w-md gap-1">
                        <p className="font-medium">Ton carnet est vide.</p>
                        <p className="text-muted-foreground text-sm">Note ce que tu ne veux pas chercher deux fois : la commande qui débloque un poste, la requête SQL du mois, le raccourci qui sauve. Tu la retrouves en tapant un mot, et tu la copies d'un clic.</p>
                    </div>
                    {canWrite && <Button onClick={() => open('new')}><Plus /> Première fiche</Button>}
                </div>
            ) : shown.length === 0 ? (
                <p className="text-muted-foreground text-sm">Rien ne correspond à cette recherche.</p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] items-start gap-3.5">
                    {shown.map((p) => {
                        const code = isCode(p);
                        const n = uses(p);
                        return (
                            <article key={p.id} className="bg-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-[0.875rem] border border-t-[3px] p-4" style={{ borderTopColor: color(p.category) }}>
                                <div className="flex items-start gap-2.5">
                                    <EntryTile entry={p} color={color(p.category)} />
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">{p.title}</h2>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <Pill>{p.category}</Pill>
                                            {n > 0 && <span className="text-muted-foreground text-xs tabular-nums" title={`Copiée ${n} fois`}>{`× ${n}`}</span>}
                                        </div>
                                    </div>
                                    {canWrite && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Modifier ${p.title}`} onClick={() => open(p)}><Pencil /></Button>}
                                </div>
                                <button onClick={() => copy(p)} aria-label={`Copier : ${p.title}`} title="Copier"
                                    className={cn('group relative rounded-lg text-left transition-colors', code ? 'bg-muted hover:bg-accent px-3 py-2.5 pr-10' : 'hover:bg-muted/60 -mx-1 px-1 py-0.5 pr-9')}>
                                    {code
                                        ? <pre className="text-foreground font-mono text-[0.75rem] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">{p.body}</pre>
                                        : <p className="text-muted-foreground text-[0.8125rem] [overflow-wrap:anywhere] whitespace-pre-wrap">{p.body}</p>}
                                    <span className={cn('absolute top-2 right-2 grid size-6 place-items-center rounded-md transition-opacity', copied === p.id ? 'bg-success-soft text-success' : 'text-muted-foreground opacity-60 group-hover:opacity-100')}>
                                        {copied === p.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                    </span>
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <form onSubmit={submit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{editing === 'new' ? 'Noter dans le carnet' : 'Modifier la fiche'}</DialogTitle>
                            <DialogDescription>Une commande ou une astuce par fiche.</DialogDescription>
                        </DialogHeader>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Titre
                            <input className={fieldClass} required maxLength={160} autoFocus placeholder="Forcer les stratégies de groupe" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                            {hint('Les mots que tu taperas pour la retrouver.')}{err('title')}
                        </label>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Catégorie
                            <input className={fieldClass} required maxLength={40} list="practice-categories" placeholder="PowerShell, SQL, Réseau, Astuce…" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} />
                            <datalist id="practice-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                            {hint('L’outil ou le sujet. Elle donne sa couleur à la fiche.')}{err('category')}
                        </label>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Contenu
                            <textarea className={cn(fieldClass, 'h-auto py-2', draftIsCode && 'font-mono text-xs')} required rows={6} placeholder="gpupdate /force" value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} />
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
                                {draftIsCode ? <SquareTerminal className="size-3.5 shrink-0" /> : <Lightbulb className="size-3.5 shrink-0" />}
                                {draftIsCode ? 'Reconnue comme commande : copiée telle quelle, en bloc de code.' : 'Astuce en texte libre. Une catégorie comme PowerShell ou SQL en fait une commande.'}
                            </span>
                            {err('body')}
                        </label>
                        <DialogFooter className="sm:justify-between">
                            {editing !== 'new' ? <Button type="button" variant="outline" onClick={remove}><Trash2 /> Supprimer</Button> : <span />}
                            <Button type="submit" disabled={form.processing}>{editing === 'new' ? 'Ajouter' : 'Enregistrer'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
