{{-- Tableau de lignes : $rows, $cols = ['clé' => 'Libellé'], $empty = message si aucune ligne. --}}
@if (count($rows ?? []))
    <table>
        <tr>@foreach ($cols as $label)<th>{{ $label }}</th>@endforeach</tr>
        @foreach ($rows as $n => $row)
            <tr class="{{ $n % 2 ? 'alt' : '' }}">@foreach ($cols as $key => $label)<td>{{ ($row[$key] ?? '') !== '' ? $row[$key] : '—' }}</td>@endforeach</tr>
        @endforeach
    </table>
@else
    <p class="empty">{{ $empty }}</p>
@endif
