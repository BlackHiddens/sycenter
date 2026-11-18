<?php

namespace App\Console\Commands;

use App\Services\FeedReader;
use Illuminate\Console\Command;

/** Récupère tout de suite les flux de la veille et dit, source par source, ce qui a été lu. */
class RefreshVeille extends Command
{
    protected $signature = 'sycenter:veille';

    protected $description = 'Récupère les flux de la veille et affiche le résultat par source';

    public function handle(FeedReader $reader): int
    {
        foreach ($reader->refresh() as $source => $result) {
            $this->line(str_pad($source, 14).(is_int($result) ? "{$result} articles" : "ÉCHEC : {$result}"));
        }

        return self::SUCCESS;
    }
}
