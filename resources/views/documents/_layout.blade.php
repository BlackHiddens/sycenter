{{-- Gabarit commun des PDF : page de garde, fiche et sommaire, puis le contenu du modèle.
     Rendu par Dompdf : mise en page par tableaux et blocs, pas de flexbox ni de grille. --}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{{ $doc->title }}</title>
<style>
    /* Palette neutre (demande de Kevin : pas aux couleurs de Sykerio) : encre, gris, filets fins. */
    @page { margin: 24mm 18mm 22mm 18mm; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 9.5pt; color: #27272A; line-height: 1.55; }
    .head { position: fixed; top: -15mm; left: 0; right: 0; border-bottom: 0.5pt solid #D4D4D8; padding-bottom: 2mm; }
    .foot { position: fixed; bottom: -14mm; left: 0; right: 0; border-top: 0.5pt solid #D4D4D8; padding-top: 2mm; }
    .head td, .foot td { border: 0; padding: 0; font-size: 7.5pt; color: #71717A; }
    .pn:after { content: counter(page); }
    .right { text-align: right; }

    .cover { position: absolute; top: -24mm; left: -18mm; width: 210mm; height: 297mm; background: #ffffff; }
    .cover .top { position: absolute; top: 24mm; left: 24mm; width: 162mm; font-size: 8pt; letter-spacing: 2pt; text-transform: uppercase; color: #71717A; }
    .cover .top td { border: 0; padding: 0; font-size: 8pt; color: #71717A; }
    .cover .main { position: absolute; top: 96mm; left: 24mm; width: 150mm; }
    .cover .accent { width: 18mm; height: 2.2mm; background: #18181B; margin-bottom: 9mm; }
    .cover .kind { font-size: 9pt; letter-spacing: 2.5pt; text-transform: uppercase; color: #52525B; }
    .cover h1 { font-size: 31pt; line-height: 1.12; margin: 4mm 0 0; color: #18181B; }
    .cover .lead { margin-top: 9mm; font-size: 10.5pt; color: #52525B; line-height: 1.6; }
    .cover .meta { position: absolute; bottom: 26mm; left: 24mm; width: 162mm; border-top: 1pt solid #18181B; }
    .cover .meta td { border: 0; padding: 3.5mm 4mm 0 0; vertical-align: top; font-size: 9.5pt; font-weight: bold; color: #18181B; }
    .cover .meta small { display: block; color: #71717A; font-size: 6.8pt; letter-spacing: 1.2pt; text-transform: uppercase; font-weight: normal; margin-bottom: 1.2mm; }
    .break { page-break-after: always; }

    h2 { font-size: 14pt; color: #18181B; margin: 11mm 0 4mm; padding-bottom: 2.5mm; border-bottom: 0.5pt solid #D4D4D8; page-break-after: avoid; }
    h2 .num { color: #A1A1AA; font-weight: normal; margin-right: 3mm; }
    h2.first { margin-top: 0; }
    h3 { font-size: 8pt; letter-spacing: 1.4pt; text-transform: uppercase; margin: 7mm 0 2.5mm; color: #52525B; page-break-after: avoid; }
    p { margin: 0 0 2mm; }
    .text { white-space: pre-line; }
    .callout { border-left: 2pt solid #18181B; padding: 1mm 0 1mm 5mm; margin: 0 0 5mm; font-size: 10.5pt; color: #3F3F46; white-space: pre-line; }
    .empty { color: #71717A; font-style: italic; }

    table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; }
    th { font-size: 7pt; letter-spacing: 1pt; text-transform: uppercase; color: #52525B; text-align: left; font-weight: bold; padding: 2.2mm 2.5mm; border-bottom: 1pt solid #18181B; }
    td { padding: 2.4mm 2.5mm; border-bottom: 0.5pt solid #E4E4E7; font-size: 9pt; vertical-align: top; }
    tr.alt td { background: #FAFAFA; }
    tr { page-break-inside: avoid; }
    .brief { margin: 1mm 0 2mm; }
    .brief td { border: 0; border-top: 1.5pt solid #18181B; padding: 3mm 3mm 0 0; vertical-align: top; }
    .brief .bv { display: block; font-size: 12.5pt; font-weight: bold; color: #18181B; line-height: 1.25; }
    .brief .bl { display: block; margin-top: 1.2mm; font-size: 7pt; letter-spacing: 1pt; text-transform: uppercase; color: #71717A; }
    .att { margin: 0 0 1.8mm; padding-left: 4mm; border-left: 2pt solid #991B1B; color: #3F3F46; }
    .kv td.k { width: 36%; color: #71717A; }
    .kv td.v { color: #18181B; }
    .chip { display: inline-block; border: 0.5pt solid #A1A1AA; border-radius: 8pt; padding: 0.5mm 2.5mm; font-size: 8pt; color: #52525B; margin-right: 1.5mm; }
    .chip.on { border-color: #18181B; background: #18181B; color: #ffffff; }
    .chip.warn { border-color: #991B1B; color: #991B1B; }

    .toc td { border-bottom: 0.5pt solid #E4E4E7; padding: 3mm 0; font-size: 11pt; color: #18181B; }
    .toc td.n { width: 12mm; color: #A1A1AA; }

    .diagram { text-align: center; margin: 3mm 0 6mm; page-break-inside: avoid; }
    .node { display: inline-block; border: 0.8pt solid #18181B; border-radius: 3pt; padding: 2mm 5mm; min-width: 52mm; background: #ffffff; font-weight: bold; font-size: 9pt; color: #18181B; }
    .node small { display: block; font-weight: normal; color: #71717A; font-size: 8pt; }
    .node.dark { background: #18181B; color: #ffffff; }
    .node.dark small { color: #D4D4D8; }
    .node.soft { background: #F4F4F5; border-color: #A1A1AA; }
    .node.small { min-width: 30mm; padding: 1.5mm 3mm; margin: 0 1mm 2mm; }
    .wire { width: 0; height: 5mm; border-left: 0.8pt solid #71717A; margin: 0 auto; }
    .layers td { border: 0; padding: 1.2mm 0; }
    .layers td.l { width: 24mm; font-size: 7pt; letter-spacing: 1pt; text-transform: uppercase; color: #71717A; border-left: 1.5pt solid #18181B; padding-left: 3mm; }
</style>
</head>
<body>
    <div class="head"><table><tr><td>{{ $doc->title }}</td><td class="right">{{ $kind }}</td></tr></table></div>
    <div class="foot"><table><tr><td>{{ ($d['client'] ?? '') ? $d['client'].' · ' : '' }}{{ $d['classification'] }} · version {{ $doc->version }}</td><td class="right">Page <span class="pn"></span></td></tr></table></div>

    <div class="cover">
        <table class="top"><tr><td>Dossier d'architecture</td><td class="right">{{ ($d['client'] ?? '') ?: '' }}</td></tr></table>
        <div class="main">
            <div class="accent"></div>
            <div class="kind">{{ $kind }}</div>
            <h1>{{ $doc->title }}</h1>
            @if ($d['goal'] ?? '') <div class="lead">{{ \Illuminate\Support\Str::limit($d['goal'], 260) }}</div> @endif
        </div>
        <table class="meta"><tr>
            <td><small>Client</small>{{ ($d['client'] ?? '') ?: '—' }}</td>
            <td><small>Version</small>{{ $doc->version }}</td>
            <td><small>Date</small>{{ $doc->updated_at->format('d/m/Y') }}</td>
            <td><small>Diffusion</small>{{ $d['classification'] }}</td>
            <td><small>Rédacteur</small>{{ $doc->user->name }}</td>
        </tr></table>
    </div>
    <div class="break"></div>

    <h2 class="first">Sommaire</h2>
    <table class="toc">
        @foreach ($toc as $i => $title)
            <tr><td class="n">{{ str_pad($i + 1, 2, '0', STR_PAD_LEFT) }}</td><td>{{ $title }}</td></tr>
        @endforeach
    </table>
    {{-- En bref : chiffres clés et points d'attention, fournis par chaque modèle ($brief, $attention). --}}
    <h2>En bref</h2>
    <table class="brief"><tr>
        @foreach ($brief as $label => $value)
            <td><span class="bv">{{ $value }}</span><span class="bl">{{ $label }}</span></td>
        @endforeach
    </tr></table>
    @if (count($attention))
        <h3>Points d'attention</h3>
        @foreach ($attention as $line)
            <p class="att">{{ $line }}</p>
        @endforeach
    @endif
    <div class="break"></div>

    @yield('content')
</body>
</html>
