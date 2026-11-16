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
    contextIntro: 'Qui, quoi, pour qui. Ces informations forment la page de garde.',
    context: (f) => (
        <>
            <Area f={f} k="goal" label="Objectif du système" placeholder="Permettre aux clients de suivre leurs commandes sans appeler le support." hint="Le problème résolu et pour qui, en deux ou trois phrases. Pas de technique ici." />
            <Area f={f} k="scope" label="Périmètre" placeholder="Inclus : suivi, notifications. Exclu : paiement, géré par l'ERP." hint="Ce que le système fait, et surtout ce qu'il ne fait pas." />
            <Rows f={f} k="actors" title="Acteurs" add="Ajouter un acteur" blank={{ name: '', need: '' }} hint="Les personnes ou systèmes qui utilisent l'application, et ce qu'ils en attendent." columns={[
                { key: 'name', label: 'Acteur', placeholder: 'Client' },
                { key: 'need', label: 'Attente', placeholder: 'Voir où en est sa commande' },
            ]} />
        </>
    ),
    steps: ['Architecture', 'Composants', 'Flux', 'Données', 'Déploiement', 'Décisions et risques'],
    intros: [
        'Le parti pris général et les exigences qui le justifient.',
        "Les briques du système. Une ligne par brique déployable ou par service externe, pas par classe ou par écran.",
        'Qui appelle qui, et par quel moyen. Seulement les échanges entre composants.',
        'Les grandes familles de données, leur sensibilité et leur durée de vie.',
        "Où tourne le système, comment il est livré et comment il est protégé.",
        'Les choix structurants avec leur raison, et les points faibles assumés.',
    ],
    step: (i, f) =>
        [
            <div className={grid}>
                <Choice f={f} k="style" label="Style d'architecture" options={['Monolithe modulaire', 'Microservices', 'Client-serveur', 'Orientée événements', 'Serverless']} hint="Un monolithe modulaire est le bon défaut pour une petite équipe." />
                <Choice f={f} k="availability" label="Disponibilité visée" options={['99 %', '99,5 %', '99,9 %', '99,99 %']} hint="99,5 % tolère environ 3 h 40 d'arrêt par mois ; 99,9 %, 43 minutes." />
                <Text f={f} k="users" label="Volumétrie attendue" placeholder="200 utilisateurs simultanés" hint="Un ordre de grandeur suffit : utilisateurs, requêtes ou volume de données." />
                <Text f={f} k="performance" label="Performance attendue" placeholder="Pages en moins de 2 s" hint="Le temps de réponse acceptable pour l'utilisateur." />
                <Area f={f} k="constraints" label="Contraintes" placeholder="Hébergement en France, budget de 50 € par mois, équipe d'une personne." hint="Ce qui est imposé et limite les choix : budget, délais, technologies, réglementation." />
            </div>,
            <div className={grid}>
                <Rows f={f} k="components" add="Ajouter un composant" blank={{ name: '', layer: 'Service', tech: '', role: '' }} hint="La couche sert à dessiner le schéma : Interface (ce que voit l'utilisateur), Service (la logique), Données (le stockage), Externe (ce qui n'est pas à toi)." columns={[
                    { key: 'name', label: 'Composant', placeholder: 'API' },
                    { key: 'layer', label: 'Couche', options: LAYERS },
                    { key: 'tech', label: 'Technologie', placeholder: 'Laravel 12' },
                    { key: 'role', label: 'Responsabilité', placeholder: 'Règles métier' },
                ]} />
            </div>,
            <div className={grid}>
                <Rows f={f} k="interfaces" add="Ajouter un flux" blank={{ source: '', destination: '', protocol: 'HTTPS / REST', purpose: '' }} hint="Reprends les noms de composants de l'étape précédente." columns={[
                    { key: 'source', label: 'Source', placeholder: 'Application web' },
                    { key: 'destination', label: 'Destination', placeholder: 'API' },
                    { key: 'protocol', label: 'Protocole', placeholder: 'HTTPS / REST' },
                    { key: 'purpose', label: 'Objet', placeholder: 'Lecture des commandes' },
                ]} />
            </div>,
            <div className={grid}>
                <Rows f={f} k="entities" add="Ajouter une donnée" blank={{ name: '', description: '', sensitivity: 'Interne' }} hint="Les familles de données, pas les tables. « Personnelle » déclenche les obligations du RGPD." columns={[
                    { key: 'name', label: 'Donnée', placeholder: 'Comptes clients' },
                    { key: 'description', label: 'Contenu', placeholder: 'Identité, adresse, historique' },
                    { key: 'sensitivity', label: 'Sensibilité', options: ['Publique', 'Interne', 'Personnelle', 'Sensible'] },
                ]} />
                <Text f={f} k="retention" label="Durée de conservation" placeholder="3 ans après la dernière commande" hint="Combien de temps les données sont gardées avant suppression." />
            </div>,
            <div className={grid}>
                <Choice f={f} k="hosting" label="Hébergement" options={['Cloud public', 'Cloud privé', 'Sur site', 'Mutualisé', 'Hybride']} />
                <Choice f={f} k="auth" label="Authentification" options={['Identifiant et mot de passe', 'Identifiant, mot de passe et MFA', 'SSO (OIDC / SAML)', 'Clés d’API', 'Aucune']} hint="Comment un utilisateur prouve qui il est." />
                <CheckList f={f} k="environments" label="Environnements" options={['Développement', 'Recette', 'Préproduction', 'Production']} />
                <div className="grid content-start gap-2 sm:col-span-2">
                    <Check f={f} k="encrypt_transit" label="Chiffrement en transit (TLS)" />
                    <Check f={f} k="encrypt_rest" label="Chiffrement au repos" />
                </div>
                <Text f={f} k="cicd" label="Livraison" placeholder="Tests automatiques puis déploiement manuel" hint="Comment une modification arrive en production." />
                <Text f={f} k="backup" label="Sauvegardes" placeholder="Quotidiennes, conservées 30 jours" hint="Fréquence et durée de conservation." />
                <Text f={f} k="recovery" label="Reprise après incident" placeholder="Retour en 4 h, perte maximale de 24 h" hint="En combien de temps on redémarre, et combien de données on accepte de perdre." />
                <Text f={f} k="monitoring" label="Supervision" placeholder="Journaux centralisés, alertes par e-mail" hint="Comment on apprend qu'il y a un problème." />
            </div>,
            <div className={grid}>
                <Rows f={f} k="decisions" title="Décisions" add="Ajouter une décision" blank={{ decision: '', reason: '' }} hint="Les choix qu'on te demandera de justifier dans six mois." columns={[
                    { key: 'decision', label: 'Décision', placeholder: 'PostgreSQL plutôt que MongoDB' },
                    { key: 'reason', label: 'Justification', placeholder: 'Données relationnelles, équipe déjà formée' },
                ]} />
                <Rows f={f} k="risks" title="Risques" add="Ajouter un risque" blank={{ risk: '', impact: 'Moyen', mitigation: '' }} hint="Les points faibles connus. Mieux vaut trois risques honnêtes qu'une liste exhaustive." columns={[
                    { key: 'risk', label: 'Risque', placeholder: 'Dépendance à un seul hébergeur' },
                    { key: 'impact', label: 'Impact', options: ['Faible', 'Moyen', 'Fort'] },
                    { key: 'mitigation', label: 'Parade', placeholder: 'Sauvegardes exportées ailleurs' },
                ]} />
            </div>,
        ][i],
    preview: (d) => [
        ['1. Contexte et objectifs', d.goal || 'Objectif à préciser.'],
        ['2. Architecture retenue', `${d.style}. Disponibilité visée : ${d.availability}.${d.users ? ` Volumétrie : ${d.users}.` : ''}`],
        ['3. Composants', <LayerDiagram components={d.components ?? []} />],
        ['4. Flux et interfaces', d.interfaces?.length ? d.interfaces.map((x: Data, i: number) => <p key={i}>{`${x.source} → ${x.destination} · ${x.protocol}`}</p>) : 'Aucun flux défini.'],
        ['5. Données', d.entities?.length ? d.entities.map((x: Data, i: number) => <p key={i}>{`${x.name} · ${x.sensitivity}`}</p>) : 'Aucune donnée décrite.'],
        ['6. Déploiement et sécurité', `${d.hosting}, ${(d.environments ?? []).join(', ').toLowerCase() || 'aucun environnement'}. ${d.auth}.${d.encrypt_transit ? ' TLS.' : ''}${d.encrypt_rest ? ' Chiffrement au repos.' : ''}`],
        ['7. Décisions et risques', `${d.decisions?.length || 0} décision(s), ${d.risks?.length || 0} risque(s).`],
    ],
};

export default software;
