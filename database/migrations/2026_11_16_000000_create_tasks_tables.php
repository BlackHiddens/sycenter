<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->text('notes')->nullable();
            $t->string('status')->default('todo');     // todo | doing | done
            $t->string('priority')->default('normal'); // low | normal | high
            $t->string('tag')->nullable();
            $t->date('due_date')->nullable();
            $t->unsignedInteger('position')->default(0);
            $t->timestamp('completed_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'status', 'position']);
        });
        Schema::create('practices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->string('category');
            $t->text('body');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practices');
        Schema::dropIfExists('tasks');
    }
};
