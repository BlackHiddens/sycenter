<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\PracticeController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    Route::get('/', fn () => Inertia::render('home'))->name('home');
    Route::redirect('dashboard', '/')->name('dashboard');

    Route::middleware('app:docs')->group(function () {
        Route::resource('documents', DocumentController::class)->only(['index', 'store', 'edit', 'update', 'destroy']);
        Route::get('documents/{document}/pdf', [DocumentController::class, 'pdf'])->name('documents.pdf');
    });

    Route::middleware('app:tasks')->group(function () {
        // Avant la ressource : "tasks/archive" ne doit pas être pris pour l'identifiant d'une tâche.
        Route::get('tasks/archive', [TaskController::class, 'archive'])->name('tasks.archive');
        Route::delete('tasks/archive', [TaskController::class, 'purge'])->name('tasks.purge');
        Route::post('tasks/archive-done', [TaskController::class, 'archiveDone'])->name('tasks.archive-done');
        Route::post('tasks/{task}/archive', [TaskController::class, 'archiveOne'])->name('tasks.archive-one');
        Route::post('tasks/{task}/restore', [TaskController::class, 'restore'])->name('tasks.restore');
        Route::put('tasks/{task}/steps', [TaskController::class, 'steps'])->name('tasks.steps');
        Route::post('tasks/{task}/follow-up', [TaskController::class, 'followUp'])->name('tasks.follow-up');
        Route::resource('tasks', TaskController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::patch('tasks/{task}/move', [TaskController::class, 'move'])->name('tasks.move');
        Route::post('practices/{practice}/used', [PracticeController::class, 'used'])->name('practices.used');
        Route::resource('practices', PracticeController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    Route::middleware('app:notes')->group(function () {
        Route::resource('notes', NoteController::class)->only(['index', 'store', 'edit', 'update', 'destroy']);
        Route::put('notes/{note}/scene', [NoteController::class, 'scene'])->name('notes.scene');
    });

    Route::middleware('app:access')->group(function () {
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
