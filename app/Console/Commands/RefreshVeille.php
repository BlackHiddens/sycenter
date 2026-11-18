<?php

namespace App\Console\Commands;

use App\Models\FeedSource;
use App\Services\FeedReader;
use Illuminate\Console\Command;

/**
 * Lit tout de suite tous les flux de la veille et dit, flux par flux, ce qui a été lu.
 * Outil de contrôle (en production : via une tâche planifiée temporaire) ; l'app, elle, relit les flux à l'ouverture.
 */
class RefreshVeille extends Command
{
    protected $signature = 'sycenter:veille {--check : Teste seulement la liste de départ de config/veille.php, sans rien enregistrer}';

    protected $description = 'Lit tous les flux de la veille et affiche le résultat par flux';

    public function handle(FeedReader $reader): int
    {
        if ($this->option('check')) {
            foreach (config('veille.sources') as $s) {
                $found = $reader->discover($s['url']);
                $this->line(str_pad($s['name'], 36).(is_string($found) ? "ÉCHEC : {$found}" : count($found['items']).' articles lus'));
            }

            return self::SUCCESS;
        }

        $lock = cache()->lock('veille.refresh.all', 600);
        if (! $lock->get()) {
            $this->line('Une lecture est déjà en cours.');

            return self::SUCCESS;
        }
        try {
            $sources = FeedSource::all();
            $reader->refresh($sources);
            foreach ($sources as $s) {
                $this->line(str_pad("#{$s->id} {$s->name}", 36).($s->error ? "ÉCHEC : {$s->error}" : $s->items()->count().' articles'));
            }
        } finally {
            $lock->release();
        }

        return self::SUCCESS;
    }
}
