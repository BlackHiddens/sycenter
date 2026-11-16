import { Choice, type Data, type DocForm, Field, type FormApi, Text } from '@/components/doc-form';
import { fieldClass, PanelSection, Pill, rowClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import network from '@/pages/documents/forms/network';
import software from '@/pages/documents/forms/software';
import { Head, Link, useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';

type Doc = { id: number; title: string; version: string; status: string; type: string; data: Data };

// Un modèle de document = un fichier dans forms/ déclaré ici, plus sa vue PDF et ses règles côté serveur.
const forms: Record<string, DocForm> = { network, software };

export default function Edit({ document: doc, typeName, canWrite }: { document: Doc; typeName: string; canWrite: boolean }) {
    const def = forms[doc.type];
    const steps = ['Contexte', ...def.steps, 'Génération'];
    const form = useForm({ title: doc.title, version: doc.version, data: doc.data });
    const [step, setStep] = useState(0);
    const d = form.data.data;
    const f: FormApi = { d, canWrite, set: (key, value) => form.setData('data', { ...d, [key]: value }) };
    const errors = [...new Set(Object.values(form.errors as Record<string, string>))];
    const last = steps.length - 1;

    // Enregistre le brouillon, puis exécute la suite (changer d'étape, télécharger) si la validation passe.
    const save = (then?: () => void) => {
        if (!canWrite) return then?.();
        form.put(route('documents.update', doc.id), { preserveScroll: true, onSuccess: () => then?.() });
    };
    const go = (n: number) => save(() => setStep(n));

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
                    {canWrite ? "Le brouillon est enregistré à chaque changement d'étape." : 'Accès en lecture seule : tu peux consulter et télécharger.'}
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
                    <p className="text-muted-foreground mt-0.5 text-[13px]">{step === 0 ? def.contextIntro : step === last ? 'Dernière vérification avant de produire le document.' : def.intros[step - 1]}</p>
                    {errors.length > 0 && (
                        <ul role="alert" className="bg-danger-soft text-danger mt-3 list-inside list-disc rounded-md px-3 py-2 text-sm">
                            {errors.map((e) => <li key={e}>{e}</li>)}
                        </ul>
                    )}

                    {step === 0 && (
                        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            <Field label="Nom du projet" hint="Il devient le titre du document et le nom du fichier PDF."><input className={fieldClass} maxLength={120} disabled={!canWrite} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} /></Field>
                            <Text f={f} k="client" label="Client / entité" hint="L'organisation pour laquelle le document est rédigé." />
                            <Field label="Version" hint="1.0 pour une première diffusion, 0.x tant que c'est un brouillon."><input className={fieldClass} placeholder="1.0" disabled={!canWrite} value={form.data.version} onChange={(e) => form.setData('version', e.target.value)} /></Field>
                            <Choice f={f} k="classification" label="Classification" options={['Interne', 'Confidentiel', 'Public']} hint="Qui a le droit de lire ce document. Elle figure sur chaque page." />
                            {def.context?.(f)}
                        </div>
                    )}
                    {step > 0 && step < last && def.step(step - 1, f)}
                    {step === last && (
                        <div className="mt-2 grid gap-3">
                            <p className="text-muted-foreground text-sm">Vérifie l'aperçu, puis génère le PDF. Le document passe alors à l'état « Généré ».</p>
                            <div><Button disabled={form.processing} onClick={() => save(() => (window.location.href = route('documents.pdf', doc.id)))}><Download /> Générer le PDF</Button></div>
                        </div>
                    )}

                    <div className="mt-5 flex justify-between">
                        <Button variant="outline" size="sm" className={step === 0 ? 'invisible' : ''} onClick={() => go(step - 1)}>Précédent</Button>
                        {step < last && <Button size="sm" disabled={form.processing} onClick={() => go(step + 1)}>Suivant</Button>}
                    </div>
                </div>

                <section aria-label="Aperçu du document" className="bg-card text-muted-foreground min-w-0 rounded-[14px] border p-5 text-[12.5px]">
                    <div className="border-b pb-3">
                        <p>{[d.client || '—', d.classification, `v${form.data.version}`].join(' · ')}</p>
                        <p className="text-foreground my-0.5 text-[17px] font-semibold break-words">{form.data.title || 'Sans titre'}</p>
                        <p>{def.subtitle}</p>
                    </div>
                    {def.preview(d).map(([heading, body]) => (
                        <div key={heading} className="break-words whitespace-pre-line">
                            <h3 className="text-foreground mt-3.5 mb-0.5 font-semibold">{heading}</h3>
                            {body}
                        </div>
                    ))}
                </section>
            </div>
        </AppLayout>
    );
}
