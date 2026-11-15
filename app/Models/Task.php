<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = ['user_id', 'title', 'notes', 'status', 'priority', 'tag', 'due_date', 'position', 'completed_at'];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'completed_at' => 'datetime'];
    }
}
