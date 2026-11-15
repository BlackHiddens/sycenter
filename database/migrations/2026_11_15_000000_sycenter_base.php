<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('user'); // owner | user | viewer
            $t->json('apps')->nullable();        // clés d'apps autorisées
        });
        Schema::create('documents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('type');
            $t->string('title');
            $t->string('version')->default('0.1');
            $t->string('status')->default('draft'); // draft | generated
            $t->json('data');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['role', 'apps']));
    }
};
