{{-- Tableau libellé / valeur : $pairs = ['Libellé' => 'valeur']. Les valeurs vides affichent un tiret. --}}
<table class="kv">
    @foreach ($pairs as $label => $value)
        <tr><td class="k">{{ $label }}</td><td class="v">{{ ($value ?? '') !== '' ? $value : '—' }}</td></tr>
    @endforeach
</table>
