<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Practice extends Model
{
    protected $fillable = ['user_id', 'title', 'category', 'body', 'review_at', 'interval_days'];

    protected function casts(): array
    {
        return ['review_at' => 'date:Y-m-d'];
    }

    /** Fiches à réviser aujourd'hui : jamais vues, ou dont l'échéance de révision est atteinte. */
    public function scopeDue($query)
    {
        return $query->where(fn ($q) => $q->whereNull('review_at')->orWhere('review_at', '<=', today()));
    }
}
