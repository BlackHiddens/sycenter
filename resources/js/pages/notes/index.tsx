import NoteMap, { type MapNote } from '@/components/note-map';
import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { LayoutGrid, Link2, Network, Pin, Plus, Search, Shapes } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

type Note = MapNote & { pinned: boolean; text: string | null; updated_at: string };
type Colors = Record<string, { name: string; hex: string }>;
type Props = { notes: Note[]; colors: Colors; templates: Record<string, string>; canWrite: boolean };

const strokes = 'fill-none stroke-current';
/** Petits croquis des modèles, pour choisir d'un coup d'œil. */
const sketches: Record<string, ReactNode> = {
    blank: <rect x="8" y="8" width="64" height="44" rx="4" className={strokes} strokeDasharray="4 4" strokeWidth="1.5" />,
    mindmap: (
        <g className={strokes} strokeWidth="1.5">
            <ellipse cx="40" cy="30" rx="13" ry="8" />
            {[[12, 12], [68, 12], [12, 48], [68, 48]].map(([x, y]) => <g key={`${x}${y}`}><line x1="40" y1="30" x2={x} y2={y} /><rect x={x - 8} y={y - 5} width="16" height="10" rx="2" className="fill-card" /></g>)}
        </g>
    ),
    flow: (
        <g className={strokes} strokeWidth="1.5">
            <ellipse cx="11" cy="30" rx="7" ry="6" /><rect x="24" y="24" width="14" height="12" rx="2" /><rect x="46" y="24" width="14" height="12" rx="2" /><path d="M70 22 L77 30 L70 38 L63 30 Z" />
            <path d="M18 30 H24 M38 30 H46 M60 30 H63" />
        </g>
    ),
    matrix: <g className={strokes} strokeWidth="1.5"><rect x="12" y="8" width="27" height="20" rx="2" /><rect x="42" y="8" width="27" height="20" rx="2" /><rect x="12" y="31" width="27" height="20" rx="2" /><rect x="42" y="31" width="27" height="20" rx="2" /></g>,
    compare: (
        <g className={strokes} strokeWidth="1.5">
            <rect x="10" y="6" width="26" height="10" rx="2" /><rect x="44" y="6" width="26" height="10" rx="2" />
            <path d="M12 22 H32 M12 28 H30 M46 22 H66 M46 28 H64" /><ellipse cx="40" cy="47" rx="12" ry="6" /><path d="M23 32 L35 42 M57 32 L45 42" />
        </g>
    ),
};

/** Extrait de texte autour du mot cherché, mot surligné. */
function snippet(text: string | null, q: string) {
    if (!text || !q) return null;
    const at = text.toLowerCase().indexOf(q.toLowerCase());
    if (at < 0) return null;
    const start = Math.max(0, at - 30);
    return (
        <span className="text-muted-foreground line-clamp-2 text-xs break-words">
            {start > 0 && '…'}{text.slice(start, at)}<mark className="bg-warning-soft text-foreground rounded-sm px-0.5">{text.slice(at, at + q.length)}</mark>{text.slice(at + q.length, at + q.length + 50)}
        </span>
    );
}

