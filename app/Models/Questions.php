<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Questions extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subject',
        'password'
    ];

    public function quizzs()
    {
        return $this->hasOne(Quizzs::class);
    }

}

