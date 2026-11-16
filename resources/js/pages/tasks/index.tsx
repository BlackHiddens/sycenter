import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpenCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Flame, PartyPopper, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

type Status = 'todo' | 'doing' | 'done';
type Task = { id: number; title: string; notes: string | null; status: Status; priority: 'low' | 'normal' | 'high'; tag: string | null; due_date: string | null; completed_at: string | null; recurrence: string | null };
type Review = { id: number; title: string; category: string; body: string };
type Props = { tasks: Task[]; archivedCount: number; activity: { date: string; count: number }[]; streak: number; review: Review | null; reviewDue: number; practiceCount: number; canWrite: boolean };

const columns: { key: Status; label: string; color: string }[] = [
    { key: 'todo', label: 'À faire', color: 'var(--chart-1)' },
    { key: 'doing', label: 'En cours', color: 'var(--chart-3)' },
    { key: 'done', label: 'Terminé', color: 'var(--chart-2)' },
];
const priorities = { high: { label: 'Haute', color: 'var(--destructive)' }, normal: { label: 'Normale', color: 'var(--chart-1)' }, low: { label: 'Basse', color: 'var(--input)' } };
const repeats: Record<string, string> = { daily: 'Chaque jour', weekly: 'Chaque semaine', monthly: 'Chaque mois' };
const today = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-JJ, heure locale
const day = (iso: string) => new Date(`${iso}T00:00:00`);
const shortDate = (iso: string) => day(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const blank = { title: '', notes: '', status: 'todo' as Status, priority: 'normal', tag: '', due_date: '', recurrence: '' };
const card = 'bg-card grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-[14px] border p-4';
const cardTitle = 'text-muted-foreground flex items-center gap-1.5 text-[11px] tracking-wider uppercase';

export default function Tasks({ tasks, archivedCount, activity, streak, review, reviewDue, practiceCount, canWrite }: Props) {
    const [items, setItems] = useState(tasks);
    const [tag, setTag] = useState<string | null>(null);
    const [editing, setEditing] = useState<Task | 'new' | null>(null);
    const [drag, setDrag] = useState<number | null>(null);
    const [over, setOver] = useState<{ status: Status; before: number | null } | null>(null);
    const [quick, setQuick] = useState('');
    const [revealed, setRevealed] = useState(false);
    const form = useForm(blank);
    useEffect(() => setItems(tasks), [tasks]);
    useEffect(() => setRevealed(false), [review?.id]);

    const now = today();
    const isLate = (t: Task) => t.status !== 'done' && !!t.due_date && t.due_date < now;
    const count = (s: Status) => items.filter((t) => t.status === s).length;
    const tags = [...new Set(items.map((t) => t.tag).filter(Boolean) as string[])].sort();
    const shown = tag ? items.filter((t) => t.tag === tag) : items;
    const progress = items.length ? Math.round((count('done') / items.length) * 100) : 0;
    // À traiter aujourd'hui : en retard, dues aujourd'hui, ou prioritaires. Les retards d'abord.
    const focus = items
        .filter((t) => t.status !== 'done' && (isLate(t) || t.due_date === now || t.priority === 'high'))
        .sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9'))
        .slice(0, 4);
    const peak = Math.max(1, ...activity.map((a) => a.count));

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
    const addQuick = (e: FormEvent) => {
        e.preventDefault();
        if (!quick.trim()) return;
        router.post(route('tasks.store'), { ...blank, title: quick.trim(), tag: tag ?? '' }, { preserveScroll: true, preserveState: true, onSuccess: () => setQuick('') });
    };
    const answer = (remembered: boolean) => review && router.post(route('practices.review', review.id), { remembered }, { preserveScroll: true, preserveState: true });

    const open = (t: Task | 'new', status: Status = 'todo') => {
        form.clearErrors();
        form.setData(t === 'new' ? { ...blank, status } : { title: t.title, notes: t.notes ?? '', status: t.status, priority: t.priority, tag: t.tag ?? '', due_date: t.due_date ?? '', recurrence: t.recurrence ?? '' });
        setEditing(t);
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing === 'new') form.post(route('tasks.store'), options);
        else if (editing) form.put(route('tasks.update', editing.id), options);
    };
    const remove = () => editing && editing !== 'new' && router.delete(route('tasks.destroy', editing.id), { preserveScroll: true, onSuccess: () => setEditing(null) });

    const checkButton = (t: Task) => (
        <button disabled={!canWrite} onClick={() => move(t.id, t.status === 'done' ? 'todo' : 'done', null)} aria-label={t.status === 'done' ? `Rouvrir ${t.title}` : `Terminer ${t.title}`}
            className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors', t.status === 'done' ? 'border-success bg-success text-card' : 'border-input hover:border-success text-transparent hover:text-success')}>
            <Check className="size-3" strokeWidth={3} />
        </button>
    );
    const dueChip = (t: Task) => t.due_date && (
        <Pill tone={isLate(t) ? 'danger' : t.due_date === now && t.status !== 'done' ? 'warning' : 'neutral'}>
            <CalendarDays className="mr-1 inline size-3 align-[-1px]" />{t.due_date === now ? "Aujourd'hui" : shortDate(t.due_date)}
        </Pill>
    );

    const panel = (
        <TasksPanel current="board" openTasks={count('todo') + count('doing')} practiceCount={practiceCount}>
            <PanelSection label="Avancement" aside={<Pill>{`${count('done')} sur ${items.length}`}</Pill>}>
                <div className="px-1">
                    <p className="text-2xl font-medium tabular-nums">{progress} %</p>
                    <div className="bg-muted mt-2 flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={`${progress} % des tâches terminées`}>
                        {columns.slice().reverse().map((c) => <span key={c.key} style={{ width: `${items.length ? (count(c.key) / items.length) * 100 : 0}%`, background: c.color }} />)}
                    </div>
                    {archivedCount > 0 && <p className="text-muted-foreground mt-2 text-xs">{`${archivedCount} tâche${archivedCount > 1 ? 's' : ''} terminée${archivedCount > 1 ? 's' : ''} depuis plus de 7 jours, rangée${archivedCount > 1 ? 's' : ''} automatiquement.`}</p>}
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
            <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
                <section className={card} aria-label="Aujourd'hui">
                    <h2 className={cardTitle}><CalendarDays className="size-3.5" />Aujourd'hui{focus.length > 0 && <Pill tone={focus.some(isLate) ? 'danger' : 'neutral'}>{focus.length}</Pill>}</h2>
                    {focus.length === 0 ? (
                        <div className="flex items-center gap-3 py-1">
                            <span className="bg-success-soft text-success grid size-10 place-items-center rounded-full"><PartyPopper className="size-5" /></span>
                            <p className="text-sm font-medium">Rien d'urgent.</p>
                        </div>
                    ) : (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                            {focus.map((t) => (
                                <li key={t.id} className="flex items-center gap-2.5">
                                    {checkButton(t)}
                                    <button className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline" onClick={() => open(t)}>{t.title}</button>
                                    {isLate(t) ? <Pill tone="danger">{`Retard · ${shortDate(t.due_date!)}`}</Pill> : dueChip(t)}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={card} aria-label="Série">
                    <h2 className={cardTitle}><Flame className="size-3.5" />Série</h2>
                    <div className="flex items-end justify-between gap-3">
                        <p className="text-3xl leading-none font-medium tabular-nums">{streak}<span className="text-muted-foreground ml-1.5 text-xs font-normal">{streak > 1 ? 'jours' : 'jour'}</span></p>
                        <div className="flex h-12 items-end gap-1.5" role="img" aria-label={`Tâches terminées sur 7 jours : ${activity.map((a) => a.count).join(', ')}`}>
                            {activity.map((a) => (
                                <div key={a.date} className="grid justify-items-center gap-1" title={`${shortDate(a.date)} : ${a.count}`}>
                                    <span className="w-3 rounded-sm" style={{ height: `${a.count ? 8 + (a.count / peak) * 24 : 3}px`, background: a.count ? 'var(--chart-2)' : 'var(--input)' }} />
                                    <span className={cn('text-[10px] leading-none uppercase', a.date === now ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{day(a.date).toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className={card} aria-label="À réviser">
                    <h2 className={cardTitle}><BookOpenCheck className="size-3.5" />À réviser{reviewDue > 0 && <Pill>{reviewDue}</Pill>}</h2>
                    {review ? (
                        <>
                            <div><Pill>{review.category}</Pill><p className="mt-1.5 text-sm font-medium break-words">{review.title}</p></div>
                            {revealed ? (
                                <>
                                    <p className="text-muted-foreground max-h-28 overflow-y-auto text-[13px] break-words whitespace-pre-wrap">{review.body}</p>
                                    {canWrite && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" onClick={() => answer(true)}><Check /> Je savais</Button>
                                            <Button size="sm" variant="outline" onClick={() => answer(false)}><RotateCcw /> À revoir</Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div><Button size="sm" variant="outline" onClick={() => setRevealed(true)}>Voir la réponse</Button></div>
                            )}
                        </>
                    ) : practiceCount > 0 ? (
                        <div className="flex items-center gap-3 py-1">
                            <span className="bg-success-soft text-success grid size-10 place-items-center rounded-full"><Check className="size-5" /></span>
                            <p className="text-sm font-medium">Tout est révisé.</p>
                        </div>
                    ) : (
                        <div><Button size="sm" variant="outline" asChild><Link href={route('practices.index')}><Plus /> Première fiche</Link></Button></div>
                    )}
                </section>
            </div>

            <div className="grid items-start gap-3.5 lg:grid-cols-3">
                {columns.map((col, ci) => {
                    const list = shown.filter((t) => t.status === col.key);
                    const active = over?.status === col.key && drag !== null;
                    return (
                        <section key={col.key} aria-label={col.label} className={cn('bg-muted/50 grid min-w-0 content-start gap-2 rounded-[14px] border p-2.5 transition-colors', active && 'border-ring bg-accent')}
                            onDragOver={(e) => { if (drag === null) return; e.preventDefault(); if (over?.status !== col.key) setOver({ status: col.key, before: null }); }}
                            onDrop={(e) => { e.preventDefault(); drop(); }}>
                            <header className="flex items-center gap-2 px-1.5 py-1">
                                <i className="size-2 rounded-full" style={{ background: col.color }} />
                                <h2 className="flex-1 text-sm font-semibold">{col.label}</h2>
                                <Pill>{list.length}</Pill>
                                {canWrite && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Ajouter une tâche dans ${col.label}`} onClick={() => open('new', col.key)}><Plus /></Button>}
                            </header>
                            {col.key === 'todo' && canWrite && (
                                <form onSubmit={addQuick}>
                                    <input className={cn(fieldClass, 'bg-card')} aria-label="Ajout rapide d'une tâche" placeholder="Ajouter, puis Entrée" maxLength={160} value={quick} onChange={(e) => setQuick(e.target.value)} />
                                </form>
                            )}
                            {list.map((t) => (
                                <article key={t.id} draggable={canWrite} onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }}
                                    onDragOver={(e) => { if (drag === null) return; e.preventDefault(); e.stopPropagation(); if (over?.before !== t.id) setOver({ status: col.key, before: t.id }); }}
                                    className={cn('bg-card grid gap-2 rounded-[10px] border border-l-[3px] p-3 shadow-xs', canWrite && 'cursor-grab active:cursor-grabbing', drag === t.id && 'opacity-40', over?.before === t.id && drag !== t.id && 'ring-ring ring-2')}
                                    style={{ borderLeftColor: priorities[t.priority].color }}>
                                    <div className="flex items-start gap-2.5">
                                        <span className="pt-0.5">{checkButton(t)}</span>
                                        <button className="min-w-0 flex-1 text-left hover:underline" onClick={() => open(t)} aria-label={`Ouvrir la tâche ${t.title}`}>
                                            <span className={cn('block text-sm font-medium break-words', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 pl-[30px]">
                                        {t.tag && <Pill>{t.tag}</Pill>}
                                        {dueChip(t)}
                                        {t.recurrence && <Pill><Repeat className="inline size-3 align-[-1px]" aria-label={repeats[t.recurrence]} /></Pill>}
                                        {canWrite && (
                                            <span className="ml-auto flex">
                                                {ci > 0 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci - 1].label}`} onClick={() => move(t.id, columns[ci - 1].key, null)}><ChevronLeft /></Button>}
                                                {ci < 2 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci + 1].label}`} onClick={() => move(t.id, columns[ci + 1].key, null)}><ChevronRight /></Button>}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                            {list.length === 0 && col.key !== 'todo' && <p className="text-muted-foreground px-1.5 py-3 text-xs">Vide.</p>}
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
                            <label className="grid gap-1.5 text-[13px] font-medium">Échéance<input className={fieldClass} type="date" disabled={!canWrite} value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} /></label>
                            <label className="grid gap-1.5 text-[13px] font-medium">Répétition<select className={fieldClass} disabled={!canWrite} value={form.data.recurrence} onChange={(e) => form.setData('recurrence', e.target.value)}><option value="">Jamais</option>{Object.entries(repeats).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><span className="text-muted-foreground text-xs font-normal">Terminée, elle se recrée seule pour la fois suivante.</span></label>
                            <label className="grid gap-1.5 text-[13px] font-medium sm:col-span-2">Étiquette<input className={fieldClass} list="task-tags" maxLength={40} placeholder="Projet, client…" disabled={!canWrite} value={form.data.tag} onChange={(e) => form.setData('tag', e.target.value)} /><datalist id="task-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist></label>
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
