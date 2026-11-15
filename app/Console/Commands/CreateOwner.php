<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

use function Laravel\Prompts\password;

class CreateOwner extends Command
{
    protected $signature = 'sycenter:owner {email} {name}';

    protected $description = 'Crée le compte propriétaire, ou lui redonne ses droits et un nouveau mot de passe.';

    public function handle(): int
    {
        $other = User::where('role', 'owner')->where('email', '!=', $this->argument('email'))->first();
        if ($other) {
            $this->error("Un propriétaire existe déjà : {$other->email}.");

            return self::FAILURE;
        }
        $pwd = password('Mot de passe (8 caractères minimum)', validate: fn ($v) => strlen($v) < 8 ? 'Trop court.' : null);
        User::updateOrCreate(
            ['email' => $this->argument('email')],
            ['name' => $this->argument('name'), 'password' => $pwd, 'role' => 'owner', 'email_verified_at' => now()],
        );
        $this->info('Compte propriétaire prêt.');

        return self::SUCCESS;
    }
}
