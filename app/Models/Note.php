<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Note extends Model
{
    protected $fillable = ['user_id', 'title', 'color', 'pinned', 'scene', 'text', 'preview', 'links'];

    protected function casts(): array
    {
        return ['pinned' => 'boolean', 'links' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Notes liées depuis un dessin : tout lien d'élément qui pointe vers /notes/{id} sur ce site.
     * Calculé côté serveur à partir du dessin, pour ne pas faire confiance au navigateur.
     *
     * @return list<int>
     */
    public static function linksIn(array $elements, int $self): array
    {
        return collect($elements)
            ->filter(fn ($e) => is_array($e) && empty($e['isDeleted']) && is_string($e['link'] ?? null))
            ->map(fn ($e) => preg_match('#/notes/(\d+)(?:[/?\#]|$)#', $e['link'], $m) ? (int) $m[1] : null)
            ->filter(fn ($id) => $id && $id !== $self)
            ->unique()->values()->all();
    }
}
