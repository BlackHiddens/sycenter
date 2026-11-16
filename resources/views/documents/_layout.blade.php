{{-- Gabarit commun des PDF : page de garde, fiche et sommaire, puis le contenu du modèle.
     Rendu par Dompdf : mise en page par tableaux et blocs, pas de flexbox ni de grille. --}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{{ $doc->title }}</title>
<style>
    @page { margin: 24mm 18mm 22mm 18mm; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 9.5pt; color: #272727; line-height: 1.5; }
    .head { position: fixed; top: -15mm; left: 0; right: 0; font-size: 7.5pt; color: #5b6360; border-bottom: 1.5pt solid #00A478; padding-bottom: 2mm; }
    .foot { position: fixed; bottom: -14mm; left: 0; right: 0; font-size: 7.5pt; color: #5b6360; border-top: 0.5pt solid #cfd4d1; padding-top: 2mm; }
    .head td, .foot td { border: 0; padding: 0; font-size: 7.5pt; color: #5b6360; }
    .pn:after { content: counter(page); }
    .right { text-align: right; }

    .cover { position: absolute; top: -24mm; left: -18mm; width: 210mm; height: 297mm; background: #ffffff; }
    .cover .bar { position: absolute; top: 0; left: 0; width: 7mm; height: 297mm; background: #00A478; }
    .cover .logo { position: absolute; top: 26mm; left: 26mm; width: 52mm; }
    .cover .main { position: absolute; top: 104mm; left: 26mm; width: 160mm; }
    .cover .kind { font-size: 10pt; letter-spacing: 2pt; text-transform: uppercase; color: #007A59; font-weight: bold; }
    .cover h1 { font-size: 30pt; line-height: 1.15; margin: 5mm 0 6mm; }
    .cover .rule { width: 34mm; height: 1.6mm; background: #272727; }
    .cover .lead { margin-top: 8mm; font-size: 10.5pt; color: #454b48; }
    .cover .band { position: absolute; bottom: 0; left: 7mm; width: 203mm; height: 44mm; background: #272727; }
    .cover .band table { margin: 11mm 0 0 19mm; width: 165mm; }
    .cover .band td { border: 0; padding: 0 4mm 0 0; color: #ffffff; font-size: 10pt; vertical-align: top; font-weight: bold; }
    .cover .band small { display: block; color: #b9c0bc; font-size: 7pt; letter-spacing: 1pt; text-transform: uppercase; font-weight: normal; margin-bottom: 1mm; }
    .break { page-break-after: always; }

    h2 { font-size: 13pt; margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 1.5pt solid #00A478; page-break-after: avoid; }
    h2 .num { display: inline-block; background: #272727; color: #ffffff; width: 7mm; text-align: center; margin-right: 3mm; font-size: 11pt; }
    h2.first { margin-top: 0; }
    h3 { font-size: 10pt; margin: 6mm 0 2mm; color: #007A59; page-break-after: avoid; }
    p { margin: 0 0 2mm; }
    .text { white-space: pre-line; }
    .callout { background: #EAF6F1; border-left: 3pt solid #00A478; padding: 3mm 4mm; margin: 0 0 4mm; white-space: pre-line; }
    .empty { color: #5b6360; font-style: italic; }

    table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; }
    th { background: #272727; color: #ffffff; font-size: 7.5pt; letter-spacing: 0.6pt; text-transform: uppercase; text-align: left; padding: 2.2mm 2.5mm; }
    td { padding: 2.2mm 2.5mm; border-bottom: 0.5pt solid #dfe3e0; font-size: 9pt; vertical-align: top; }
    tr.alt td { background: #F4F6F5; }
    .kv td { border-bottom: 0.5pt solid #dfe3e0; }
    .kv td.k { width: 36%; color: #5b6360; }
    .kv td.v { font-weight: bold; }
    .chip { display: inline-block; border: 0.5pt solid #8b938f; border-radius: 3pt; padding: 0.4mm 2mm; font-size: 8pt; margin-right: 1.5mm; }
    .chip.on { background: #EAF6F1; border-color: #007A59; color: #007A59; }
    .chip.warn { background: #FDECEC; border-color: #B91C1C; color: #B91C1C; }

    .toc td { border-bottom: 0.5pt dotted #b9c0bc; padding: 2.4mm 0; font-size: 10.5pt; }
    .toc td.n { width: 9mm; color: #007A59; font-weight: bold; }

    .diagram { text-align: center; margin: 2mm 0 5mm; page-break-inside: avoid; }
    .node { display: inline-block; border: 1pt solid #272727; border-radius: 3pt; padding: 2mm 5mm; min-width: 52mm; background: #ffffff; font-weight: bold; font-size: 9pt; }
    .node small { display: block; font-weight: normal; color: #5b6360; font-size: 8pt; }
    .node.dark { background: #272727; color: #ffffff; }
    .node.dark small { color: #cfd4d1; }
    .node.green { border-color: #007A59; background: #EAF6F1; }
    .node.small { min-width: 30mm; padding: 1.5mm 3mm; margin: 0 1mm 2mm; }
    .wire { width: 0; height: 5mm; border-left: 1pt solid #272727; margin: 0 auto; }
    .layers td { border: 0; padding: 1.2mm 0; }
    .layers td.l { width: 24mm; font-size: 7.5pt; letter-spacing: 0.8pt; text-transform: uppercase; color: #5b6360; border-left: 3pt solid #00A478; padding-left: 3mm; }
</style>
</head>
<body>
    <div class="head"><table><tr><td>{{ $doc->title }}</td><td class="right">{{ $kind }}</td></tr></table></div>
    <div class="foot"><table><tr><td>{{ ($d['client'] ?? '') ?: 'Sykerio' }} · {{ $d['classification'] }} · version {{ $doc->version }}</td><td class="right">Page <span class="pn"></span></td></tr></table></div>

    <div class="cover">
        <div class="bar"></div>
        <img class="logo" src="{{ public_path('images/sykerio.png') }}" alt="Sykerio">
        <div class="main">
            <div class="kind">{{ $kind }}</div>
            <h1>{{ $doc->title }}</h1>
            <div class="rule"></div>
            @if ($d['goal'] ?? '') <div class="lead">{{ \Illuminate\Support\Str::limit($d['goal'], 260) }}</div> @endif
        </div>
        <div class="band">
            <table><tr>
                <td><small>Client</small>{{ ($d['client'] ?? '') ?: '—' }}</td>
                <td><small>Version</small>{{ $doc->version }}</td>
                <td><small>Date</small>{{ $doc->updated_at->format('d/m/Y') }}</td>
                <td><small>Diffusion</small>{{ $d['classification'] }}</td>
                <td><small>Rédacteur</small>{{ $doc->user->name }}</td>
            </tr></table>
        </div>
    </div>
    <div class="break"></div>

    <h2 class="first">Sommaire</h2>
    <table class="toc">
        @foreach ($toc as $i => $title)
            <tr><td class="n">{{ $i + 1 }}</td><td>{{ $title }}</td></tr>
        @endforeach
    </table>
    <h3>Fiche du document</h3>
    <table class="kv">
        <tr><td class="k">Titre</td><td class="v">{{ $doc->title }}</td></tr>
        <tr><td class="k">Nature</td><td class="v">{{ $kind }}</td></tr>
        <tr><td class="k">Version</td><td class="v">{{ $doc->version }} du {{ $doc->updated_at->format('d/m/Y') }}</td></tr>
        <tr><td class="k">Rédacteur</td><td class="v">{{ $doc->user->name }}</td></tr>
        <tr><td class="k">Diffusion</td><td class="v">{{ $d['classification'] }}</td></tr>
    </table>
    <div class="break"></div>

    @yield('content')
</body>
</html>
