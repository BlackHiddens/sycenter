<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Une fiche du carnet : commande ou astuce qu'on oublie, retrouvée et copiée en un clic. */
class Practice extends Model
{
    protected $fillable = ['user_id', 'title', 'category', 'body'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    /** Les plus utilisées d'abord, puis les plus récemment servies, puis par titre. */
    public function scopeHandy($query)
    {
        return $query->orderByDesc('uses')->orderByDesc('last_used_at')->orderBy('title');
    }
}
