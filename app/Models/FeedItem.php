<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Un article lu dans un flux. Il appartient à la personne qui suit ce flux. */
class FeedItem extends Model
{
    protected $fillable = ['feed_source_id', 'guid', 'title', 'summary', 'url', 'image', 'published_at', 'saved_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'saved_at' => 'datetime'];
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(FeedSource::class, 'feed_source_id');
    }
}