export default function Notes({ notes, colors, templates, canWrite }: Props) {
    const [view, setView] = useState<'gallery' | 'map'>(() => {
        try { return (localStorage.getItem('notes-view') as 'gallery' | 'map') || 'gallery'; } catch { return 'gallery'; }
    });
    const [color, setColor] = useState<string | null>(null);
    const [pinnedOnly, setPinnedOnly] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState({ title: '', color: 'slate', template: 'mindmap' });

    const q = query.trim().toLowerCase();
    const shown = notes.filter((n) => (!color || n.color === color) && (!pinnedOnly || n.pinned) && (!q || `${n.title}\n${n.text ?? ''}`.toLowerCase().includes(q)));
    const linkCount = (n: Note) => (n.links?.length ?? 0) + notes.filter((o) => o.links?.includes(n.id)).length;
    const pick = (v: 'gallery' | 'map') => {
        setView(v);
        try { localStorage.setItem('notes-view', v); } catch { /* préférence non mémorisée, sans gravité */ }
    };
    const create = (e: FormEvent) => {
        e.preventDefault();
        router.post(route('notes.store'), draft);
    };

    const panel = (
        <>
            <PanelSection label="Vue">
                <button className={cn(rowClass, view === 'gallery' && 'bg-accent')} onClick={() => pick('gallery')} aria-pressed={view === 'gallery'}><LayoutGrid className="text-muted-foreground size-4 shrink-0" /><span className="flex-1">Galerie</span></button>
                <button className={cn(rowClass, view === 'map' && 'bg-accent')} onClick={() => pick('map')} aria-pressed={view === 'map'}><Network className="text-muted-foreground size-4 shrink-0" /><span className="flex-1">Carte</span></button>
            </PanelSection>
            <PanelSection label="Thèmes" aside={<Pill>{notes.length}</Pill>}>
                <button className={cn(rowClass, !color && !pinnedOnly && 'bg-accent')} onClick={() => { setColor(null); setPinnedOnly(false); }}><span className="flex-1">Toutes</span><Pill>{notes.length}</Pill></button>
                {notes.some((n) => n.pinned) && (
                    <button className={cn(rowClass, pinnedOnly && 'bg-accent')} onClick={() => setPinnedOnly(!pinnedOnly)} aria-pressed={pinnedOnly}>
                        <Pin className="text-muted-foreground size-3.5 shrink-0" /><span className="flex-1">Épinglées</span><Pill>{notes.filter((n) => n.pinned).length}</Pill>
                    </button>
                )}
                {Object.entries(colors).map(([key, c]) => {
                    const count = notes.filter((n) => n.color === key).length;
                    return (
                        <button key={key} className={cn(rowClass, color === key && 'bg-accent')} onClick={() => setColor(color === key ? null : key)} aria-pressed={color === key} disabled={!count}>
                            <i className="size-2.5 shrink-0 rounded-full" style={{ background: c.hex, opacity: count ? 1 : 0.35 }} />
                            <span className="flex-1">{c.name}</span>
                            <Pill>{count}</Pill>
                        </button>
                    );
                })}
            </PanelSection>
        </>
    );

    return (
        <AppLayout title="Notes" panel={panel} panelTitle="Notes" actions={canWrite && <Button size="sm" onClick={() => setCreating(true)}><Plus /> Nouvelle note</Button>}>
            <Head title="Notes" />
            <label className="relative block max-w-md">
                <span className="sr-only">Chercher dans les notes</span>
                <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <input className={cn(fieldClass, 'pl-9')} type="search" placeholder="Chercher un mot écrit dans un dessin…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>

            {notes.length === 0 ? (
                <div className="bg-card grid gap-4 rounded-[14px] border p-6">
                    <div className="flex items-center gap-4">
                        <span className="bg-muted text-muted-foreground grid size-12 shrink-0 place-items-center rounded-full"><Shapes className="size-6" /></span>
                        <div>
                            <p className="text-sm font-medium">Commence par dessiner.</p>
                            <p className="text-muted-foreground text-sm">Une note est une feuille libre : formes, flèches, croquis, texte. Choisis un point de départ.</p>
                        </div>
                    </div>
                    {canWrite && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
                            {Object.entries(templates).map(([key, label]) => (
                                <button key={key} onClick={() => router.post(route('notes.store'), { template: key })} className="bg-muted/50 hover:border-foreground grid justify-items-center gap-2 rounded-xl border p-3 text-sm font-medium">
                                    <svg viewBox="0 0 80 60" className="text-muted-foreground h-14 w-20" aria-hidden>{sketches[key]}</svg>{label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : shown.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune note ne correspond.</p>
            ) : view === 'map' ? (
                <NoteMap notes={shown} colors={colors} />
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
                    {shown.map((n) => (
                        <Link key={n.id} href={route('notes.edit', n.id)} className="bg-card hover:border-muted-foreground group grid min-w-0 overflow-hidden rounded-[14px] border transition-colors">
                            <div className="bg-muted relative aspect-[4/3] border-b">
                                <span className="absolute inset-x-0 top-0 h-1" style={{ background: colors[n.color]?.hex }} />
                                {n.preview
                                    ? <img src={n.preview} alt="" className="size-full object-contain p-3 transition-transform group-hover:scale-[1.03]" loading="lazy" />
                                    : <span className="text-muted-foreground grid size-full place-items-center"><Shapes className="size-8 opacity-50" /></span>}
                                {n.pinned && <span className="bg-card absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full border" aria-label="Épinglée"><Pin className="size-3" /></span>}
                            </div>
                            <div className="grid min-w-0 gap-1 p-3">
                                <span className="truncate text-sm font-semibold">{n.title}</span>
                                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                                    {new Date(n.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    {linkCount(n) > 0 && <span className="flex items-center gap-0.5"><Link2 className="size-3" />{linkCount(n)}</span>}
                                </span>
                                {snippet(n.text, q)}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent>
                    <form onSubmit={create} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>Nouvelle note</DialogTitle>
                            <DialogDescription>Choisis une forme de départ. Tout reste modifiable ensuite.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2" role="radiogroup" aria-label="Modèle de départ">
                            {Object.entries(templates).map(([key, label]) => (
                                <button type="button" key={key} role="radio" aria-checked={draft.template === key} onClick={() => setDraft({ ...draft, template: key })}
                                    className={cn('grid justify-items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs font-medium transition-colors', draft.template === key ? 'border-foreground bg-accent' : 'hover:border-muted-foreground border-transparent bg-muted/50')}>
                                    <svg viewBox="0 0 80 60" className="text-muted-foreground h-12 w-16" aria-hidden>{sketches[key]}</svg>{label}
                                </button>
                            ))}
                        </div>
                        <label className="grid gap-1.5 text-[13px] font-medium">Titre<input className={fieldClass} maxLength={120} placeholder="Facultatif" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                        <div className="grid gap-1.5 text-[13px] font-medium">
                            Thème
                            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Couleur de la note">
                                {Object.entries(colors).map(([key, c]) => (
                                    <button type="button" key={key} role="radio" aria-checked={draft.color === key} onClick={() => setDraft({ ...draft, color: key })}
                                        className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', draft.color === key ? 'border-foreground bg-accent' : 'border-border')}>
                                        <i className="size-2.5 rounded-full" style={{ background: c.hex }} />{c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
                            <Button type="submit">Créer et dessiner</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
