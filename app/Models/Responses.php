<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Responses extends Model
{
    use HasFactory;
    protected $fillable = [
        'response',
    ];

    public function questions()
    {
        return $this->hasOne(Questions::class);
    }
}
