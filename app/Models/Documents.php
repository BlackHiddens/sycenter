<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Documents extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'format',
    ];
    // Un document à 1 et 1 seul quizz
    public function quizzs()
    {
    return $this->hasOne(Quizzs::class);
    }

}
