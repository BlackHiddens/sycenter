<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', fn (Blueprint $t) => $t->string('recurrence')->nullable()); // daily | weekly | monthly
        Schema::table('practices', function (Blueprint $t) {
            $t->date('review_at')->nullable();                   // prochaine révision ; null = jamais révisée
            $t->unsignedSmallInteger('interval_days')->default(1); // écart avant la prochaine révision
        });
    }

    public function down(): void
    {
        Schema::table('tasks', fn (Blueprint $t) => $t->dropColumn('recurrence'));
        Schema::table('practices', fn (Blueprint $t) => $t->dropColumn(['review_at', 'interval_days']));
    }
};
