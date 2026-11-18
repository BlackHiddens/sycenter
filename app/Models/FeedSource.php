<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Un flux RSS ou Atom suivi par une personne, rangé dans un thème de la veille. */
class FeedSource extends Model
{
    protected $fillable = ['user_id', 'theme', 'name', 'url', 'lang', 'fetched_at', 'error'];

    protected function casts(): array
    {
        return ['fetched_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(FeedItem::class);
    }
}
