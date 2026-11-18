<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Les fiches deviennent un carnet : plus de révision, on compte les usages pour remonter les plus utiles. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('practices', function (Blueprint $table) {
            $table->unsignedInteger('uses')->default(0);
            $table->timestamp('last_used_at')->nullable();
        });
        Schema::table('practices', function (Blueprint $table) {
            $table->dropColumn(['review_at', 'interval_days']);
        });
    }

    public function down(): void
    {
        Schema::table('practices', function (Blueprint $table) {
            $table->date('review_at')->nullable();
            $table->unsignedSmallInteger('interval_days')->default(1);
        });
        Schema::table('practices', function (Blueprint $table) {
            $table->dropColumn(['uses', 'last_used_at']);
        });
    }
};
