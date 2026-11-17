import '@excalidraw/excalidraw/index.css';

import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import { stepsFrom } from '@/components/task-steps';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { templates } from '@/pages/notes/templates';
import { convertToExcalidrawElements, Excalidraw, exportToBlob, exportToSvg, getSceneVersion, MainMenu, newElementWith, restoreElements, serializeAsJSON } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, ExcalidrawTextElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CornerDownRight, FileCode2, FileImage, FileText, ListChecks, Pin, PinOff, Shapes, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Ref = { id: number; title: string; color: string };
type Note = Ref & { pinned: boolean; scene: string | null; updated_at: string };
type Colors = Record<string, { name: string; hex: string }>;
type Props = { note: Note; template: string | null; others: Ref[]; backlinks: Ref[]; colors: Colors; canWrite: boolean; canTasks: boolean };
type Status = 'saved' | 'dirty' | 'saving' | 'error';
type Scene = { elements: readonly ExcalidrawElement[]; appState: AppState; files: BinaryFiles };

const xsrf = () => decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note';
const live = (elements: readonly ExcalidrawElement[]) => elements.filter((e) => !e.isDeleted);
const byReading = (a: ExcalidrawElement, b: ExcalidrawElement) => a.y - b.y || a.x - b.x;
/** Tout le texte du dessin, dans l'ordre de lecture (de haut en bas, puis de gauche à droite). */
const textOf = (elements: readonly ExcalidrawElement[]) =>
    live(elements).filter((e): e is ExcalidrawTextElement => e.type === 'text').sort(byReading).map((e) => e.text).join('\n');
