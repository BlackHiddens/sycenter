<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->string('color')->default('slate'); // une couleur = un thème, voir config/notes.php
            $t->boolean('pinned')->default(false);
            $t->longText('scene')->nullable();     // dessin Excalidraw (éléments, fond, images collées), en JSON
            $t->text('text')->nullable();          // tout le texte du dessin, pour la recherche et l'export
            $t->mediumText('preview')->nullable(); // vignette PNG en data URL, produite par le navigateur
            $t->json('links')->nullable();         // identifiants des notes liées depuis ce dessin
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
