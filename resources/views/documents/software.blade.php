@php
    $kind = 'Architecture logicielle';
    $toc = ['Contexte et objectifs', 'Architecture retenue', 'Composants', 'Flux et interfaces', 'Données', 'Déploiement et sécurité', 'Décisions et risques'];
    $layers = collect($d['components'])->groupBy('layer');
@endphp
@extends('documents._layout')

@section('content')
    @include('documents._h', ['i' => 0])
    @if ($d['goal']) <div class="callout">{{ $d['goal'] }}</div> @endif
    @if ($d['scope']) <h3>Périmètre</h3><p class="text">{{ $d['scope'] }}</p> @endif
    <h3>Acteurs</h3>
    @include('documents._rows', ['rows' => $d['actors'], 'cols' => ['name' => 'Acteur', 'need' => 'Attente'], 'empty' => 'Aucun acteur décrit.'])

    @include('documents._h', ['i' => 1])
    @include('documents._kv', ['pairs' => [
        "Style d'architecture" => $d['style'], 'Disponibilité visée' => $d['availability'],
        'Volumétrie attendue' => $d['users'], 'Performance attendue' => $d['performance'],
    ]])
    @if ($d['constraints']) <h3>Contraintes</h3><p class="text">{{ $d['constraints'] }}</p> @endif

    @include('documents._h', ['i' => 2])
    @if ($layers->isNotEmpty())
        <table class="layers" style="page-break-inside: avoid">
            @foreach (['Interface', 'Service', 'Données', 'Externe'] as $layer)
                @if ($layers->has($layer))
                    <tr>
                        <td class="l">{{ $layer }}</td>
                        <td>@foreach ($layers[$layer] as $c)<span class="node small {{ $layer === 'Externe' ? '' : 'green' }}">{{ $c['name'] }}@if ($c['tech'] ?? '')<small>{{ $c['tech'] }}</small>@endif</span>@endforeach</td>
                    </tr>
                @endif
            @endforeach
        </table>
    @endif
    @include('documents._rows', ['rows' => $d['components'], 'cols' => ['name' => 'Composant', 'layer' => 'Couche', 'tech' => 'Technologie', 'role' => 'Responsabilité'], 'empty' => 'Aucun composant défini.'])

    @include('documents._h', ['i' => 3])
    @include('documents._rows', ['rows' => $d['interfaces'], 'cols' => ['source' => 'Source', 'destination' => 'Destination', 'protocol' => 'Protocole', 'purpose' => 'Objet'], 'empty' => 'Aucun flux défini.'])

    @include('documents._h', ['i' => 4])
    @include('documents._rows', ['rows' => $d['entities'], 'cols' => ['name' => 'Donnée', 'description' => 'Contenu', 'sensitivity' => 'Sensibilité'], 'empty' => 'Aucune donnée décrite.'])
    @include('documents._kv', ['pairs' => ['Durée de conservation' => $d['retention']]])

    @include('documents._h', ['i' => 5])
    <p>
        <span class="chip {{ $d['encrypt_transit'] ? 'on' : 'warn' }}">Chiffrement en transit : {{ $d['encrypt_transit'] ? 'oui' : 'non' }}</span>
        <span class="chip {{ $d['encrypt_rest'] ? 'on' : '' }}">Chiffrement au repos : {{ $d['encrypt_rest'] ? 'oui' : 'non' }}</span>
    </p>
    @include('documents._kv', ['pairs' => [
        'Hébergement' => $d['hosting'], 'Environnements' => implode(', ', $d['environments']), 'Authentification' => $d['auth'],
        'Livraison' => $d['cicd'], 'Sauvegardes' => $d['backup'], 'Reprise après incident' => $d['recovery'], 'Supervision' => $d['monitoring'],
    ]])

    @include('documents._h', ['i' => 6])
    <h3>Décisions</h3>
    @include('documents._rows', ['rows' => $d['decisions'], 'cols' => ['decision' => 'Décision', 'reason' => 'Justification'], 'empty' => 'Aucune décision consignée.'])
    <h3>Risques</h3>
    @include('documents._rows', ['rows' => $d['risks'], 'cols' => ['risk' => 'Risque', 'impact' => 'Impact', 'mitigation' => 'Parade'], 'empty' => 'Aucun risque consigné.'])
@endsection
