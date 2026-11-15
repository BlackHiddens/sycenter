import { fieldClass, IconTile, PanelSection, Pill, rowClass } from '@/components/sy';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

type Status = 'todo' | 'doing' | 'done';
type Task = { id: number; title: string; notes: string | null; status: Status; priority: 'low' | 'normal' | 'high'; tag: string | null; due_date: string | null; completed_at: string | null };

const columns: { key: Status; label: string; color: string }[] = [
    { key: 'todo', label: 'À faire', color: 'var(--chart-1)' },
    { key: 'doing', label: 'En cours', color: 'var(--chart-3)' },
    { key: 'done', label: 'Terminé', color: 'var(--chart-2)' },
];
const priorities = { high: { label: 'Haute', color: 'var(--destructive)' }, normal: { label: 'Normale', color: 'var(--chart-1)' }, low: { label: 'Basse', color: 'var(--input)' } };
const today = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-JJ, heure locale
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const blank = { title: '', notes: '', status: 'todo' as Status, priority: 'normal', tag: '', due_date: '' };

export default function Tasks({ tasks, practiceCount, canWrite }: { tasks: Task[]; practiceCount: number; canWrite: boolean }) {
    const [items, setItems] = useState(tasks);
    const [tag, setTag] = useState<string | null>(null);
    const [editing, setEditing] = useState<Task | 'new' | null>(null);
    const [drag, setDrag] = useState<number | null>(null);
    const [over, setOver] = useState<{ status: Status; before: number | null } | null>(null);
    const form = useForm(blank);
    useEffect(() => setItems(tasks), [tasks]);

    const now = today();
    const isLate = (t: Task) => t.status !== 'done' && !!t.due_date && t.due_date < now;
    const weekAgo = Date.now() - 7 * 864e5;
    const count = (s: Status) => items.filter((t) => t.status === s).length;
    const doneThisWeek = items.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).getTime() >= weekAgo).length;
    const tags = [...new Set(items.map((t) => t.tag).filter(Boolean) as string[])].sort();
    const shown = tag ? items.filter((t) => t.tag === tag) : items;
    const progress = items.length ? Math.round((count('done') / items.length) * 100) : 0;

    // Déplacement : mise à jour immédiate à l'écran, puis enregistrement de l'ordre côté serveur.
    const move = (id: number, status: Status, before: number | null) => {
        if (id === before) return;
        const task = items.find((t) => t.id === id);
        if (!task) return;
        const rest = items.filter((t) => t.id !== id);
        const at = before === null ? -1 : rest.findIndex((t) => t.id === before);
        const moved = { ...task, status };
        setItems(at === -1 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)]);
        router.patch(route('tasks.move', id), { status, before }, { preserveScroll: true, preserveState: true });
    };
    const drop = () => {
        if (drag !== null && over) move(drag, over.status, over.before);
        setDrag(null);
        setOver(null);
    };

    const open = (t: Task | 'new', status: Status = 'todo') => {
        form.clearErrors();
        form.setData(t === 'new' ? { ...blank, status } : { title: t.title, notes: t.notes ?? '', status: t.status, priority: t.priority, tag: t.tag ?? '', due_date: t.due_date ?? '' });
        setEditing(t);
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing === 'new') form.post(route('tasks.store'), options);
        else if (editing) form.put(route('tasks.update', editing.id), options);
    };
    const remove = () => editing && editing !== 'new' && router.delete(route('tasks.destroy', editing.id), { preserveScroll: true, onSuccess: () => setEditing(null) });

    const stats = [
        { icon: 'list-todo', color: '#2563EB', kind: 'À traiter', label: 'À faire', value: count('todo'), note: null },
        { icon: 'timer', color: '#D97706', kind: 'En main', label: 'En cours', value: count('doing'), note: null },
        { icon: 'alarm', color: '#E11D48', kind: 'Échéance dépassée', label: 'En retard', value: items.filter(isLate).length, note: items.some(isLate) ? <Pill tone="danger">à traiter</Pill> : <Pill tone="success">à jour</Pill> },
        { icon: 'done', color: '#059669', kind: '7 derniers jours', label: 'Terminées', value: doneThisWeek, note: null },
    ];

    const panel = (
        <TasksPanel current="board" openTasks={count('todo') + count('doing')} practiceCount={practiceCount}>
            <PanelSection label="Avancement" aside={<Pill>{`${count('done')} sur ${items.length}`}</Pill>}>
                <div className="px-1">
                    <p className="text-2xl font-medium tabular-nums">{progress} %<span className="text-muted-foreground ml-1.5 text-xs font-normal">terminé</span></p>
                    <div className="bg-muted mt-2 flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={`${progress} % des tâches terminées`}>
                        {columns.slice().reverse().map((c) => <span key={c.key} style={{ width: `${items.length ? (count(c.key) / items.length) * 100 : 0}%`, background: c.color }} />)}
                    </div>
                </div>
            </PanelSection>
            {tags.length > 0 && (
                <PanelSection label="Étiquettes" aside={<Pill>{tags.length}</Pill>}>
                    <button className={`${rowClass} ${tag === null ? 'bg-accent' : ''}`} onClick={() => setTag(null)}><span className="flex-1">Toutes</span><Pill>{items.length}</Pill></button>
                    {tags.map((t) => (
                        <button key={t} className={`${rowClass} ${tag === t ? 'bg-accent' : ''}`} onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t}>
                            <span className="min-w-0 flex-1 truncate">{t}</span>
                            <Pill>{items.filter((x) => x.tag === t).length}</Pill>
                        </button>
                    ))}
                </PanelSection>
            )}
        </TasksPanel>
    );

    return (
        <AppLayout title="Tableau des tâches" panel={panel} panelTitle="Tâches" actions={canWrite && <Button size="sm" onClick={() => open('new')}><Plus /> Nouvelle tâche</Button>}>
            <Head title="Tâches" />
            <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 rounded-[14px] border p-3.5 sm:p-4">
                        <div className="flex items-center gap-3">
                            <IconTile icon={s.icon} color={s.color} />
                            <div className="min-w-0">
                                <span className="text-muted-foreground block truncate text-sm">{s.kind}</span>
                                <span className="block truncate text-sm font-medium">{s.label}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2"><span className="text-xl font-medium tabular-nums">{s.value}</span>{s.note}</div>
                    </div>
                ))}
            </div>

            <div className="grid items-start gap-3.5 lg:grid-cols-3">
                {columns.map((col, ci) => {
                    const list = shown.filter((t) => t.status === col.key);
                    const active = over?.status === col.key && drag !== null;
                    return (
                        <section key={col.key} aria-label={col.label} className={cn('bg-muted/50 grid content-start gap-2 rounded-[14px] border p-2.5 transition-colors', active && 'border-ring bg-accent')}
                            onDragOver={(e) => { if (drag === null) return; e.preventDefault(); if (over?.status !== col.key) setOver({ status: col.key, before: null }); }}
                            onDrop={(e) => { e.preventDefault(); drop(); }}>
                            <header className="flex items-center gap-2 px-1.5 py-1">
                                <i className="size-2 rounded-full" style={{ background: col.color }} />
                                <h2 className="flex-1 text-sm font-semibold">{col.label}</h2>
                                <Pill>{list.length}</Pill>
                                {canWrite && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Ajouter une tâche dans ${col.label}`} onClick={() => open('new', col.key)}><Plus /></Button>}
                            </header>
                            {list.map((t) => (
                                <article key={t.id} draggable={canWrite} onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }}
                                    onDragOver={(e) => { if (drag === null) return; e.preventDefault(); e.stopPropagation(); if (over?.before !== t.id) setOver({ status: col.key, before: t.id }); }}
                                    className={cn('bg-card grid gap-2 rounded-[10px] border border-l-[3px] p-3 shadow-xs', canWrite && 'cursor-grab active:cursor-grabbing', drag === t.id && 'opacity-40', over?.before === t.id && drag !== t.id && 'ring-ring ring-2')}
                                    style={{ borderLeftColor: priorities[t.priority].color }}>
                                    <button className="text-left hover:underline" onClick={() => open(t)} aria-label={`Ouvrir la tâche ${t.title}`}>
                                        <span className={cn('block text-sm font-medium break-words', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</span>
                                    </button>
                                    {t.notes && <p className="text-muted-foreground line-clamp-2 text-xs break-words">{t.notes}</p>}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {t.tag && <Pill>{t.tag}</Pill>}
                                        {t.priority === 'high' && t.status !== 'done' && <Pill tone="danger">Priorité haute</Pill>}
                                        {t.due_date && (
                                            <Pill tone={isLate(t) ? 'danger' : t.due_date === now && t.status !== 'done' ? 'warning' : 'neutral'}>
                                                <CalendarDays className="mr-1 inline size-3 align-[-1px]" />{isLate(t) ? `En retard · ${shortDate(t.due_date)}` : t.due_date === now ? "Aujourd'hui" : shortDate(t.due_date)}
                                            </Pill>
                                        )}
                                        {t.status === 'done' && <Pill tone="success"><Check className="mr-0.5 inline size-3 align-[-1px]" />Fait</Pill>}
                                        {canWrite && (
                                            <span className="ml-auto flex">
                                                {ci > 0 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci - 1].label}`} onClick={() => move(t.id, columns[ci - 1].key, null)}><ChevronLeft /></Button>}
                                                {ci < 2 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci + 1].label}`} onClick={() => move(t.id, columns[ci + 1].key, null)}><ChevronRight /></Button>}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                            {list.length === 0 && <p className="text-muted-foreground px-1.5 py-3 text-xs">{tag ? 'Aucune tâche avec cette étiquette ici.' : canWrite ? 'Rien ici. Glisse une tâche ou ajoute-en une.' : 'Rien ici.'}</p>}
                        </section>
                    );
                })}
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <form onSubmit={submit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{editing === 'new' ? 'Nouvelle tâche' : 'Modifier la tâche'}</DialogTitle>
                            <DialogDescription>Seul le titre est obligatoire.</DialogDescription>
                        </DialogHeader>
                        <label className="grid gap-1.5 text-[13px] font-medium">Titre<input className={fieldClass} required maxLength={160} autoFocus disabled={!canWrite} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />{form.errors.title && <span className="text-danger text-xs font-normal">{form.errors.title}</span>}</label>
                        <label className="grid gap-1.5 text-[13px] font-medium">Notes<textarea className={`${fieldClass} h-auto py-2`} rows={3} disabled={!canWrite} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-[13px] font-medium">État<select className={fieldClass} disabled={!canWrite} value={form.data.status} onChange={(e) => form.setData('status', e.target.value as Status)}>{columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
                            <label className="grid gap-1.5 text-[13px] font-medium">Priorité<select className={fieldClass} disabled={!canWrite} value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)}>{Object.entries(priorities).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></label>
                            <label className="grid gap-1.5 text-[13px] font-medium">Étiquette<input className={fieldClass} list="task-tags" maxLength={40} placeholder="Projet, client…" disabled={!canWrite} value={form.data.tag} onChange={(e) => form.setData('tag', e.target.value)} /><datalist id="task-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist></label>
                            <label className="grid gap-1.5 text-[13px] font-medium">Échéance<input className={fieldClass} type="date" disabled={!canWrite} value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} /></label>
                        </div>
                        {canWrite && (
                            <DialogFooter className="sm:justify-between">
                                {editing !== 'new' ? <Button type="button" variant="outline" onClick={remove}><Trash2 /> Supprimer</Button> : <span />}
                                <Button type="submit" disabled={form.processing}>{editing === 'new' ? 'Ajouter' : 'Enregistrer'}</Button>
                            </DialogFooter>
                        )}
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
