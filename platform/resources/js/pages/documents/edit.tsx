import { fieldClass, PanelSection, Pill, rowClass, tdClass, thClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

type Vlan = { id: number | string; name: string; subnet: string; gateway: string };
type Flow = { source: string; destination: string; service: string; action: string };
type NetData = {
    client: string; classification: string; sites: number | string; wan: string; topology: string; vlans: Vlan[];
    firewall: string; remote_access: string; dmz: boolean; nac: boolean; flows: Flow[];
};
type Doc = { id: number; title: string; version: string; status: string; type: string; data: NetData };

const steps = ['Contexte', 'Topologie', 'Adressage', 'Sécurité', 'Génération'];
const WAN = ['VPN IPsec', 'SD-WAN', 'MPLS', 'Fibre dédiée'];
const TOPO = ['Cœur / distribution / accès', 'Collapsed core', 'Spine-leaf'];
const REMOTE = ['VPN SSL + MFA', 'ZTNA', 'Aucun'];

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5 text-[13px] font-medium">
            {label}
            {children}
        </label>
    );
}

export default function Edit({ document: doc, typeName, canWrite }: { document: Doc; typeName: string; canWrite: boolean }) {
    const form = useForm({ title: doc.title, version: doc.version, data: doc.data });
    const [step, setStep] = useState(0);
    const d = form.data.data;
    const set = <K extends keyof NetData>(key: K, value: NetData[K]) => form.setData('data', { ...d, [key]: value });
    const setRow = <K extends 'vlans' | 'flows'>(key: K, i: number, patch: Partial<NetData[K][number]>) =>
        set(key, d[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) as NetData[K]);
    const errors = Object.values(form.errors as Record<string, string>);

    // Enregistre le brouillon, puis exécute la suite (changer d'étape, télécharger) si la validation passe.
    const save = (then?: () => void) => {
        if (!canWrite) return then?.();
        form.put(route('documents.update', doc.id), { preserveScroll: true, onSuccess: () => then?.() });
    };
    const go = (n: number) => save(() => setStep(n));
    const input = (value: string | number, onChange: (v: string) => void, props: object = {}) => (
        <input className={fieldClass} value={value} disabled={!canWrite} onChange={(e) => onChange(e.target.value)} {...props} />
    );
    const select = (value: string, options: string[], onChange: (v: string) => void) => (
        <select className={fieldClass} value={value} disabled={!canWrite} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => <option key={o}>{o}</option>)}
        </select>
    );
    const cell = 'border-input bg-background h-8 w-full min-w-24 rounded-md border px-2 text-sm disabled:opacity-60';

    const panel = (
        <>
            <PanelSection label="Étapes" aside={<Pill>{`${step + 1} sur ${steps.length}`}</Pill>}>
                {steps.map((s, i) => (
                    <button key={s} className={`${rowClass} ${i === step ? 'bg-accent' : ''}`} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                        <i className="size-[7px] shrink-0 rounded-full" style={{ background: i < step ? 'var(--chart-2)' : i === step ? 'var(--chart-1)' : 'var(--input)' }} />
                        <span className="flex-1">{s}</span>
                        {i < step ? <Pill tone="success">Fait</Pill> : <Pill>{i + 1}</Pill>}
                    </button>
                ))}
            </PanelSection>
            <PanelSection>
                <p className="text-muted-foreground px-1 text-xs">
                    {canWrite ? 'Le brouillon est enregistré à chaque changement d\'étape.' : 'Accès en lecture seule : tu peux consulter et télécharger.'}
                </p>
            </PanelSection>
        </>
    );

    return (
        <AppLayout title={form.data.title || 'Sans titre'} panel={panel} panelTitle={typeName} actions={<Button variant="outline" size="sm" asChild><Link href={route('documents.index')}>Quitter</Link></Button>}>
            <Head title={form.data.title} />
            <div className="grid items-start gap-4 xl:grid-cols-2">
                <div className="bg-card min-w-0 rounded-[14px] border p-4">
                    <h2 className="text-sm font-semibold">{steps[step]}</h2>
                    {errors.length > 0 && (
                        <ul role="alert" className="bg-danger-soft text-danger mt-3 list-inside list-disc rounded-md px-3 py-2 text-sm">
                            {errors.map((e) => <li key={e}>{e}</li>)}
                        </ul>
                    )}

                    {step === 0 && (
                        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            <Field label="Nom du projet">{input(form.data.title, (v) => form.setData('title', v), { maxLength: 120 })}</Field>
                            <Field label="Client / entité">{input(d.client ?? '', (v) => set('client', v))}</Field>
                            <Field label="Version">{input(form.data.version, (v) => form.setData('version', v), { placeholder: '1.0' })}</Field>
                            <Field label="Classification">{select(d.classification, ['Interne', 'Confidentiel', 'Public'], (v) => set('classification', v))}</Field>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            <Field label="Nombre de sites">{input(d.sites, (v) => set('sites', v), { type: 'number', min: 1 })}</Field>
                            <Field label="Liaison inter-sites">{select(d.wan, WAN, (v) => set('wan', v))}</Field>
                            <Field label="Topologie LAN">{select(d.topology, TOPO, (v) => set('topology', v))}</Field>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="mt-3.5 grid gap-3">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse text-sm">
                                    <thead><tr>{['VLAN', 'Nom', 'Sous-réseau (CIDR)', 'Passerelle', ''].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {d.vlans.map((v, i) => (
                                            <tr key={i} className="[&:last-child>td]:border-b-0">
                                                <td className="border-b p-1.5"><input aria-label="Numéro de VLAN" type="number" min={1} max={4094} className={`${cell} !min-w-16`} disabled={!canWrite} value={v.id} onChange={(e) => setRow('vlans', i, { id: e.target.value })} /></td>
                                                <td className="border-b p-1.5"><input aria-label="Nom du VLAN" className={cell} disabled={!canWrite} value={v.name} onChange={(e) => setRow('vlans', i, { name: e.target.value })} /></td>
                                                <td className="border-b p-1.5"><input aria-label="Sous-réseau" className={cell} disabled={!canWrite} placeholder="10.10.20.0/24" value={v.subnet} onChange={(e) => setRow('vlans', i, { subnet: e.target.value })} /></td>
                                                <td className="border-b p-1.5"><input aria-label="Passerelle" className={cell} disabled={!canWrite} placeholder="10.10.20.1" value={v.gateway} onChange={(e) => setRow('vlans', i, { gateway: e.target.value })} /></td>
                                                <td className="border-b p-1.5">{canWrite && <Button variant="ghost" size="sm" aria-label="Retirer ce VLAN" onClick={() => set('vlans', d.vlans.filter((_, j) => j !== i))}><Trash2 /></Button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {canWrite && <div><Button variant="outline" size="sm" onClick={() => set('vlans', [...d.vlans, { id: '', name: '', subnet: '', gateway: '' }])}><Plus /> Ajouter un VLAN</Button></div>}
                        </div>
                    )}
                    {step === 3 && (
                        <div className="mt-3.5 grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Pare-feu périmétrique">{input(d.firewall ?? '', (v) => set('firewall', v), { placeholder: 'Cluster HA actif/passif' })}</Field>
                                <Field label="Accès distant">{select(d.remote_access, REMOTE, (v) => set('remote_access', v))}</Field>
                                <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="size-4" disabled={!canWrite} checked={d.dmz} onChange={(e) => set('dmz', e.target.checked)} />DMZ pour les services exposés</label>
                                <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="size-4" disabled={!canWrite} checked={d.nac} onChange={(e) => set('nac', e.target.checked)} />Contrôle d'accès 802.1X</label>
                            </div>
                            <h3 className="mt-2 text-[13px] font-semibold">Matrice de flux</h3>
                            {d.flows.length > 0 && (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full border-collapse text-sm">
                                        <thead><tr>{['Source', 'Destination', 'Service', 'Action', ''].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                        <tbody>
                                            {d.flows.map((f, i) => (
                                                <tr key={i} className="[&:last-child>td]:border-b-0">
                                                    <td className="border-b p-1.5"><input aria-label="Source" className={cell} disabled={!canWrite} placeholder="Utilisateurs" value={f.source} onChange={(e) => setRow('flows', i, { source: e.target.value })} /></td>
                                                    <td className="border-b p-1.5"><input aria-label="Destination" className={cell} disabled={!canWrite} placeholder="Serveurs" value={f.destination} onChange={(e) => setRow('flows', i, { destination: e.target.value })} /></td>
                                                    <td className="border-b p-1.5"><input aria-label="Service" className={cell} disabled={!canWrite} placeholder="HTTPS 443" value={f.service} onChange={(e) => setRow('flows', i, { service: e.target.value })} /></td>
                                                    <td className="border-b p-1.5"><select aria-label="Action" className={cell} disabled={!canWrite} value={f.action} onChange={(e) => setRow('flows', i, { action: e.target.value })}><option>Autoriser</option><option>Bloquer</option></select></td>
                                                    <td className="border-b p-1.5">{canWrite && <Button variant="ghost" size="sm" aria-label="Retirer ce flux" onClick={() => set('flows', d.flows.filter((_, j) => j !== i))}><Trash2 /></Button>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {canWrite && <div><Button variant="outline" size="sm" onClick={() => set('flows', [...d.flows, { source: '', destination: '', service: '', action: 'Autoriser' }])}><Plus /> Ajouter un flux</Button></div>}
                        </div>
                    )}
                    {step === 4 && (
                        <div className="mt-2 grid gap-3">
                            <p className="text-muted-foreground text-sm">Vérifie l'aperçu, puis génère le PDF. Le document passe alors à l'état « Généré ».</p>
                            <div><Button disabled={form.processing} onClick={() => save(() => (window.location.href = route('documents.pdf', doc.id)))}><Download /> Générer le PDF</Button></div>
                        </div>
                    )}

                    <div className="mt-5 flex justify-between">
                        <Button variant="outline" size="sm" className={step === 0 ? 'invisible' : ''} onClick={() => go(step - 1)}>Précédent</Button>
                        {step < 4 && <Button size="sm" disabled={form.processing} onClick={() => go(step + 1)}>Suivant</Button>}
                    </div>
                </div>

                <section aria-label="Aperçu du document" className="bg-card text-muted-foreground min-w-0 rounded-[14px] border p-5 text-[12.5px]">
                    <div className="border-b pb-3">
                        <p>{[d.client || '—', d.classification, `v${form.data.version}`].join(' · ')}</p>
                        <p className="text-foreground my-0.5 text-[17px] font-semibold break-words">{form.data.title || 'Sans titre'}</p>
                        <p>Document d'architecture réseau</p>
                    </div>
                    {(
                        [
                            ['1. Contexte et périmètre', `${d.sites || '?'} site(s).`],
                            ['2. Topologie', `LAN en ${d.topology.toLowerCase()}.${Number(d.sites) > 1 ? ` Sites reliés par ${d.wan}.` : ''}`],
                            ['3. Plan d\'adressage', d.vlans.length ? d.vlans.map((v) => `VLAN ${v.id || '?'} ${v.name} · ${v.subnet}`) : 'Aucun VLAN défini.'],
                            ['4. Sécurité', `Pare-feu : ${d.firewall || '—'}. Accès distant : ${d.remote_access}.${d.dmz ? ' DMZ dédiée.' : ''}${d.nac ? ' 802.1X sur les ports d\'accès.' : ''}`],
                            ['5. Matrice de flux', d.flows.length ? d.flows.map((f) => `${f.action} : ${f.source} → ${f.destination} (${f.service})`) : 'Aucun flux défini.'],
                        ] as [string, string | string[]][]
                    ).map(([h, body]) => (
                        <div key={h}>
                            <h3 className="text-foreground mt-3.5 mb-0.5 font-semibold">{h}</h3>
                            {(Array.isArray(body) ? body : [body]).map((line, i) => <p key={i} className="break-words">{line}</p>)}
                        </div>
                    ))}
                </section>
            </div>
        </AppLayout>
    );
}
