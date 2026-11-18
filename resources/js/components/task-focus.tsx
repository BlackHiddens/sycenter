import { fieldClass, Pill } from '@/components/sy';
import { nextIndex, type Step, StepBar } from '@/components/task-steps';
import { daysSince, TaskTile, WaitingRing } from '@/components/task-visual';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlarmClock, BellRing, Check, Flame, Hourglass, PartyPopper, Play, SkipForward, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export type FocusTask = {
    id: number; title: string; notes: string | null; status: 'todo' | 'doing' | 'waiting' | 'done'; priority: 'low' | 'normal' | 'high';
    tag: string | null; due_date: string | null; steps: Step[] | null; icon: string | null; hue: string | null;
    waiting_for: string | null; waiting_since: string | null; follow_up_on: string | null;
};

type Reason = { rank: number; icon: LucideIcon; label: string; tone: 'danger' | 'warning' | 'neutral' };

/** Pourquoi cette tâche passe maintenant. Le rang fixe l'ordre de passage ; null : pas pour aujourd'hui. */
export function reasonFor(t: FocusTask, today: string): Reason | null {
    if (t.status === 'done') return null;
    if (t.status === 'waiting') {
        if (!t.follow_up_on || t.follow_up_on > today) return null;
        return { rank: 1, icon: BellRing, label: `Relancer ${t.waiting_for || 'la personne attendue'}`, tone: 'warning' };
    }
    if (t.due_date && t.due_date < today) {
        const n = daysSince(t.due_date, today);
        return { rank: 0, icon: AlarmClock, label: `En retard de ${n} jour${n > 1 ? 's' : ''}`, tone: 'danger' };
    }
    if (t.due_date === today) return { rank: 2, icon: Sun, label: "À faire aujourd'hui", tone: 'warning' };
    if (t.status === 'doing') return { rank: 3, icon: Play, label: 'Déjà commencée', tone: 'neutral' };
    if (t.priority === 'high') return { rank: 4, icon: Flame, label: 'Priorité haute', tone: 'neutral' };
    return { rank: 5, icon: Hourglass, label: 'Ensuite', tone: 'neutral' };
}

/** Ordre de passage du mode Démarrer : retards, relances, jour même, entamées, prioritaires, puis le reste du tableau. */
export const focusQueue = (tasks: FocusTask[], today: string) =>
    tasks.map((t, i) => ({ t, i, r: reasonFor(t, today) })).filter((x) => x.r).sort((a, b) => a.r!.rank - b.r!.rank || a.i - b.i).map((x) => x.t.id);

type Props<T extends FocusTask> = {
    open: boolean; onOpenChange: (open: boolean) => void; tasks: T[]; today: string; canWrite: boolean;
    onStep: (t: T) => void; onDone: (t: T) => void; onWait: (t: T, who: string) => void;
    onFollowUp: (t: T) => void; onReceived: (t: T) => void;
};

