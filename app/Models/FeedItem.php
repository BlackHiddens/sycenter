<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Un article de veille, commun à tous les utilisateurs de l'app. */
class FeedItem extends Model
{
    protected $fillable = ['source', 'theme', 'guid', 'title', 'summary', 'url', 'image', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function savers()
    {
        return $this->belongsToMany(User::class, 'feed_saves')->withTimestamps();
    }
}
