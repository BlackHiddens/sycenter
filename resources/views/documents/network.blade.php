@php
    $kind = 'Architecture réseau';
    $toc = ['Contexte et périmètre', 'Topologie', 'Équipements', "Plan d'adressage", 'Sécurité', 'Exploitation et risques'];
    $multi = (int) $d['sites'] > 1;
    $brief = [
        'Sites' => $d['sites'],
        'Topologie' => $d['topology'],
        'VLAN' => count($d['vlans']),
        'Équipements' => collect($d['equipment'])->sum(fn ($e) => (int) ($e['qty'] ?? 1)),
        'Flux décrits' => count($d['flows']),
    ];
    $attention = collect($d['risks'])->map(fn ($r) => $r['risk'].(($r['mitigation'] ?? '') ? ' — '.$r['mitigation'] : ''))
        ->when($d['redundancy'] === 'Aucune', fn ($c) => $c->push('Aucune redondance : une panne de lien ou d\'équipement coupe le réseau'))
        ->when($d['remote_access'] === 'Aucun' && $multi, fn ($c) => $c->push('Plusieurs sites sans accès distant défini'))->values()->all();
@endphp
@extends('documents._layout')

@section('content')
    @include('documents._h', ['i' => 0])
    @if ($d['goal']) <div class="callout">{{ $d['goal'] }}</div> @endif
    @include('documents._kv', ['pairs' => ['Client / entité' => $d['client'], 'Nombre de sites' => $d['sites'], 'Rédacteur' => $doc->user->name]])

    @include('documents._h', ['i' => 1])
    <div class="diagram">
        <div class="node dark">Internet<small>{{ $d['internet'] ?: 'Accès à préciser' }}</small></div>
        <div class="wire"></div>
        <div class="node">Pare-feu périmétrique<small>{{ $d['firewall'] ?: 'À préciser' }}{{ $d['dmz'] ? ' · DMZ' : '' }}</small></div>
        <div class="wire"></div>
        <div class="node soft">Cœur de réseau<small>{{ $d['topology'] }}</small></div>
        @if (count($d['vlans']))
            <div class="wire"></div>
            <div>
                @foreach ($d['vlans'] as $v)
                    <span class="node small">VLAN {{ $v['id'] }}<small>{{ $v['name'] }}</small></span>
                @endforeach
            </div>
        @endif
    </div>
    @include('documents._kv', ['pairs' => [
        'Topologie LAN' => $d['topology'],
        'Liaison inter-sites' => $multi ? $d['wan'] : 'Sans objet (site unique)',
        'Accès Internet' => $d['internet'],
        'Redondance' => $d['redundancy'],
    ]])

    @include('documents._h', ['i' => 2])
    @include('documents._rows', ['rows' => $d['equipment'], 'cols' => ['role' => 'Rôle', 'model' => 'Modèle', 'qty' => 'Qté', 'location' => 'Emplacement'], 'empty' => 'Aucun équipement listé.'])

    @include('documents._h', ['i' => 3])
    @include('documents._rows', ['rows' => $d['vlans'], 'cols' => ['id' => 'VLAN', 'name' => 'Nom', 'subnet' => 'Sous-réseau', 'gateway' => 'Passerelle'], 'empty' => 'Aucun VLAN défini.'])
    @include('documents._kv', ['pairs' => ['DHCP' => $d['dhcp'], 'DNS' => $d['dns']]])

    @include('documents._h', ['i' => 4])
    <p>
        <span class="chip {{ $d['dmz'] ? 'on' : '' }}">DMZ : {{ $d['dmz'] ? 'oui' : 'non' }}</span>
        <span class="chip {{ $d['nac'] ? 'on' : '' }}">802.1X filaire : {{ $d['nac'] ? 'oui' : 'non' }}</span>
        <span class="chip {{ $d['guest'] ? 'on' : '' }}">Réseau invité : {{ $d['guest'] ? 'oui' : 'non' }}</span>
    </p>
    @include('documents._kv', ['pairs' => ['Pare-feu périmétrique' => $d['firewall'], 'Accès distant' => $d['remote_access'], 'Wi-Fi' => $d['wifi']]])
    <h3>Matrice de flux</h3>
    @include('documents._rows', ['rows' => $d['flows'], 'cols' => ['source' => 'Source', 'destination' => 'Destination', 'service' => 'Service', 'action' => 'Action'], 'empty' => 'Aucun flux décrit. Tout flux non listé est bloqué.'])

    @include('documents._h', ['i' => 5])
    @include('documents._kv', ['pairs' => ['Supervision' => $d['monitoring'], 'Sauvegarde des configurations' => $d['backup'], 'Convention de nommage' => $d['naming']]])
    <h3>Risques</h3>
    @include('documents._rows', ['rows' => $d['risks'], 'cols' => ['risk' => 'Risque', 'mitigation' => 'Parade'], 'empty' => 'Aucun risque consigné.'])
@endsection
