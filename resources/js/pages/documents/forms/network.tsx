import { Check, Choice, type Data, type DocForm, Rows, Text } from '@/components/doc-form';

const grid = 'mt-3.5 grid gap-3 sm:grid-cols-2';

const network: DocForm = {
    subtitle: "Document d'architecture réseau",
    steps: ['Topologie', 'Adressage', 'Sécurité'],
    step: (i, f) =>
        [
            <div className={grid}>
                <Text f={f} k="sites" label="Nombre de sites" type="number" min={1} />
                <Choice f={f} k="wan" label="Liaison inter-sites" options={['VPN IPsec', 'SD-WAN', 'MPLS', 'Fibre dédiée']} />
                <Choice f={f} k="topology" label="Topologie LAN" options={['Cœur / distribution / accès', 'Collapsed core', 'Spine-leaf']} />
            </div>,
            <div className="mt-3.5">
                <Rows f={f} k="vlans" add="Ajouter un VLAN" blank={{ id: '', name: '', subnet: '', gateway: '' }} columns={[
                    { key: 'id', label: 'VLAN', type: 'number', narrow: true },
                    { key: 'name', label: 'Nom' },
                    { key: 'subnet', label: 'Sous-réseau (CIDR)', placeholder: '10.10.20.0/24' },
                    { key: 'gateway', label: 'Passerelle', placeholder: '10.10.20.1' },
                ]} />
            </div>,
            <div className="mt-3.5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Text f={f} k="firewall" label="Pare-feu périmétrique" placeholder="Cluster HA actif/passif" />
                    <Choice f={f} k="remote_access" label="Accès distant" options={['VPN SSL + MFA', 'ZTNA', 'Aucun']} />
                    <Check f={f} k="dmz" label="DMZ pour les services exposés" />
                    <Check f={f} k="nac" label="Contrôle d'accès 802.1X" />
                </div>
                <h3 className="mt-2 text-[13px] font-semibold">Matrice de flux</h3>
                <Rows f={f} k="flows" add="Ajouter un flux" blank={{ source: '', destination: '', service: '', action: 'Autoriser' }} columns={[
                    { key: 'source', label: 'Source', placeholder: 'Utilisateurs' },
                    { key: 'destination', label: 'Destination', placeholder: 'Serveurs' },
                    { key: 'service', label: 'Service', placeholder: 'HTTPS 443' },
                    { key: 'action', label: 'Action', options: ['Autoriser', 'Bloquer'] },
                ]} />
            </div>,
        ][i],
    preview: (d) => [
        ['1. Contexte et périmètre', `${d.sites || '?'} site(s).`],
        ['2. Topologie', `LAN en ${String(d.topology).toLowerCase()}.${Number(d.sites) > 1 ? ` Sites reliés par ${d.wan}.` : ''}`],
        ["3. Plan d'adressage", d.vlans.length ? d.vlans.map((v: Data, i: number) => <p key={i}>{`VLAN ${v.id || '?'} ${v.name} · ${v.subnet}`}</p>) : 'Aucun VLAN défini.'],
        ['4. Sécurité', `Pare-feu : ${d.firewall || '—'}. Accès distant : ${d.remote_access}.${d.dmz ? ' DMZ dédiée.' : ''}${d.nac ? " 802.1X sur les ports d'accès." : ''}`],
        ['5. Matrice de flux', d.flows.length ? d.flows.map((x: Data, i: number) => <p key={i}>{`${x.action} : ${x.source} → ${x.destination} (${x.service})`}</p>) : 'Aucun flux défini.'],
    ],
};

export default network;