/** Identifiants des notes visées par les liens du dessin (même règle que Note::linksIn côté serveur). */
const linksOf = (elements: readonly ExcalidrawElement[]) =>
    [...new Set(live(elements).map((e) => /\/notes\/(\d+)(?:[/?#]|$)/.exec(e.link ?? '')?.[1]).filter(Boolean).map(Number))];

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
});

/** Le dessin suit le thème de la plateforme (clair ou sombre). */
function useDark() {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return dark;
}

export default function NoteEdit({ note, template, others, backlinks, colors, canWrite, canTasks }: Props) {
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const [status, setStatus] = useState<Status>('saved');
    const [error, setError] = useState('');
    const [flash, setFlash] = useState('');
    const [selected, setSelected] = useState(0);
    const [links, setLinks] = useState<number[]>([]);
    const [title, setTitle] = useState(note.title);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const dark = useDark();

    const latest = useRef<Scene | null>(null);
    const lastKey = useRef<string | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const inFlight = useRef(false);
    const again = useRef(false);

    // Le modèle choisi fait partie des données de départ : Excalidraw les charge un instant après s'être
    // déclaré prêt, et écraserait un modèle posé plus tôt par updateScene.
    const fromTemplate = useRef(!note.scene && canWrite && !!template && !!templates[template]?.().length);
    const templated = useRef(fromTemplate.current); // fromTemplate repasse à faux au premier enregistrement
    const initialData = useMemo(() => {
        if (fromTemplate.current) {
            return { elements: convertToExcalidrawElements(templates[template!](), { regenerateIds: true }), appState: { viewBackgroundColor: '#ffffff' }, scrollToContent: true };
        }
        if (!note.scene) return { appState: { viewBackgroundColor: '#ffffff' } };
        const scene = JSON.parse(note.scene);
        return { elements: scene.elements ?? [], appState: scene.appState ?? {}, files: scene.files ?? {}, scrollToContent: true };
        // Les données initiales ne servent qu'au premier affichage : la toile garde ensuite son propre état.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const say = (message: string) => {
        setFlash(message);
        window.setTimeout(() => setFlash(''), 4000);
    };

    const body = async ({ elements, appState, files }: Scene, withPreview: boolean) => {
        const shown = live(elements);
        let preview: string | null = null;
        if (withPreview && shown.length) {
            const blob = await exportToBlob({ elements: shown, appState: { ...appState, exportBackground: true, exportWithDarkMode: false }, files, maxWidthOrHeight: 480, mimeType: 'image/png' });
            preview = await toDataUrl(blob);
            if (preview.length > 590_000) preview = null;
        }
        return JSON.stringify({ scene: serializeAsJSON(shown, appState, files, 'local'), text: textOf(shown), preview });
    };

    const send = (payload: string) =>
        fetch(route('notes.scene', note.id), {
            method: 'PUT',
            credentials: 'same-origin',
            keepalive: payload.length < 60_000,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrf() },
            body: payload,
        });

    const save = async () => {
        timer.current = undefined; // plus rien en attente : la sortie de page n'a rien à rattraper
        if (!latest.current) return;
        if (inFlight.current) {
            again.current = true;
            return;
        }
        inFlight.current = true;
        setStatus('saving');
        try {
            const res = await send(await body(latest.current, true));
            if (res.ok) {
                setStatus('saved');
                setError('');
            } else {
                const json = await res.json().catch(() => null);
                setStatus('error');
                setError(json?.errors?.scene?.[0] ?? json?.message ?? "L'enregistrement a échoué. Le dessin reste à l'écran ; réessaie dans un instant.");
            }
        } catch {
            setStatus('error');
            setError("Pas de connexion : le dessin n'est pas enregistré. Il le sera à la prochaine modification.");
        } finally {
            inFlight.current = false;
            if (again.current) {
                again.current = false;
                save();
            }
        }
    };

    // Enregistrement automatique, une seconde après la dernière modification réelle du dessin.
    const onChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        const count = Object.keys(appState.selectedElementIds).length;
        if (count !== selected) setSelected(count);
        if (!canWrite) return;
        const key = `${getSceneVersion(elements)}|${Object.keys(files).length}|${appState.viewBackgroundColor}`;
        latest.current = { elements, appState, files };
        if (lastKey.current === null || key === lastKey.current) {
            lastKey.current = key;
            // Un modèle tout juste posé est enregistré sans attendre un premier coup de crayon.
            if (!fromTemplate.current || !live(elements).length) return;
            fromTemplate.current = false;
        }
        lastKey.current = key;
        setLinks(linksOf(elements));
        setStatus('dirty');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(save, 1000);
    };

    // En quittant la page, on envoie ce qui n'est pas encore enregistré (sans vignette, pour aller vite).
    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (timer.current !== undefined && latest.current) e.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => {
            window.removeEventListener('beforeunload', warn);
            if (timer.current !== undefined && latest.current) {
                window.clearTimeout(timer.current);
                body(latest.current, false).then(send);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // À l'ouverture : liens existants pour le panneau, puis, une fois la police manuscrite chargée,
    // textes remesurés (sinon un modèle tout neuf a des libellés rognés) et dessin cadré dans l'écran.
    useEffect(() => {
        if (!api) return;
        if (note.scene) setLinks(linksOf(JSON.parse(note.scene).elements ?? []));
        let cancelled = false;
        Promise.all([document.fonts.load('20px Excalifont'), new Promise((r) => window.setTimeout(r, 150))]).then(() => {
            if (cancelled) return;
            const elements = api.getSceneElements();
            if (!elements.length) return;
            if (templated.current) api.updateScene({ elements: restoreElements(elements, null, { refreshDimensions: true, repairBindings: true }) });
            api.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.85, animate: false });
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api]);

    const meta = (data: Partial<Note>) => router.put(route('notes.update', note.id), data, { preserveScroll: true, preserveState: true });
    const rename = () => {
        const clean = title.trim();
        if (clean && clean !== note.title) meta({ title: clean });
        else setTitle(note.title);
    };

    /** Lie la sélection à une autre note ; sans sélection, pose une étiquette-lien au centre de l'écran. */
    const linkTo = (target: Ref) => {
        if (!api) return;
        const url = `${window.location.origin}/notes/${target.id}`;
        const ids = api.getAppState().selectedElementIds;
        const elements = api.getSceneElements();
        if (Object.keys(ids).length) {
            api.updateScene({ elements: elements.map((e) => (ids[e.id] ? newElementWith(e, { link: url }) : e)) });
            say(`La sélection mène maintenant à « ${target.title} ».`);
            return;
        }
        const s = api.getAppState();
        const x = -s.scrollX + s.width / 2 / s.zoom.value - 120;
        const y = -s.scrollY + s.height / 2 / s.zoom.value - 32;
        const tag = convertToExcalidrawElements([{
            type: 'rectangle', x, y, width: 240, height: 64, link: url, backgroundColor: '#e7f5ff', fillStyle: 'solid', strokeColor: colors[target.color]?.hex ?? '#1e1e1e',
            roundness: { type: 3 }, label: { text: `↗ ${target.title}`, fontSize: 18 },
        }], { regenerateIds: true });
        api.updateScene({ elements: [...elements, ...tag] });
        say(`Lien vers « ${target.title} » posé au centre.`);
    };

    /** Le texte sélectionné devient une tâche : première ligne = titre, lignes suivantes = étapes. */
    const toTask = () => {
        if (!api) return;
        const ids = api.getAppState().selectedElementIds;
        const all: readonly ExcalidrawElement[] = api.getSceneElements();
        const texts = all
            .filter((e): e is ExcalidrawTextElement => e.type === 'text' && (!!ids[e.id] || (!!e.containerId && !!ids[e.containerId])))
            .sort(byReading).map((e) => e.text).join('\n');
        const lines = stepsFrom(texts);
        if (!lines.length) return say('Sélectionne un texte, ou une forme qui contient du texte.');
        const [first, ...steps] = lines;
        router.post(route('tasks.store'), {
            title: first.text, notes: `Depuis la note « ${note.title} »`, status: 'todo', priority: 'normal', tag: '', due_date: '', recurrence: '', steps,
        }, { preserveScroll: true, preserveState: true, onSuccess: () => say(`Tâche « ${first.text} » créée${steps.length ? ` avec ${steps.length} étape${steps.length > 1 ? 's' : ''}` : ''}.`) });
    };

    const exportAs = async (kind: 'png' | 'svg' | 'md' | 'excalidraw') => {
        if (!api) return;
        const elements = api.getSceneElements();
        const appState = { ...api.getAppState(), exportBackground: true, exportWithDarkMode: false };
        const files = api.getFiles();
        const name = slug(note.title);
        if (!elements.length && kind !== 'md') return say('La note est vide : rien à exporter.');
        if (kind === 'png') download(await exportToBlob({ elements, appState: { ...appState, exportScale: 2 }, files, mimeType: 'image/png' }), `${name}.png`);
        if (kind === 'svg') download(new Blob([(await exportToSvg({ elements, appState, files })).outerHTML], { type: 'image/svg+xml' }), `${name}.svg`);
        if (kind === 'md') download(new Blob([`# ${note.title}\n\n${textOf(elements)}\n`], { type: 'text/markdown' }), `${name}.md`);
        if (kind === 'excalidraw') download(new Blob([serializeAsJSON(elements, appState, files, 'local')], { type: 'application/json' }), `${name}.excalidraw`);
    };

    const outgoing = others.filter((o) => links.includes(o.id));
    const statusPill = { saved: <Pill tone="success">Enregistré</Pill>, dirty: <Pill>Modifié</Pill>, saving: <Pill>Enregistrement…</Pill>, error: <Pill tone="danger">Non enregistré</Pill> }[status];
    const noteRow = (n: Ref, icon: React.ReactNode) => (
        <Link key={n.id} href={route('notes.edit', n.id)} className={rowClass}>
            {icon}
            <i className="size-[7px] shrink-0 rounded-full" style={{ background: colors[n.color]?.hex }} />
            <span className="min-w-0 flex-1 truncate">{n.title}</span>
        </Link>
    );

    const panel = (
        <>
            <PanelSection label="Note">
                <div className="grid gap-3 px-1">
                    <input className={fieldClass} aria-label="Titre de la note" maxLength={120} disabled={!canWrite} value={title}
                        onChange={(e) => setTitle(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
                    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Couleur de la note">
                        {Object.entries(colors).map(([key, c]) => (
                            <button key={key} role="radio" aria-checked={note.color === key} aria-label={c.name} title={c.name} disabled={!canWrite} onClick={() => meta({ color: key })}
                                className={cn('size-6 rounded-full border-2 border-transparent transition-transform hover:scale-110', note.color === key && 'border-foreground scale-110')} style={{ background: c.hex }} />
                        ))}
                        <span className="text-muted-foreground ml-1 text-xs">{colors[note.color]?.name}</span>
                    </div>
                    {canWrite && (
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => meta({ pinned: !note.pinned })}>
                            {note.pinned ? <><PinOff /> Désépingler</> : <><Pin /> Épingler en haut</>}
                        </Button>
                    )}
                </div>
            </PanelSection>
            <PanelSection label="Liens" aside={<Pill>{outgoing.length + backlinks.length}</Pill>}>
                {outgoing.map((n) => noteRow(n, <CornerDownRight className="text-muted-foreground size-3.5 shrink-0" aria-label="Lien depuis cette note" />))}
                {backlinks.map((n) => noteRow(n, <ArrowLeft className="text-muted-foreground size-3.5 shrink-0" aria-label="Lien vers cette note" />))}
                {canWrite && others.length > 0 && (
                    <select className={cn(fieldClass, 'mt-1')} aria-label="Lier à une autre note" value=""
                        onChange={(e) => { const t = others.find((o) => o.id === Number(e.target.value)); if (t) linkTo(t); }}>
                        <option value="">{selected ? 'Lier la sélection à…' : 'Poser un lien vers…'}</option>
                        {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                )}
                {outgoing.length + backlinks.length === 0 && others.length === 0 && <p className="text-muted-foreground px-1 text-xs">Crée une deuxième note pour les relier.</p>}
            </PanelSection>
            {canTasks && (
                <PanelSection label="Transformer">
                    <button className={rowClass} onClick={toTask} disabled={!selected}>
                        <ListChecks className="text-muted-foreground size-4 shrink-0" />
                        <span className="flex-1">Créer une tâche</span>
                        {!!selected && <Pill>{selected}</Pill>}
                    </button>
                    <p className="text-muted-foreground px-1 text-xs">Sélectionne du texte : la 1<sup>re</sup> ligne devient le titre, les suivantes les étapes.</p>
                </PanelSection>
            )}
            <PanelSection label="Exporter">
                <div className="grid grid-cols-2 gap-1.5 px-1">
                    <Button variant="outline" size="sm" onClick={() => exportAs('png')}><FileImage /> PNG</Button>
                    <Button variant="outline" size="sm" onClick={() => exportAs('svg')}><Shapes /> SVG</Button>
                    <Button variant="outline" size="sm" onClick={() => exportAs('md')}><FileText /> Texte</Button>
                    <Button variant="outline" size="sm" onClick={() => exportAs('excalidraw')}><FileCode2 /> Excalidraw</Button>
                </div>
            </PanelSection>
            {canWrite && (
                <PanelSection>
                    <button className={rowClass} onClick={() => setConfirmDelete(true)}><Trash2 className="text-muted-foreground size-4 shrink-0" /><span className="flex-1">Supprimer la note</span></button>
                </PanelSection>
            )}
        </>
    );

    return (
        <AppLayout title={note.title} panel={panel} panelTitle="Notes"
            actions={<>{statusPill}<Button variant="outline" size="sm" asChild><Link href={route('notes.index')}>Toutes les notes</Link></Button></>}>
            <Head title={note.title} />
            {(flash || error) && (
                <p role="status" className={cn('rounded-lg px-3 py-2 text-sm', error ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success')}>{error || flash}</p>
            )}
            <div className="h-[calc(100svh-7rem)] min-h-[480px] overflow-hidden rounded-[14px] border">
                <Excalidraw
                    excalidrawAPI={setApi}
                    initialData={initialData}
                    onChange={onChange}
                    theme={dark ? 'dark' : 'light'}
                    langCode="fr-FR"
                    name={note.title}
                    viewModeEnabled={!canWrite}
                    UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: null, export: false, saveAsImage: false } }}
                    onLinkOpen={(element, event) => {
                        try {
                            const url = new URL(element.link ?? '', window.location.origin);
                            if (url.origin === window.location.origin && /^\/notes\/\d+/.test(url.pathname)) {
                                event.preventDefault();
                                router.visit(url.pathname);
                            }
                        } catch {
                            /* lien externe ou mal formé : Excalidraw l'ouvre lui-même */
                        }
                    }}
                >
                    <MainMenu>
                        <MainMenu.DefaultItems.ChangeCanvasBackground />
                        <MainMenu.DefaultItems.ClearCanvas />
                        <MainMenu.DefaultItems.Help />
                    </MainMenu>
                </Excalidraw>
            </div>

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer « {note.title} » ?</DialogTitle>
                        <DialogDescription>Le dessin sera perdu définitivement. Exporte-le d'abord si tu veux en garder une copie.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={() => router.delete(route('notes.destroy', note.id))}><Trash2 /> Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
