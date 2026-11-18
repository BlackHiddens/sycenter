import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import TaskFocus, { reasonFor } from '@/components/task-focus';
import { nextIndex, type Step, StepBar, StepPath, type Template } from '@/components/task-steps';
import { daysSince, hueOf, TaskTile, taskHues, taskIcons, WaitingRing } from '@/components/task-visual';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Archive, BellRing, BookOpenCheck, CalendarDays, Check, ChevronLeft, ChevronRight, CornerDownRight, Flame, PartyPopper, Play, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

type Status = 'todo' | 'doing' | 'waiting' | 'done';
type Task = { id: number; title: string; notes: string | null; status: Status; priority: 'low' | 'normal' | 'high'; tag: string | null; due_date: string | null; completed_at: string | null; recurrence: string | null; steps: Step[] | null;
    icon: string | null; hue: string | null; waiting_for: string | null; waiting_since: string | null; follow_up_on: string | null; follow_ups: number };
type Review = { id: number; title: string; category: string; body: string };
type Props = { tasks: Task[]; archivedCount: number; activity: { date: string; count: number }[]; streak: number; review: Review | null; reviewDue: number; practiceCount: number; templates: Template[]; canWrite: boolean };

const columns: { key: Status; label: string; color: string }[] = [
    { key: 'todo', label: 'À faire', color: 'var(--chart-1)' },
    { key: 'doing', label: 'En cours', color: 'var(--chart-3)' },
    { key: 'waiting', label: 'En attente', color: 'var(--chart-4)' },
    { key: 'done', label: 'Terminé', color: 'var(--chart-2)' },
];
const priorities = { high: { label: 'Haute', color: 'var(--destructive)' }, normal: { label: 'Normale', color: 'var(--chart-1)' }, low: { label: 'Basse', color: 'var(--input)' } };
const repeats: Record<string, string> = { daily: 'Chaque jour', weekly: 'Chaque semaine', monthly: 'Chaque mois' };
/** Au-delà, on s'éparpille : la colonne En cours le signale. */
const MAX_DOING = 3;
const today = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-JJ, heure locale
const day = (iso: string) => new Date(`${iso}T00:00:00`);
const shortDate = (iso: string) => day(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const blank = { title: '', notes: '', status: 'todo' as Status, priority: 'normal', tag: '', due_date: '', recurrence: '', steps: [] as Step[], icon: '', hue: '', waiting_for: '', follow_up_on: '' };
const inDays = (iso: string, n: number) => { const d = day(iso); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
/** Jours d'attente avant relance, comme Task::FOLLOW_UP_DAYS côté serveur. */
const FOLLOW_UP_DAYS = 3;
const card = 'bg-card grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-[0.875rem] border p-4';
const cardTitle = 'text-muted-foreground flex items-center gap-1.5 text-[0.6875rem] tracking-wider uppercase';

/** Même règle que le serveur (Task::statusFromSteps) : l'écran bouge tout de suite, le serveur confirme. */
const statusFromSteps = (current: Status, steps: Step[]): Status => {
    const done = steps.filter((s) => s.done).length;
    if (!steps.length) return current;
    if (done === steps.length) return 'done';
    if (current === 'waiting') return 'waiting';
    if (done > 0) return 'doing';
    return current === 'done' ? 'todo' : current;
};

export default function Tasks({ tasks, archivedCount, activity, streak, review, reviewDue, practiceCount, templates, canWrite }: Props) {
    const [items, setItems] = useState(tasks);
    const [tag, setTag] = useState<string | null>(null);
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [drag, setDrag] = useState<number | null>(null);
    const [over, setOver] = useState<{ status: Status; before: number | null } | null>(null);
    const [quick, setQuick] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [focusOpen, setFocusOpen] = useState(false);
    // Passage en attente : on demande d'abord qui on attend.
    const [asking, setAsking] = useState<{ id: number; before: number | null } | null>(null);
    const [whoDraft, setWhoDraft] = useState('');
    const form = useForm(blank);
    useEffect(() => setItems(tasks), [tasks]);
    useEffect(() => setRevealed(false), [review?.id]);

    const now = today();
    const isLate = (t: Task) => t.status !== 'done' && !!t.due_date && t.due_date < now;
    const count = (s: Status) => items.filter((t) => t.status === s).length;
    const tags = [...new Set(items.map((t) => t.tag).filter(Boolean) as string[])].sort();
    const shown = tag ? items.filter((t) => t.tag === tag) : items;
    const progress = items.length ? Math.round((count('done') / items.length) * 100) : 0;
    const open = editing !== null && editing !== 'new' ? items.find((t) => t.id === editing) ?? null : null;
    // À traiter maintenant : les retards d'abord, puis ce qui est commencé, puis le reste du jour et les priorités.
    const focus = items
        .map((t) => ({ t, r: reasonFor(t, now) }))
        .filter((x) => x.r && x.r.rank <= 4)
        .sort((a, b) => a.r!.rank - b.r!.rank)
        .map((x) => x.t)
        .slice(0, 5);
    const toFollowUp = (t: Task) => t.status === 'waiting' && !!t.follow_up_on && t.follow_up_on <= now;
    const peak = Math.max(1, ...activity.map((a) => a.count));

    // Les changements s'affichent tout de suite, puis le serveur confirme et renvoie l'état de référence.
    const keep = { preserveScroll: true, preserveState: true };
    const move = (id: number, status: Status, before: number | null, who?: string) => {
        if (id === before) return;
        const task = items.find((t) => t.id === id);
        if (!task) return;
        if (status === 'waiting' && task.status !== 'waiting' && who === undefined) {
            setWhoDraft(task.waiting_for ?? '');
            setAsking({ id, before });
            return;
        }
        const rest = items.filter((t) => t.id !== id);
        const at = before === null ? -1 : rest.findIndex((t) => t.id === before);
        const entering = status === 'waiting' && task.status !== 'waiting';
        const moved = {
            ...task, status,
            ...(entering ? { waiting_for: who || null, waiting_since: now, follow_up_on: inDays(now, FOLLOW_UP_DAYS) } : {}),
            ...(status !== 'waiting' ? { waiting_since: null, follow_up_on: null } : {}),
        };
        setItems(at === -1 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)]);
        router.patch(route('tasks.move', id), { status, before, ...(who !== undefined ? { waiting_for: who || null } : {}) }, keep);
    };
    const followUp = (t: Task) => {
        setItems(items.map((x) => (x.id === t.id ? { ...x, follow_up_on: inDays(now, FOLLOW_UP_DAYS), follow_ups: x.follow_ups + 1 } : x)));
        router.post(route('tasks.follow-up', t.id), {}, keep);
    };
    const received = (t: Task) => move(t.id, 'doing', null);
    const saveSteps = (id: number, steps: Step[]) => {
        setItems(items.map((t) => (t.id === id ? { ...t, steps, status: statusFromSteps(t.status, steps) } : t)));
        router.put(route('tasks.steps', id), { steps }, keep);
    };
    const checkNext = (t: Task) => {
        const steps = t.steps ?? [];
        const i = nextIndex(steps);
        if (i >= 0) saveSteps(t.id, steps.map((s, j) => (j === i ? { ...s, done: true } : s)));
    };
    const archive = (id: number) => {
        setItems(items.filter((t) => t.id !== id));
        router.post(route('tasks.archive-one', id), {}, keep);
    };
    const archiveDone = () => {
        setItems(items.filter((t) => t.status !== 'done'));
        router.post(route('tasks.archive-done'), {}, keep);
    };
    const drop = () => {
        if (drag !== null && over) move(drag, over.status, over.before);
        setDrag(null);
        setOver(null);
    };
    const addQuick = (e: FormEvent) => {
        e.preventDefault();
        if (!quick.trim()) return;
        router.post(route('tasks.store'), { ...blank, title: quick.trim(), tag: tag ?? '' }, { ...keep, onSuccess: () => setQuick('') });
    };
    const answer = (remembered: boolean) => review && router.post(route('practices.review', review.id), { remembered }, keep);

    const edit = (t: Task | 'new', status: Status = 'todo') => {
        form.clearErrors();
        form.setData(t === 'new' ? { ...blank, status } : {
            title: t.title, notes: t.notes ?? '', status: t.status, priority: t.priority, tag: t.tag ?? '', due_date: t.due_date ?? '', recurrence: t.recurrence ?? '', steps: [],
            icon: t.icon ?? '', hue: t.hue ?? '', waiting_for: t.waiting_for ?? '', follow_up_on: t.follow_up_on ?? '',
        });
        setEditing(t === 'new' ? 'new' : t.id);
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing === 'new') form.post(route('tasks.store'), options);
        else if (open) form.put(route('tasks.update', open.id), options);
    };
    const remove = () => open && router.delete(route('tasks.destroy', open.id), { preserveScroll: true, onSuccess: () => setEditing(null) });

    const checkButton = (t: Task) => (
        <button disabled={!canWrite} onClick={() => move(t.id, t.status === 'done' ? 'todo' : 'done', null)} aria-label={t.status === 'done' ? `Rouvrir ${t.title}` : `Terminer ${t.title}`}
            className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors', t.status === 'done' ? 'border-success bg-success text-card' : 'border-input hover:border-success hover:text-success text-transparent')}>
            <Check className="size-3" strokeWidth={3} />
        </button>
    );
    const dueChip = (t: Task) => t.due_date && (
        <Pill tone={isLate(t) ? 'danger' : t.due_date === now && t.status !== 'done' ? 'warning' : 'neutral'}>
            <CalendarDays className="mr-1 inline size-3 align-[-1px]" />{isLate(t) ? `Retard · ${shortDate(t.due_date)}` : t.due_date === now ? "Aujourd'hui" : shortDate(t.due_date)}
        </Pill>
    );
    /** La ligne qui évite d'oublier où on en est : la prochaine étape, à cocher d'un clic. */
    const nextLine = (t: Task) => {
        const steps = t.steps ?? [];
        const i = nextIndex(steps);
        if (t.status === 'done' || i < 0) return null;
        return (
            <button disabled={!canWrite} onClick={() => checkNext(t)} className="group/next hover:bg-accent -mx-1 flex min-w-0 items-start gap-1.5 rounded-md px-1 py-0.5 text-left text-[0.8125rem]"
                aria-label={`Marquer comme faite : ${steps[i].text}`}>
                <CornerDownRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0 group-hover/next:hidden" />
                <Check className="text-success mt-0.5 hidden size-3.5 shrink-0 group-hover/next:block" strokeWidth={3} />
                <span className="min-w-0 break-words"><span className="text-muted-foreground tabular-nums">{`${i + 1}/${steps.length} `}</span>{steps[i].text}</span>
            </button>
        );
    };

    const panel = (
        <TasksPanel current="board" openTasks={count('todo') + count('doing') + count('waiting')} practiceCount={practiceCount} archivedCount={archivedCount}>
            <PanelSection label="Avancement" aside={<Pill>{`${count('done')} sur ${items.length}`}</Pill>}>
                <div className="px-1">
                    <p className="text-2xl font-medium tabular-nums">{progress} %</p>
                    <div className="bg-muted mt-2 flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={`${progress} % des tâches terminées`}>
                        {columns.slice().reverse().map((c) => <span key={c.key} style={{ width: `${items.length ? (count(c.key) / items.length) * 100 : 0}%`, background: c.color }} />)}
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">Terminée depuis 7 jours, une tâche part seule dans l'archive.</p>
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
        <AppLayout title="Tableau des tâches" panel={panel} panelTitle="Tâches" actions={<>
            <Button size="sm" onClick={() => setFocusOpen(true)}><Play /> Démarrer</Button>
            {canWrite && <Button size="sm" variant="outline" onClick={() => edit('new')} aria-label="Nouvelle tâche"><Plus /><span className="max-sm:hidden">Nouvelle tâche</span></Button>}
        </>}>
            <Head title="Tâches" />
            <div className="grid items-start gap-3.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
                <section className={cn(card, 'md:col-span-2 xl:col-span-1')} aria-label="Maintenant">
                    <h2 className={cardTitle}><CalendarDays className="size-3.5" />Maintenant{focus.length > 0 && <Pill tone={focus.some(isLate) ? 'danger' : 'neutral'}>{focus.length}</Pill>}</h2>
                    {focus.length === 0 ? (
                        <div className="flex items-center gap-3 py-1">
                            <span className="bg-success-soft text-success grid size-10 place-items-center rounded-full"><PartyPopper className="size-5" /></span>
                            <p className="text-sm font-medium">Rien d'urgent, rien à relancer.</p>
                        </div>
                    ) : (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
                            {focus.map((t) => (
                                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)] gap-1">
                                    <div className="flex items-center gap-2.5">
                                        {t.status === 'waiting'
                                            ? <WaitingRing who={t.waiting_for} since={t.waiting_since} followUp={t.follow_up_on} today={now} className="size-8 [&>span]:size-[1.375rem] [&>span]:text-[0.55rem]" />
                                            : <TaskTile icon={t.icon} hue={t.hue} tag={t.tag} title={t.title} className="size-8" />}
                                        <button className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline" onClick={() => edit(t)}>{t.title}</button>
                                        {t.status === 'waiting' ? <Pill tone="warning"><BellRing className="mr-1 inline size-3 align-[-0.125rem]" />Relancer</Pill> : dueChip(t)}
                                    </div>
                                    {(t.steps?.length ?? 0) > 0 && t.status !== 'waiting' && <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pl-[2.625rem]"><StepBar steps={t.steps!} />{nextLine(t)}</div>}
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
                                    <span className={cn('text-[0.625rem] leading-none uppercase', a.date === now ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{day(a.date).toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
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
                                    <p className="text-muted-foreground max-h-28 overflow-y-auto text-[0.8125rem] break-words whitespace-pre-wrap">{review.body}</p>
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

            <div className="grid items-start gap-3.5 md:grid-cols-2 xl:grid-cols-4">
                {columns.map((col, ci) => {
                    const list = shown.filter((t) => t.status === col.key);
                    const active = over?.status === col.key && drag !== null;
                    const crowded = col.key === 'doing' && list.length > MAX_DOING;
                    return (
                        <section key={col.key} aria-label={col.label} className={cn('bg-muted/50 grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2 rounded-[0.875rem] border p-2.5 transition-colors', active && 'border-ring bg-accent')}
                            onDragOver={(e) => { if (drag === null) return; e.preventDefault(); if (over?.status !== col.key) setOver({ status: col.key, before: null }); }}
                            onDrop={(e) => { e.preventDefault(); drop(); }}>
                            <header className="flex items-center gap-2 px-1.5 py-1">
                                <i className="size-2 rounded-full" style={{ background: col.color }} />
                                <h2 className="flex-1 text-sm font-semibold">{col.label}</h2>
                                <Pill tone={crowded ? 'warning' : 'neutral'}>{list.length}</Pill>
                                {canWrite && col.key === 'done' && list.length > 0 && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label="Archiver toutes les tâches terminées" title="Tout archiver" onClick={archiveDone}><Archive /></Button>}
                                {canWrite && col.key !== 'done' && <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Ajouter une tâche dans ${col.label}`} onClick={() => edit('new', col.key)}><Plus /></Button>}
                            </header>
                            {crowded && <p className="px-1.5"><Pill tone="warning">{`Plus de ${MAX_DOING} en parallèle : termines-en une d'abord`}</Pill></p>}
                            {col.key === 'todo' && canWrite && (
                                <form onSubmit={addQuick}>
                                    <input className={cn(fieldClass, 'bg-card')} aria-label="Ajout rapide d'une tâche" placeholder="Ajouter, puis Entrée" maxLength={160} value={quick} onChange={(e) => setQuick(e.target.value)} />
                                </form>
                            )}
                            {list.map((t) => {
                                const steps = t.steps ?? [];
                                return (
                                    <article key={t.id} draggable={canWrite} onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }}
                                        onDragOver={(e) => { if (drag === null) return; e.preventDefault(); e.stopPropagation(); if (over?.before !== t.id) setOver({ status: col.key, before: t.id }); }}
                                        className={cn('bg-card grid grid-cols-[minmax(0,1fr)] gap-2 rounded-[0.625rem] border border-l-[3px] p-3 shadow-xs', canWrite && 'cursor-grab active:cursor-grabbing', drag === t.id && 'opacity-40', over?.before === t.id && drag !== t.id && 'ring-ring ring-2')}
                                        style={{ borderLeftColor: priorities[t.priority].color }}>
                                        <div className="flex items-start gap-2.5">
                                            {t.status === 'waiting'
                                                ? <WaitingRing who={t.waiting_for} since={t.waiting_since} followUp={t.follow_up_on} today={now} />
                                                : <TaskTile icon={t.icon} hue={t.hue} tag={t.tag} title={t.title} className={cn(t.status === 'done' && 'opacity-50')} />}
                                            <button className="min-w-0 flex-1 text-left hover:underline" onClick={() => edit(t)} aria-label={`Ouvrir la tâche ${t.title}`}>
                                                <span className={cn('block text-sm font-medium break-words', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</span>
                                                {t.status === 'waiting' && (
                                                    <span className="text-muted-foreground block text-xs">{`${t.waiting_for || 'Quelqu’un'} · depuis ${daysSince(t.waiting_since, now)} j${t.follow_ups ? ` · ${t.follow_ups} relance${t.follow_ups > 1 ? 's' : ''}` : ''}`}</span>
                                                )}
                                            </button>
                                            {t.status !== 'waiting' && <span className="pt-0.5">{checkButton(t)}</span>}
                                        </div>
                                        {steps.length > 0 && t.status !== 'waiting' && <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pl-[2.875rem]"><StepBar steps={steps} />{nextLine(t)}</div>}
                                        {t.status === 'waiting' && canWrite && (
                                            <div className="flex flex-wrap gap-1.5 pl-[3.125rem]">
                                                <Button size="sm" variant={toFollowUp(t) ? 'default' : 'outline'} className="h-7 px-2.5 text-xs" onClick={() => followUp(t)}><BellRing /> {toFollowUp(t) ? 'Relancer' : "J'ai relancé"}</Button>
                                                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => received(t)}><Check /> Reçu</Button>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5 pl-[2.875rem]">
                                            {t.tag && <Pill>{t.tag}</Pill>}
                                            {dueChip(t)}
                                            {t.recurrence && <Pill><Repeat className="inline size-3 align-[-1px]" aria-label={repeats[t.recurrence]} /></Pill>}
                                            {canWrite && (
                                                <span className="ml-auto flex">
                                                    {ci > 0 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci - 1].label}`} onClick={() => move(t.id, columns[ci - 1].key, null)}><ChevronLeft /></Button>}
                                                    {ci < columns.length - 1 && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Déplacer vers ${columns[ci + 1].label}`} onClick={() => move(t.id, columns[ci + 1].key, null)}><ChevronRight /></Button>}
                                                    {t.status === 'done' && <Button variant="ghost" size="sm" className="size-6 p-0" aria-label={`Archiver ${t.title}`} onClick={() => archive(t.id)}><Archive /></Button>}
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                            {list.length === 0 && col.key !== 'todo' && <p className="text-muted-foreground px-1.5 py-3 text-xs">Vide.</p>}
                        </section>
                    );
                })}
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-h-[90svh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing === 'new' ? 'Nouvelle tâche' : 'La tâche'}</DialogTitle>
                        <DialogDescription>{editing === 'new' ? 'Un titre suffit. Les étapes t\'aideront à ne rien oublier.' : 'Coche les étapes au fur et à mesure : la tâche avance toute seule.'}</DialogDescription>
                    </DialogHeader>
                    <section className="grid gap-2" aria-label="Étapes">
                        <h3 className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                            Étapes{(open ? open.steps : form.data.steps)?.length ? <Pill>{`${(open ? open.steps! : form.data.steps).filter((s) => s.done).length}/${(open ? open.steps! : form.data.steps).length}`}</Pill> : null}
                        </h3>
                        {open ? (
                            <StepPath steps={open.steps ?? []} onChange={(s) => saveSteps(open.id, s)} templates={templates} canWrite={canWrite} />
                        ) : (
                            <StepPath steps={form.data.steps} onChange={(s) => form.setData('steps', s)} templates={templates} canWrite={canWrite} />
                        )}
                    </section>
                    <form onSubmit={submit} className="grid gap-4 border-t pt-4">
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Titre<input className={fieldClass} required maxLength={160} autoFocus={editing === 'new'} disabled={!canWrite} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />{form.errors.title && <span className="text-danger text-xs font-normal">{form.errors.title}</span>}</label>
                        <fieldset className="grid gap-2" disabled={!canWrite}>
                            <legend className="mb-1.5 flex items-center gap-2.5 text-[0.8125rem] font-medium">
                                <TaskTile icon={form.data.icon || null} hue={form.data.hue || null} tag={form.data.tag || null} title={form.data.title || '?'} className="size-8" />
                                Image de la tâche
                            </legend>
                            <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label="Pictogramme">
                                {Object.entries(taskIcons).map(([key, { icon: Icon, label }]) => (
                                    <button type="button" key={key} role="radio" aria-checked={form.data.icon === key} aria-label={label} title={label}
                                        onClick={() => form.setData('icon', form.data.icon === key ? '' : key)}
                                        className={cn('grid aspect-square place-items-center rounded-md border transition-colors', form.data.icon === key ? 'text-white' : 'text-muted-foreground hover:text-foreground border-transparent bg-muted/60')}
                                        style={form.data.icon === key ? { background: hueOf(form.data.hue || null, form.data.tag || null), borderColor: 'transparent' } : undefined}>
                                        <Icon className="size-4" />
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Couleur">
                                {Object.entries(taskHues).map(([key, hex]) => (
                                    <button type="button" key={key} role="radio" aria-checked={form.data.hue === key} aria-label={`Couleur ${key}`}
                                        onClick={() => form.setData('hue', form.data.hue === key ? '' : key)}
                                        className={cn('size-6 rounded-full border-2 border-transparent transition-transform hover:scale-110', form.data.hue === key && 'border-foreground scale-110')} style={{ background: hex }} />
                                ))}
                                <span className="text-muted-foreground ml-1 text-xs">Sans choix : couleur de l'étiquette.</span>
                            </div>
                        </fieldset>
                        {form.data.status === 'waiting' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-[0.8125rem] font-medium">En attente de<input className={fieldClass} maxLength={80} placeholder="Éditeur, collègue…" disabled={!canWrite} value={form.data.waiting_for} onChange={(e) => form.setData('waiting_for', e.target.value)} /></label>
                                <label className="grid gap-1.5 text-[0.8125rem] font-medium">Relancer le<input className={fieldClass} type="date" disabled={!canWrite} value={form.data.follow_up_on} onChange={(e) => form.setData('follow_up_on', e.target.value)} /></label>
                            </div>
                        )}
                        <label className="grid gap-1.5 text-[0.8125rem] font-medium">Notes<textarea className={`${fieldClass} h-auto py-2`} rows={2} disabled={!canWrite} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {editing === 'new' && <label className="grid gap-1.5 text-[0.8125rem] font-medium">Colonne<select className={fieldClass} value={form.data.status} onChange={(e) => form.setData('status', e.target.value as Status)}>{columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>}
                            <label className="grid gap-1.5 text-[0.8125rem] font-medium">Priorité<select className={fieldClass} disabled={!canWrite} value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)}>{Object.entries(priorities).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></label>
                            <label className="grid gap-1.5 text-[0.8125rem] font-medium">Échéance<input className={fieldClass} type="date" disabled={!canWrite} value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} /></label>
                            <label className="grid gap-1.5 text-[0.8125rem] font-medium">Répétition<select className={fieldClass} disabled={!canWrite} value={form.data.recurrence} onChange={(e) => form.setData('recurrence', e.target.value)}><option value="">Jamais</option>{Object.entries(repeats).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                            <label className={cn('grid gap-1.5 text-[0.8125rem] font-medium', editing !== 'new' && 'sm:col-span-2')}>Étiquette<input className={fieldClass} list="task-tags" maxLength={40} placeholder="Projet, client…" disabled={!canWrite} value={form.data.tag} onChange={(e) => form.setData('tag', e.target.value)} /><datalist id="task-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist></label>
                        </div>
                        {canWrite && (
                            <DialogFooter className="gap-2 sm:justify-between">
                                {open ? (
                                    <span className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => { archive(open.id); setEditing(null); }}><Archive /> Archiver</Button>
                                        <Button type="button" variant="outline" onClick={remove} aria-label="Supprimer la tâche"><Trash2 /></Button>
                                    </span>
                                ) : <span />}
                                <Button type="submit" disabled={form.processing}>{editing === 'new' ? 'Ajouter' : 'Enregistrer'}</Button>
                            </DialogFooter>
                        )}
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={asking !== null} onOpenChange={(o) => !o && setAsking(null)}>
                <DialogContent className="sm:max-w-sm">
                    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (asking) move(asking.id, 'waiting', asking.before, whoDraft.trim()); setAsking(null); }}>
                        <DialogHeader>
                            <DialogTitle>J'attends qui ?</DialogTitle>
                            <DialogDescription>{`Une relance te sera proposée dans ${FOLLOW_UP_DAYS} jours.`}</DialogDescription>
                        </DialogHeader>
                        <input className={fieldClass} autoFocus maxLength={80} placeholder="Éditeur, collègue, service…" value={whoDraft} onChange={(e) => setWhoDraft(e.target.value)} aria-label="En attente de" />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAsking(null)}>Annuler</Button>
                            <Button type="submit">Mettre en attente</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <TaskFocus open={focusOpen} onOpenChange={setFocusOpen} tasks={items} today={now} canWrite={canWrite}
                onStep={checkNext} onDone={(t) => move(t.id, 'done', null)} onWait={(t, who) => move(t.id, 'waiting', null, who)}
                onFollowUp={followUp} onReceived={received} />
        </AppLayout>
    );
}
