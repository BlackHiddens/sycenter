import { Area, Check, CheckList, Choice, type Data, type DocForm, Rows, Text } from '@/components/doc-form';

const grid = 'mt-3.5 grid gap-3 sm:grid-cols-2';
export const LAYERS = ['Interface', 'Service', 'Données', 'Externe'];
const layerColor: Record<string, string> = { Interface: 'var(--chart-1)', Service: 'var(--chart-4)', Données: 'var(--chart-2)', Externe: 'var(--chart-3)' };

/** Schéma en couches, dessiné à partir de la liste des composants. */
function LayerDiagram({ components }: { components: Data[] }) {
    const used = LAYERS.filter((l) => components.some((c) => c.layer === l));
    if (!used.length) return <p>Aucun composant défini.</p>;
    return (
        <div className="mt-1.5 grid gap-1.5">
            {used.map((layer) => (
                <div key={layer} className="bg-muted/60 flex flex-wrap items-center gap-1.5 rounded-lg border-l-[3px] p-2" style={{ borderLeftColor: layerColor[layer] }}>
                    <span className="w-16 shrink-0 text-[10.5px] tracking-wider uppercase">{layer}</span>
                    {components.filter((c) => c.layer === layer).map((c, i) => (
                        <span key={i} className="bg-card text-foreground rounded-md border px-2 py-1 leading-tight font-medium">
                            {c.name || 'Sans nom'}
                            {c.tech && <span className="text-muted-foreground block text-[11px] font-normal">{c.tech}</span>}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

const software: DocForm = {
    subtitle: "Document d'architecture logicielle",
    steps: ['Architecture', 'Composants', 'Flux', 'Déploiement', 'Décisions'],
    context: (f) => <Area f={f} k="goal" label="Objectif du système" placeholder="À quoi sert l'application, pour qui, et quel problème elle résout." />,
    step: (i, f) =>
        [
            <div className={grid}>
                <Choice f={f} k="style" label="Style d'architecture" options={['Monolithe modulaire', 'Microservices', 'Client-serveur', 'Orientée événements', 'Serverless']} />
                <Choice f={f} k="availability" label="Disponibilité visée" options={['99 %', '99,5 %', '99,9 %', '99,99 %']} />
                <Text f={f} k="users" label="Volumétrie attendue" placeholder="200 utilisateurs simultanés" />
                <Area f={f} k="constraints" label="Contraintes" placeholder="Budget, délais, technologies imposées, réglementation…" />
            </div>,
            <div className="mt-3.5">
                <Rows f={f} k="components" add="Ajouter un composant" blank={{ name: '', layer: 'Service', tech: '', role: '' }} columns={[
                    { key: 'name', label: 'Composant', placeholder: 'API' },
                    { key: 'layer', label: 'Couche', options: LAYERS },
                    { key: 'tech', label: 'Technologie', placeholder: 'Laravel 12' },
                    { key: 'role', label: 'Responsabilité', placeholder: 'Règles métier' },
                ]} />
            </div>,
            <div className="mt-3.5">
                <Rows f={f} k="interfaces" add="Ajouter un flux" blank={{ source: '', destination: '', protocol: 'HTTPS / REST', purpose: '' }} columns={[
                    { key: 'source', label: 'Source', placeholder: 'Application web' },
                    { key: 'destination', label: 'Destination', placeholder: 'API' },
                    { key: 'protocol', label: 'Protocole', placeholder: 'HTTPS / REST' },
                    { key: 'purpose', label: 'Objet', placeholder: 'Lecture des commandes' },
                ]} />
            </div>,
            <div className={grid}>
                <Choice f={f} k="hosting" label="Hébergement" options={['Cloud public', 'Cloud privé', 'Sur site', 'Mutualisé', 'Hybride']} />
                <Choice f={f} k="auth" label="Authentification" options={['Identifiant et mot de passe', 'Identifiant, mot de passe et MFA', 'SSO (OIDC / SAML)', 'Clés d’API', 'Aucune']} />
                <CheckList f={f} k="environments" label="Environnements" options={['Développement', 'Recette', 'Préproduction', 'Production']} />
                <Check f={f} k="encrypt_transit" label="Chiffrement en transit (TLS)" />
                <Check f={f} k="encrypt_rest" label="Chiffrement au repos" />
                <Text f={f} k="backup" label="Sauvegardes" placeholder="Quotidiennes, conservées 30 jours" />
                <Text f={f} k="monitoring" label="Supervision" placeholder="Journaux centralisés, alertes" />
            </div>,
            <div className="mt-3.5">
                <Rows f={f} k="decisions" add="Ajouter une décision" blank={{ decision: '', reason: '' }} columns={[
                    { key: 'decision', label: 'Décision', placeholder: 'PostgreSQL plutôt que MongoDB' },
                    { key: 'reason', label: 'Justification', placeholder: 'Données relationnelles, équipe déjà formée' },
                ]} />
            </div>,
        ][i],
    preview: (d) => [
        ['1. Contexte et objectifs', d.goal || 'Objectif à préciser.'],
        ['2. Architecture retenue', `${d.style}. Disponibilité visée : ${d.availability}.${d.users ? ` Volumétrie : ${d.users}.` : ''}`],
        ['3. Composants', <LayerDiagram components={d.components ?? []} />],
        ['4. Flux et interfaces', d.interfaces?.length ? d.interfaces.map((x: Data, i: number) => <p key={i}>{`${x.source} → ${x.destination} · ${x.protocol}`}</p>) : 'Aucun flux défini.'],
        ['5. Déploiement et sécurité', `${d.hosting}, ${(d.environments ?? []).join(', ').toLowerCase() || 'aucun environnement'}. ${d.auth}.${d.encrypt_transit ? ' TLS.' : ''}${d.encrypt_rest ? ' Chiffrement au repos.' : ''}`],
        ['6. Décisions', d.decisions?.length ? d.decisions.map((x: Data, i: number) => <p key={i}>{x.decision}</p>) : 'Aucune décision consignée.'],
    ],
};

export default software;
