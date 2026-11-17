import { Pill } from '@/components/sy';
import { type Step } from '@/components/task-steps';
import TasksPanel from '@/components/tasks-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Archive, Check, CircleDashed, ListChecks, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Task = { id: number; title: string; status: string; tag: string | null; steps: Step[] | null; completed_at: string | null; archived_at: string | null };
type Props = { tasks: Task[]; weeks: { week: string; count: number }[]; openTasks: number; practiceCount: number; canWrite: boolean };

const date = (iso: string) => new Date(iso);
const month = (iso: string) => date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

export default function TasksArchive({ tasks, weeks, openTasks, practiceCount, canWrite }: Props) {
    const [confirm, setConfirm] = useState(false);
    const keep = { preserveScroll: true };
    const when = (t: Task) => t.archived_at ?? t.completed_at ?? '';
    const groups = tasks.reduce<Record<string, Task[]>>((acc, t) => ({ ...acc, [month(when(t))]: [...(acc[month(when(t))] ?? []), t] }), {});
    const peak = Math.max(1, ...weeks.map((w) => w.count));
    const total = weeks.reduce((n, w) => n + w.count, 0);

    return (
        <AppLayout title="Archive" panel={<TasksPanel current="archive" openTasks={openTasks} practiceCount={practiceCount} archivedCount={tasks.length} />} panelTitle="Tâches"
            actions={canWrite && tasks.length > 0 && <Button size="sm" variant="outline" onClick={() => setConfirm(true)}><Trash2 /> Vider l'archive</Button>}>
            <Head title="Archive des tâches" />

            <section className="bg-card grid gap-4 rounded-[0.875rem] border p-4" aria-label="Rythme">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-muted-foreground text-[0.6875rem] tracking-wider uppercase">12 dernières semaines</h2>
                    <p className="text-2xl font-medium tabular-nums">{total}<span className="text-muted-foreground ml-1.5 text-xs font-normal">{total > 1 ? 'tâches terminées' : 'tâche terminée'}</span></p>
                </div>
                <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Tâches terminées par semaine : ${weeks.map((w) => w.count).join(', ')}`}>
                    {weeks.map((w, i) => (
                        <div key={w.week} className="grid min-w-0 flex-1 justify-items-center gap-1.5" title={`Semaine du ${date(w.week).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : ${w.count}`}>
                            <span className="text-muted-foreground text-[0.625rem] tabular-nums">{w.count || ''}</span>
                            <span className="w-full max-w-7 rounded-md" style={{ height: `${w.count ? 6 + (w.count / peak) * 58 : 3}px`, background: w.count ? (i === weeks.length - 1 ? 'var(--chart-2)' : 'color-mix(in srgb, var(--chart-2) 55%, var(--card))') : 'var(--input)' }} />
                        </div>
                    ))}
                </div>
            </section>

            {tasks.length === 0 ? (
                <div className="bg-card flex items-center gap-4 rounded-[0.875rem] border p-6">
                    <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full"><Archive className="size-6" /></span>
                    <div>
                        <p className="text-sm font-medium">L'archive est vide.</p>
                        <p className="text-muted-foreground text-sm">Les tâches terminées y arrivent seules après 7 jours, ou d'un clic sur l'icône d'archive.</p>
                    </div>
                </div>
            ) : (
                Object.entries(groups).map(([label, list]) => (
                    <section key={label} className="bg-card overflow-hidden rounded-[0.875rem] border" aria-label={label}>
                        <h2 className="bg-muted/50 flex items-center justify-between border-b px-4 py-2.5 text-sm font-semibold first-letter:uppercase">{label}<Pill>{list.length}</Pill></h2>
                        <ul className="divide-y">
                            {list.map((t) => (
                                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
                                    {t.status === 'done'
                                        ? <span className="bg-success text-card grid size-5 shrink-0 place-items-center rounded-full" aria-label="Terminée"><Check className="size-3" strokeWidth={3} /></span>
                                        : <CircleDashed className="text-muted-foreground size-5 shrink-0" aria-label="Archivée sans être terminée" />}
                                    <span className="min-w-0 flex-1 text-sm font-medium break-words">{t.title}</span>
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        {t.tag && <Pill>{t.tag}</Pill>}
                                        {(t.steps?.length ?? 0) > 0 && <Pill><ListChecks className="mr-1 inline size-3 align-[-1px]" />{t.steps!.length}</Pill>}
                                        <span className="text-muted-foreground text-xs tabular-nums">{date(when(t)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                        {canWrite && (
                                            <>
                                                <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Remettre à faire : ${t.title}`} title="Remettre à faire" onClick={() => router.post(route('tasks.restore', t.id), {}, keep)}><RotateCcw /></Button>
                                                <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={`Supprimer définitivement : ${t.title}`} title="Supprimer" onClick={() => router.delete(route('tasks.destroy', t.id), keep)}><Trash2 /></Button>
                                            </>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}

            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vider l'archive ?</DialogTitle>
                        <DialogDescription>{`Les ${tasks.length} tâches archivées seront supprimées définitivement. Le graphique, lui, ne compte que les tâches encore enregistrées.`}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={() => router.delete(route('tasks.purge'), { ...keep, onSuccess: () => setConfirm(false) })}><Trash2 /> Tout supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
