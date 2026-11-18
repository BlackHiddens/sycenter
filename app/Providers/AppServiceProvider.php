<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Mots de passe : 12 caractères, lettres et chiffres. En production, refus de ceux qui figurent dans des
        // fuites connues (Have I Been Pwned : seuls les 5 premiers caractères de l'empreinte quittent le serveur).
        Password::defaults(fn () => app()->isProduction()
            ? Password::min(12)->letters()->numbers()->uncompromised()
            : Password::min(12)->letters()->numbers());
    }
}
