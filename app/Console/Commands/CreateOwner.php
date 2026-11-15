<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

use function Laravel\Prompts\password;

class CreateOwner extends Command
{
    protected $signature = 'sycenter:owner {email} {name} {--generate : Génère un mot de passe aléatoire et l\'affiche une seule fois}';

    protected $description = 'Crée le compte propriétaire, ou lui redonne ses droits et un nouveau mot de passe.';

    public function handle(): int
    {
        $other = User::where('role', 'owner')->where('email', '!=', $this->argument('email'))->first();
        if ($other) {
            $this->error("Un propriétaire existe déjà : {$other->email}.");

            return self::FAILURE;
        }
        $pwd = $this->option('generate')
            ? Str::password(20, symbols: false)
            : password('Mot de passe (8 caractères minimum)', validate: fn ($v) => strlen($v) < 8 ? 'Trop court.' : null);
        User::updateOrCreate(
            ['email' => $this->argument('email')],
            ['name' => $this->argument('name'), 'password' => $pwd, 'role' => 'owner', 'email_verified_at' => now()],
        );
        $this->info('Compte propriétaire prêt.');
        if ($this->option('generate')) {
            $this->line("Mot de passe provisoire, à changer dès la première connexion : $pwd");
        }

        return self::SUCCESS;
    }
}
