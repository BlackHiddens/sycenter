<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $t) {
            $t->string('icon')->nullable();          // pictogramme choisi (liste dans resources/js/components/task-visual.tsx)
            $t->string('hue')->nullable();           // couleur du pictogramme : blue, violet, green, amber, rose, slate
            $t->string('waiting_for')->nullable();   // en attente de qui
            $t->date('waiting_since')->nullable();
            $t->date('follow_up_on')->nullable();    // date de la prochaine relance
            $t->unsignedTinyInteger('follow_ups')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', fn (Blueprint $t) => $t->dropColumn(['icon', 'hue', 'waiting_for', 'waiting_since', 'follow_up_on', 'follow_ups']));
    }
};
