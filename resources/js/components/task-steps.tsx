import { fieldClass } from '@/components/sy';
import { cn } from '@/lib/utils';
import { Check, Footprints, Trash2 } from 'lucide-react';
import { useState } from 'react';

export type Step = { text: string; done: boolean };
export type Template = { id: number; title: string; body: string };

/** Une fiche de bonnes pratiques devient une liste d'étapes : une ligne = une étape, sans numéros ni puces. */
export function stepsFrom(body: string): Step[] {
    return body
        .split('\n')
        .map((line) => line.replace(/^\s*(\d+\s*[.)-]|[-*•]|\[\s?x?\s?\])\s*/i, '').trim())
        .filter(Boolean)
        .slice(0, 30)
        .map((text) => ({ text: text.slice(0, 160), done: false }));
}

export const nextIndex = (steps: Step[]) => steps.findIndex((s) => !s.done);

/** Barre segmentée : un segment par étape, vert si faite, bleu pour la prochaine. */
export function StepBar({ steps, className }: { steps: Step[]; className?: string }) {
    const next = nextIndex(steps);
    const done = steps.filter((s) => s.done).length;
    return (
        <div className={cn('flex gap-1', className)} role="img" aria-label={`${done} étape${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} sur ${steps.length}`}>
            {steps.map((s, i) => <span key={i} className={cn('h-1.5 min-w-1 flex-1 rounded-full', s.done ? 'bg-success' : i === next ? 'bg-chart-1' : 'bg-input')} />)}
        </div>
    );
}

/** Le parcours d'une tâche : étapes reliées par un trait, la prochaine mise en avant. Chaque changement est transmis aussitôt. */
export function StepPath({ steps, onChange, templates, canWrite }: { steps: Step[]; onChange: (steps: Step[]) => void; templates: Template[]; canWrite: boolean }) {
    const [draft, setDraft] = useState('');
    const next = nextIndex(steps);
    const add = () => {
        const text = draft.trim();
        if (!text || steps.length >= 30) return;
        onChange([...steps, { text: text.slice(0, 160), done: false }]);
        setDraft('');
    };

    return (
        <div className="grid gap-3">
            {steps.length === 0 ? (
                <div className="bg-muted/60 flex items-center gap-3 rounded-lg p-3">
                    <span aria-hidden className="flex items-center">
                        <i className="border-success bg-success size-3 rounded-full border-2" />
                        <i className="bg-input h-0.5 w-4" />
                        <i className="border-chart-1 bg-card size-3 rounded-full border-2" />
                        <i className="bg-input h-0.5 w-4" />
                        <i className="border-input bg-card size-3 rounded-full border-2" />
                    </span>
                    <p className="text-muted-foreground text-xs">Découpe en petites étapes : la carte affichera toujours la prochaine.</p>
                </div>
            ) : (
                <ol className="grid">
                    {steps.map((s, i) => (
                        <li key={i} className="group relative flex items-start gap-3 pb-3 last:pb-0">
                            {i < steps.length - 1 && <span aria-hidden className={cn('absolute top-6 bottom-0 left-[0.6875rem] w-0.5', s.done ? 'bg-success' : 'bg-input')} />}
                            <button type="button" disabled={!canWrite} onClick={() => onChange(steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                                aria-label={s.done ? `Décocher l'étape ${s.text}` : `Cocher l'étape ${s.text}`}
                                className={cn('relative grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors',
                                    s.done ? 'border-success bg-success text-card' : i === next ? 'border-chart-1 bg-card text-foreground ring-chart-1/20 ring-4' : 'border-input bg-card text-muted-foreground hover:border-success')}>
                                {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                            </button>
                            <div className="min-w-0 flex-1 pt-0.5">
                                <p className={cn('text-sm break-words', s.done ? 'text-muted-foreground line-through' : i === next && 'font-semibold')}>{s.text}</p>
                                {i === next && <p className="text-muted-foreground flex items-center gap-1 text-xs"><Footprints className="size-3" />Prochaine étape</p>}
                            </div>
                            {canWrite && (
                                <button type="button" onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label={`Retirer l'étape ${s.text}`}
                                    className="text-muted-foreground hover:text-foreground rounded p-1 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                    <Trash2 className="size-3.5" />
                                </button>
                            )}
                        </li>
                    ))}
                </ol>
            )}
            {canWrite && (
                <div className="flex flex-wrap gap-2">
                    <input className={cn(fieldClass, 'min-w-0 flex-1')} aria-label="Nouvelle étape" placeholder="Ajouter une étape, puis Entrée" maxLength={160} value={draft}
                        onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                    {templates.length > 0 && (
                        <select className={cn(fieldClass, 'w-auto max-w-full')} aria-label="Reprendre les étapes d'une fiche" value=""
                            onChange={(e) => { const t = templates.find((x) => x.id === Number(e.target.value)); if (t) onChange([...steps, ...stepsFrom(t.body)].slice(0, 30)); }}>
                            <option value="">Depuis une fiche…</option>
                            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
}
