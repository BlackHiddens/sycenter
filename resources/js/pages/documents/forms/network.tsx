import { Area, Check, Choice, type Data, type DocForm, Rows, Text } from '@/components/doc-form';

const grid = 'mt-3.5 grid gap-3 sm:grid-cols-2';

const network: DocForm = {
    subtitle: "Document d'architecture réseau",
    contextIntro: 'Qui, quoi, pour qui. Ces informations forment la page de garde.',
    context: (f) => <Area f={f} k="goal" label="Objectif et périmètre" placeholder="Refonte du réseau local du siège. Hors périmètre : la téléphonie." hint="Deux ou trois phrases : pourquoi ce réseau est conçu ou refait, ce qui est couvert, ce qui ne l'est pas." />,
    steps: ['Topologie', 'Équipements', 'Adressage', 'Sécurité', 'Exploitation'],
    intros: [
        "La forme générale du réseau : combien de sites, comment ils sont reliés, comment on sort sur Internet.",
        'Le matériel qui porte le réseau. Reste au niveau du rôle et du modèle, pas du numéro de série.',
        'Le découpage logique : un VLAN par usage, avec son sous-réseau.',
        'Ce qui protège le réseau et qui a le droit de parler à qui.',
        'Comment le réseau est surveillé, sauvegardé et maintenu une fois en service.',
    ],
    step: (i, f) =>
        [
            <div className={grid}>
                <Text f={f} k="sites" label="Nombre de sites" type="number" min={1} hint="Chaque lieu physique raccordé compte pour un site." />
                <Choice f={f} k="wan" label="Liaison inter-sites" options={['VPN IPsec', 'SD-WAN', 'MPLS', 'Fibre dédiée']} hint="Ignoré s'il n'y a qu'un site." />
                <Choice f={f} k="topology" label="Topologie LAN" options={['Cœur / distribution / accès', 'Collapsed core', 'Spine-leaf']} hint="Collapsed core convient à la plupart des petits sites." />
                <Choice f={f} k="redundancy" label="Redondance" options={['Aucune', 'Liens doublés', 'Équipements doublés', 'Liens et équipements doublés']} hint="Ce qui continue de fonctionner si un lien ou un équipement tombe." />
                <Text f={f} k="internet" label="Accès Internet" placeholder="Fibre 1 Gb/s, secours 4G" hint="Type de lien, débit, et le secours s'il existe." />
            </div>,
            <div className={grid}>
                <Rows f={f} k="equipment" add="Ajouter un équipement" blank={{ role: 'Commutateur accès', model: '', qty: 1, location: '' }} hint="Une ligne par type d'équipement. La quantité évite de répéter les lignes identiques." columns={[
                    { key: 'role', label: 'Rôle', options: ['Pare-feu', 'Routeur', 'Commutateur cœur', 'Commutateur accès', 'Borne Wi-Fi', 'Serveur', 'Autre'] },
                    { key: 'model', label: 'Modèle', placeholder: 'FortiGate 60F' },
                    { key: 'qty', label: 'Qté', type: 'number', narrow: true },
                    { key: 'location', label: 'Emplacement', placeholder: 'Baie RDC' },
                ]} />
            </div>,
            <div className={grid}>
                <Rows f={f} k="vlans" add="Ajouter un VLAN" blank={{ id: '', name: '', subnet: '', gateway: '' }} hint="Le sous-réseau s'écrit en notation CIDR (10.10.20.0/24). La passerelle est en général la première adresse." columns={[
                    { key: 'id', label: 'VLAN', type: 'number', narrow: true },
                    { key: 'name', label: 'Nom', placeholder: 'Serveurs' },
                    { key: 'subnet', label: 'Sous-réseau', placeholder: '10.10.20.0/24' },
                    { key: 'gateway', label: 'Passerelle', placeholder: '10.10.20.1' },
                ]} />
                <Text f={f} k="dhcp" label="DHCP" placeholder="Pare-feu, baux de 8 h" hint="Qui distribue les adresses, et sur quels VLAN." />
                <Text f={f} k="dns" label="DNS" placeholder="Contrôleurs de domaine, relais 9.9.9.9" hint="Les serveurs de noms internes et leurs relais." />
            </div>,
            <div className={grid}>
                <Text f={f} k="firewall" label="Pare-feu périmétrique" placeholder="Cluster HA actif/passif" hint="Le modèle de protection en bordure, pas la liste des règles." />
                <Choice f={f} k="remote_access" label="Accès distant" options={['VPN SSL + MFA', 'ZTNA', 'Aucun']} hint="Comment on entre depuis l'extérieur." />
                <Choice f={f} k="wifi" label="Wi-Fi" options={['Aucun', 'WPA3-Entreprise (802.1X)', 'WPA2-Entreprise (802.1X)', 'WPA2/WPA3-Personnel']} hint="Le mode d'authentification des postes internes." />
                <div className="grid content-start gap-2">
                    <Check f={f} k="dmz" label="DMZ pour les services exposés" />
                    <Check f={f} k="nac" label="Contrôle d'accès 802.1X sur le filaire" />
                    <Check f={f} k="guest" label="Réseau invité isolé" />
                </div>
                <Rows f={f} k="flows" title="Matrice de flux" add="Ajouter un flux" blank={{ source: '', destination: '', service: '', action: 'Autoriser' }} hint="Seulement les flux entre zones. Tout ce qui n'est pas listé est bloqué." columns={[
                    { key: 'source', label: 'Source', placeholder: 'Utilisateurs' },
                    { key: 'destination', label: 'Destination', placeholder: 'Serveurs' },
                    { key: 'service', label: 'Service', placeholder: 'HTTPS 443' },
                    { key: 'action', label: 'Action', options: ['Autoriser', 'Bloquer'] },
                ]} />
            </div>,
            <div className={grid}>
                <Text f={f} k="monitoring" label="Supervision" placeholder="SNMP et alertes par e-mail" hint="L'outil et ce qui déclenche une alerte." />
                <Text f={f} k="backup" label="Sauvegarde des configurations" placeholder="Chaque nuit, 30 jours" hint="Fréquence et durée de conservation." />
                <Text f={f} k="naming" label="Convention de nommage" placeholder="SITE-ROLE-NN, ex. LYO-SW-01" hint="La règle pour nommer les équipements." />
                <Rows f={f} k="risks" title="Risques" add="Ajouter un risque" blank={{ risk: '', mitigation: '' }} hint="Les deux ou trois points faibles connus et ce qui les limite." columns={[
                    { key: 'risk', label: 'Risque', placeholder: 'Lien Internet unique' },
                    { key: 'mitigation', label: 'Parade', placeholder: 'Secours 4G automatique' },
                ]} />
            </div>,
        ][i],
    preview: (d) => [
        ['1. Contexte et périmètre', d.goal || `${d.sites || '?'} site(s).`],
        ['2. Topologie', `${d.sites || '?'} site(s), LAN en ${String(d.topology).toLowerCase()}.${Number(d.sites) > 1 ? ` Liaison ${d.wan}.` : ''}${d.internet ? ` Internet : ${d.internet}.` : ''}`],
        ['3. Équipements', d.equipment?.length ? d.equipment.map((e: Data, i: number) => <p key={i}>{`${e.qty || 1} × ${e.role}${e.model ? ` · ${e.model}` : ''}`}</p>) : 'Aucun équipement listé.'],
        ["4. Plan d'adressage", d.vlans?.length ? d.vlans.map((v: Data, i: number) => <p key={i}>{`VLAN ${v.id || '?'} ${v.name} · ${v.subnet}`}</p>) : 'Aucun VLAN défini.'],
        ['5. Sécurité', `Pare-feu : ${d.firewall || '—'}. Accès distant : ${d.remote_access}.${d.dmz ? ' DMZ.' : ''}${d.nac ? ' 802.1X.' : ''}${d.guest ? ' Réseau invité.' : ''} ${d.flows?.length || 0} flux décrit(s).`],
        ['6. Exploitation', [d.monitoring && `Supervision : ${d.monitoring}.`, d.backup && `Sauvegarde : ${d.backup}.`, `${d.risks?.length || 0} risque(s) identifié(s).`].filter(Boolean).join(' ')],
    ],
};

export default network;
