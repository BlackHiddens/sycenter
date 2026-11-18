<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** App Veille : chacun ses flux (sources), leurs articles, et la date de la dernière visite. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_sources', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('theme', 20);
            $t->string('name', 80);
            $t->string('url', 2048);
            $t->string('lang', 5)->nullable();      // langue annoncée par le flux (fr, en…)
            $t->timestamp('fetched_at')->nullable(); // dernière lecture, réussie ou non
            $t->string('error', 120)->nullable();    // motif du dernier échec, vide si la lecture a réussi
            $t->timestamps();
        });

        Schema::create('feed_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('feed_source_id')->constrained()->cascadeOnDelete();
            $t->string('guid', 40); // sha1 de l'identifiant de l'article dans le flux
            $t->string('title', 300);
            $t->text('summary')->nullable();
            $t->string('url', 2048);
            $t->string('image', 2048)->nullable();
            $t->timestamp('published_at')->index();
            $t->timestamp('saved_at')->nullable(); // « À lire plus tard »
            $t->timestamps();
            $t->unique(['feed_source_id', 'guid']);
        });

        Schema::table('users', fn (Blueprint $t) => $t->timestamp('veille_seen_at')->nullable());
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('veille_seen_at'));
        Schema::dropIfExists('feed_items');
        Schema::dropIfExists('feed_sources');
    }
};
