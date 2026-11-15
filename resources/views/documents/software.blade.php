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
        <div>Document d'architecture logicielle</div>
    </div>

    <h2>1. Contexte et objectifs</h2>
    <table class="kv">
        <tr><td>Client / entité</td><td>{{ $d['client'] ?: '—' }}</td></tr>
        <tr><td>Rédacteur</td><td>{{ $doc->user->name }}</td></tr>
    </table>
    @if ($d['goal'] ?? '') <p class="text">{{ $d['goal'] }}</p> @endif

    <h2>2. Architecture retenue</h2>
    <table class="kv">
        <tr><td>Style d'architecture</td><td>{{ $d['style'] }}</td></tr>
        <tr><td>Volumétrie attendue</td><td>{{ $d['users'] ?: '—' }}</td></tr>
        <tr><td>Disponibilité visée</td><td>{{ $d['availability'] }}</td></tr>
    </table>
    @if ($d['constraints'] ?? '') <p class="text"><strong>Contraintes :</strong> {{ $d['constraints'] }}</p> @endif

    <h2>3. Composants</h2>
    @php $layers = collect($d['components'] ?? [])->groupBy('layer'); @endphp
    @if ($layers->isNotEmpty())
        <table class="layers">
            @foreach (['Interface', 'Service', 'Données', 'Externe'] as $layer)
                @if ($layers->has($layer))
                    <tr>
                        <td class="layer-name">{{ $layer }}</td>
                        <td>@foreach ($layers[$layer] as $c)<span class="box">{{ $c['name'] }}@if ($c['tech'] ?? '')<br><small>{{ $c['tech'] }}</small>@endif</span>@endforeach</td>
                    </tr>
                @endif
            @endforeach
        </table>
        <table>
            <tr><th>Composant</th><th>Couche</th><th>Technologie</th><th>Responsabilité</th></tr>
            @foreach ($d['components'] as $c)
                <tr><td>{{ $c['name'] }}</td><td>{{ $c['layer'] }}</td><td>{{ ($c['tech'] ?? '') ?: '—' }}</td><td>{{ ($c['role'] ?? '') ?: '—' }}</td></tr>
            @endforeach
        </table>
    @else
        <p class="empty">Aucun composant défini.</p>
    @endif

    <h2>4. Flux et interfaces</h2>
    @if (count($d['interfaces'] ?? []))
        <table>
            <tr><th>Source</th><th>Destination</th><th>Protocole</th><th>Objet</th></tr>
            @foreach ($d['interfaces'] as $i)
                <tr><td>{{ $i['source'] }}</td><td>{{ $i['destination'] }}</td><td>{{ $i['protocol'] }}</td><td>{{ ($i['purpose'] ?? '') ?: '—' }}</td></tr>
            @endforeach
        </table>
    @else
        <p class="empty">Aucun flux défini.</p>
    @endif

    <h2>5. Déploiement et sécurité</h2>
    <table class="kv">
        <tr><td>Hébergement</td><td>{{ $d['hosting'] }}</td></tr>
        <tr><td>Environnements</td><td>{{ implode(', ', $d['environments'] ?? []) ?: '—' }}</td></tr>
        <tr><td>Authentification</td><td>{{ $d['auth'] }}</td></tr>
        <tr><td>Chiffrement en transit</td><td>{{ ($d['encrypt_transit'] ?? false) ? 'Oui (TLS)' : 'Non' }}</td></tr>
        <tr><td>Chiffrement au repos</td><td>{{ ($d['encrypt_rest'] ?? false) ? 'Oui' : 'Non' }}</td></tr>
        <tr><td>Sauvegardes</td><td>{{ ($d['backup'] ?? '') ?: '—' }}</td></tr>
        <tr><td>Supervision</td><td>{{ ($d['monitoring'] ?? '') ?: '—' }}</td></tr>
    </table>

    <h2>6. Décisions d'architecture</h2>
    @if (count($d['decisions'] ?? []))
        <table>
            <tr><th style="width:40%">Décision</th><th>Justification</th></tr>
            @foreach ($d['decisions'] as $x)
                <tr><td>{{ $x['decision'] }}</td><td>{{ ($x['reason'] ?? '') ?: '—' }}</td></tr>
            @endforeach
        </table>
    @else
        <p class="empty">Aucune décision consignée.</p>
    @endif
</body>
</html>
