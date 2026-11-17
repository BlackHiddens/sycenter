<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $t) {
            $t->json('steps')->nullable();            // [{ text, done }], dans l'ordre
            $t->timestamp('archived_at')->nullable(); // rangée à la main dans l'archive
        });
    }

    public function down(): void
    {
        Schema::table('tasks', fn (Blueprint $t) => $t->dropColumn(['steps', 'archived_at']));
    }
};
