import { PanelSection, Pill, rowClass, tdClass, thClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Pencil, Trash2 } from 'lucide-react';

type Doc = { id: number; title: string; type: string; version: string; status: 'draft' | 'generated'; updated_at: string; author: string };
type DocType = { key: string; name: string; description: string; color: string; active: boolean };

const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Documents({ documents, types, canWrite }: { documents: Doc[]; types: DocType[]; canWrite: boolean }) {
    const create = (type: string) => router.post(route('documents.store'), { type });
    const remove = (d: Doc) => confirm(`Supprimer « ${d.title} » ? Cette action est définitive.`) && router.delete(route('documents.destroy', d.id));
    const ready = types.filter((t) => t.active);

    const panel = (
        <>
            <PanelSection label="Modèles" aside={<Pill>{`${ready.length} sur ${types.length}`}</Pill>}>
                {types.map((t) => (
                    <button key={t.key} className={rowClass} disabled={!t.active || !canWrite} onClick={() => create(t.key)} title={t.description}>
                        <i className="size-[7px] shrink-0 rounded-full" style={{ background: t.color }} />
                        <span className="min-w-0 flex-1 truncate">{t.name}</span>
                        {t.active ? <Pill tone="success">Prêt</Pill> : <Pill>À venir</Pill>}
                    </button>
                ))}
            </PanelSection>
            {documents.length > 0 && (
                <PanelSection label="Récents" aside={<Pill>{Math.min(documents.length, 4)}</Pill>}>
                    {documents.slice(0, 4).map((d) => (
                        <Link key={d.id} href={route('documents.edit', d.id)} className="hover:bg-accent mx-1 my-1 block rounded-r-md border-l-[3px] py-0.5 pl-2.5" style={{ borderLeftColor: d.status === 'generated' ? 'var(--chart-2)' : 'var(--chart-3)' }}>
                            <span className="block truncate text-sm font-semibold">{d.title}</span>
                            <span className="text-muted-foreground block text-xs">{`${d.type} · v${d.version}`}</span>
                        </Link>
                    ))}
                </PanelSection>
            )}
        </>
    );

    return (
        <AppLayout title="Mes documents" panel={panel} panelTitle="Documents" actions={canWrite && ready[0] && <Button size="sm" onClick={() => create(ready[0].key)}>Nouveau document</Button>}>
            <Head title="Documents" />
            <div className="bg-card overflow-x-auto rounded-[14px] border">
                <div className="border-b px-4 py-3.5">
                    <h2 className="text-sm font-semibold">Tous les documents</h2>
                    <p className="text-muted-foreground text-sm">Un document reste en brouillon jusqu'à sa génération en PDF.</p>
                </div>
                {documents.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-sm">
                        Aucun document pour l'instant. {canWrite ? 'Choisis un modèle dans le panneau pour commencer.' : 'Ton accès est en lecture seule.'}
                    </p>
                ) : (
                    <table className="w-full border-collapse text-sm tabular-nums">
                        <thead>
                            <tr>
                                {['Document', 'Modèle', 'Version', 'Modifié', 'Auteur', 'État', ''].map((h) => (
                                    <th key={h} className={thClass}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((d) => (
                                <tr key={d.id} className="[&:last-child>td]:border-b-0">
                                    <td className={`${tdClass} font-semibold`}>
                                        <Link href={route('documents.edit', d.id)} className="hover:underline">{d.title}</Link>
                                    </td>
                                    <td className={tdClass}>{d.type}</td>
                                    <td className={tdClass}>{d.version}</td>
                                    <td className={tdClass}>{date(d.updated_at)}</td>
                                    <td className={tdClass}>{d.author}</td>
                                    <td className={tdClass}>{d.status === 'generated' ? <Pill tone="success">Généré</Pill> : <Pill tone="warning">Brouillon</Pill>}</td>
                                    <td className={`${tdClass} space-x-1 text-right`}>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={route('documents.pdf', d.id)} aria-label={`Télécharger ${d.title} en PDF`}><Download /> PDF</a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('documents.edit', d.id)} aria-label={`Ouvrir ${d.title}`}><Pencil /></Link>
                                        </Button>
                                        {canWrite && (
                                            <Button variant="outline" size="sm" onClick={() => remove(d)} aria-label={`Supprimer ${d.title}`}><Trash2 /></Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </AppLayout>
    );
}
