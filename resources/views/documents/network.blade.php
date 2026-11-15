<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{{ $doc->title }}</title>
@include('documents._style')
</head>
<body>
    <div class="cover">
        <small>{{ $d['client'] ?: '—' }} · {{ $d['classification'] }} · version {{ $doc->version }} · {{ $doc->updated_at->format('d/m/Y') }}</small>
        <h1>{{ $doc->title }}</h1>
        <div>Document d'architecture réseau</div>
    </div>

    <h2>1. Contexte et périmètre</h2>
    <table class="kv">
        <tr><td>Client / entité</td><td>{{ $d['client'] ?: '—' }}</td></tr>
        <tr><td>Nombre de sites</td><td>{{ $d['sites'] }}</td></tr>
        <tr><td>Rédacteur</td><td>{{ $doc->user->name }}</td></tr>
    </table>

    <h2>2. Topologie</h2>
    <table class="kv">
        <tr><td>Topologie LAN</td><td>{{ $d['topology'] }}</td></tr>
        <tr><td>Liaison inter-sites</td><td>{{ $d['sites'] > 1 ? $d['wan'] : 'Sans objet (site unique)' }}</td></tr>
    </table>

    <h2>3. Plan d'adressage</h2>
    @if (count($d['vlans'] ?? []))
        <table>
            <tr><th>VLAN</th><th>Nom</th><th>Sous-réseau</th><th>Passerelle</th></tr>
            @foreach ($d['vlans'] as $v)
                <tr><td>{{ $v['id'] }}</td><td>{{ $v['name'] }}</td><td>{{ $v['subnet'] }}</td><td>{{ $v['gateway'] }}</td></tr>
            @endforeach
        </table>
    @else
        <p class="empty">Aucun VLAN défini.</p>
    @endif

    <h2>4. Sécurité</h2>
    <table class="kv">
        <tr><td>Pare-feu périmétrique</td><td>{{ $d['firewall'] ?: '—' }}</td></tr>
        <tr><td>Accès distant</td><td>{{ $d['remote_access'] }}</td></tr>
        <tr><td>DMZ</td><td>{{ $d['dmz'] ? 'Oui, pour les services exposés' : 'Non' }}</td></tr>
        <tr><td>Contrôle d'accès 802.1X</td><td>{{ $d['nac'] ? 'Oui, sur les ports d\'accès' : 'Non' }}</td></tr>
    </table>

    <h2>5. Matrice de flux</h2>
    @if (count($d['flows'] ?? []))
        <table>
            <tr><th>Source</th><th>Destination</th><th>Service</th><th>Action</th></tr>
            @foreach ($d['flows'] as $f)
                <tr><td>{{ $f['source'] }}</td><td>{{ $f['destination'] }}</td><td>{{ $f['service'] }}</td><td>{{ $f['action'] }}</td></tr>
            @endforeach
        </table>
    @else
        <p class="empty">Aucun flux défini. Par défaut, tout flux non listé est bloqué.</p>
    @endif
</body>
</html>
