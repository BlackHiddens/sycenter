<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** App Veille : articles récupérés des flux (communs à tous), articles mis de côté (par personne). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_items', function (Blueprint $t) {
            $t->id();
            $t->string('source', 40)->index();
            $t->string('theme', 20)->index();
            $t->string('guid', 40)->unique(); // sha1 de l'identifiant de l'article dans le flux
            $t->string('title', 300);
            $t->text('summary')->nullable();
            $t->string('url', 2048);
            $t->string('image', 2048)->nullable();
            $t->timestamp('published_at')->index();
            $t->timestamps();
        });

        Schema::create('feed_saves', function (Blueprint $t) {
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('feed_item_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->primary(['user_id', 'feed_item_id']);
        });

        Schema::table('users', fn (Blueprint $t) => $t->timestamp('veille_seen_at')->nullable());
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('veille_seen_at'));
        Schema::dropIfExists('feed_saves');
        Schema::dropIfExists('feed_items');
    }
};
