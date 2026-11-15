<?php

use App\Http\Controllers\DocumentController;
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

    Route::middleware('app:access')->group(function () {
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
