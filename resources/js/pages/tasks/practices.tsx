import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Check, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type Practice = { id: number; title: string; category: string; body: string };
const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const blank = { title: '', category: '', body: '' };

export default function Practices({ practices, openTasks, archivedCount, canWrite }: { practices: Practice[]; openTasks: number; archivedCount: number; canWrite: boolean }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [editing, setEditing] = useState<Practice | 'new' | null>(null);
    const [copied, setCopied] = useState<number | null>(null);
    const form = useForm(blank);

    const categories = [...new Set(practices.map((p) => p.category))].sort();
    const color = (c: string) => palette[categories.indexOf(c) % palette.length];
    const q = query.trim().toLowerCase();
    const shown = practices.filter((p) => (!category || p.category === category) && (!q || `${p.title} ${p.category} ${p.body}`.toLowerCase().includes(q)));

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
    const copy = (p: Practice) => navigator.clipboard.writeText(p.body).then(() => { setCopied(p.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
    const err = (k: keyof typeof blank) => form.errors[k] && <span className="text-danger text-xs font-normal">{form.errors[k]}</span>;

    const panel = (
        <TasksPanel current="practices" openTasks={openTasks} practiceCount={practices.length} archivedCount={archivedCount}>
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
        <AppLayout title="Bonnes pratiques" panel={panel} panelTitle="Tâches" actions={canWrite && <Button size="sm" onClick={() => open('new')}><Plus /> Nouvelle pratique</Button>}>
            <Head title="Bonnes pratiques" />
            <label className="relative block max-w-md">
                <span className="sr-only">Rechercher dans les bonnes pratiques</span>
                <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <input className={`${fieldClass} pl-9`} type="search" placeholder="Rechercher un titre, un mot, une commande…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>

            {practices.length === 0 ? (
                <div className="bg-card rounded-[0.875rem] border p-6 text-sm">
                    <p className="font-medium">Ton carnet est vide.</p>
                    <p className="text-muted-foreground mt-1">Note ici ce que tu ne veux pas rechercher deux fois : une commande, une convention de nommage, une liste de vérification avant mise en ligne.</p>
                </div>
            ) : shown.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune pratique ne correspond à cette recherche.</p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-3.5">
                    {shown.map((p) => (
                        <article key={p.id} className="bg-card grid gap-2.5 rounded-[0.875rem] border border-t-[3px] p-4" style={{ borderTopColor: color(p.category) }}>
                            <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                    <Pill>{p.category}</Pill>
                                    <h2 className="mt-1.5 text-sm font-semibold break-words">{p.title}</h2>
                                </div>
                                <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Copier le contenu de ${p.title}`} onClick={() => copy(p)}>{copied === p.id ? <Check /> : <Copy />}</Button>
                                {canWrite && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Modifier ${p.title}`} onClick={() => open(p)}><Pencil /></Button>}
                            </div>
                            <p className="text-muted-foreground text-[0.8125rem] break-words whitespace-pre-wrap">{p.body}</p>
                        </article>
                    ))}
                </div>
            )}

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <form onSubmit={submit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{editing === 'new' ? 'Nouvelle bonne pratique' : 'Modifier la pratique'}</DialogTitle>
                            <DialogDescription>Une idée par fiche, pour la retrouver vite.</DialogDescription>
                        </DialogHeader>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Titre<input className={fieldClass} required maxLength={160} autoFocus value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />{err('title')}</label>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Catégorie<input className={fieldClass} required maxLength={40} list="practice-categories" placeholder="Git, Laravel, Réseau…" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} /><datalist id="practice-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>{err('category')}</label>
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Contenu<textarea className={`${fieldClass} h-auto py-2`} required rows={7} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} />{err('body')}</label>
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