/** Une seule carte à la fois, grande, avec son image : on ne choisit pas, on fait ou on passe. */
export default function TaskFocus<T extends FocusTask>({ open, onOpenChange, tasks, today, canWrite, onStep, onDone, onWait, onFollowUp, onReceived }: Props<T>) {
    const [queue, setQueue] = useState<number[]>([]);
    const [at, setAt] = useState(0);
    const [outcome, setOutcome] = useState<Record<number, 'done' | 'skip' | 'wait'>>({});
    const [asking, setAsking] = useState(false);
    const [who, setWho] = useState('');

    // La file est figée à l'ouverture : les cartes ne changent pas d'ordre sous les yeux.
    useEffect(() => {
        if (!open) return;
        setQueue(focusQueue(tasks, today));
        setAt(0);
        setOutcome({});
        setAsking(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const current = tasks.find((t) => t.id === queue[at]);
    const finished = at >= queue.length;
    const next = (kind: 'done' | 'skip' | 'wait') => {
        setOutcome({ ...outcome, [queue[at]]: kind });
        setAsking(false);
        setWho('');
        setAt(at + 1);
    };
    const steps = current?.steps ?? [];
    const ni = nextIndex(steps);
    const reason = current ? reasonFor(current, today) ?? reasonFor({ ...current, status: 'todo' }, today) : null;
    const doneCount = Object.values(outcome).filter((o) => o !== 'skip').length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl" aria-describedby={undefined}>
                <DialogTitle className="sr-only">Démarrer : une tâche à la fois</DialogTitle>
                <div className="flex items-center gap-1.5 border-b px-5 py-3.5 pr-12" aria-label={`Tâche ${Math.min(at + 1, queue.length)} sur ${queue.length}`}>
                    {queue.map((id, i) => (
                        <span key={id} className={cn('h-1.5 flex-1 rounded-full transition-colors',
                            outcome[id] === 'done' ? 'bg-success' : outcome[id] === 'wait' ? 'bg-chart-4' : outcome[id] === 'skip' ? 'bg-input' : i === at ? 'bg-foreground' : 'bg-muted')} />
                    ))}
                </div>

                {finished || !current ? (
                    <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
                        <span className="bg-success-soft text-success grid size-16 place-items-center rounded-full"><PartyPopper className="size-8" /></span>
                        <p className="text-xl font-semibold">{queue.length ? 'Tout est passé en revue' : "Rien d'urgent"}</p>
                        <DialogDescription>{queue.length ? `${doneCount} avancée${doneCount > 1 ? 's' : ''} sur ${queue.length}.` : 'Ni retard, ni relance, ni tâche du jour.'}</DialogDescription>
                        <Button className="mt-2" onClick={() => onOpenChange(false)}>Retour au tableau</Button>
                    </div>
                ) : (
                    <div className="grid gap-5 px-6 pt-7 pb-6">
                        <div className="flex items-center gap-4">
                            {current.status === 'waiting'
                                ? <WaitingRing who={current.waiting_for} since={current.waiting_since} followUp={current.follow_up_on} today={today} className="size-20 [&>span]:size-14 [&>span]:text-lg" />
                                : <TaskTile icon={current.icon} hue={current.hue} tag={current.tag} title={current.title} className="size-20 rounded-2xl text-3xl" />}
                            <div className="grid min-w-0 gap-1.5">
                                {reason && (
                                    <span className="w-fit"><Pill tone={reason.tone}><reason.icon className="mr-1 inline size-3 align-[-0.125rem]" />{reason.label}</Pill></span>
                                )}
                                <p className="text-xl leading-snug font-semibold break-words">{current.title}</p>
                                {current.tag && <span className="w-fit"><Pill>{current.tag}</Pill></span>}
                            </div>
                        </div>

                        {steps.length > 0 && ni >= 0 && current.status !== 'waiting' && (
                            <div className="bg-muted/60 grid gap-2.5 rounded-xl p-4">
                                <StepBar steps={steps} />
                                <p className="text-muted-foreground text-xs tracking-wider uppercase">{`Prochaine étape · ${ni + 1}/${steps.length}`}</p>
                                <p className="text-base font-medium break-words">{steps[ni].text}</p>
                            </div>
                        )}
                        {current.status === 'waiting' && (
                            <p className="bg-muted/60 rounded-xl p-4 text-sm">
                                {`En attente de ${current.waiting_for || 'quelqu’un'} depuis ${daysSince(current.waiting_since, today)} jour${daysSince(current.waiting_since, today) > 1 ? 's' : ''}.`}
                            </p>
                        )}
                        {current.notes && <p className="text-muted-foreground line-clamp-3 text-sm break-words whitespace-pre-line">{current.notes}</p>}

                        {asking ? (
                            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onWait(current, who.trim()); next('wait'); }}>
                                <input className={fieldClass} autoFocus maxLength={80} placeholder="J'attends qui ? (éditeur, collègue…)" value={who} onChange={(e) => setWho(e.target.value)} aria-label="En attente de" />
                                <Button type="submit">Valider</Button>
                            </form>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {canWrite && current.status === 'waiting' && (
                                    <>
                                        <Button onClick={() => { onFollowUp(current); next('done'); }}><BellRing /> J'ai relancé</Button>
                                        <Button variant="outline" onClick={() => { onReceived(current); next('done'); }}><Check /> Reçu</Button>
                                    </>
                                )}
                                {canWrite && current.status !== 'waiting' && (
                                    <>
                                        <Button onClick={() => {
                                            if (steps.length && ni >= 0 && ni < steps.length - 1) { onStep(current); return; }
                                            if (steps.length && ni >= 0) onStep(current); else onDone(current);
                                            next('done');
                                        }}>
                                            <Check /> {steps.length && ni >= 0 && ni < steps.length - 1 ? 'Étape faite' : "C'est fait"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setAsking(true)}><Hourglass /> J'attends quelqu'un</Button>
                                    </>
                                )}
                                <Button variant="ghost" className="ml-auto" onClick={() => next('skip')}><SkipForward /> Plus tard</Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
