<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/** Dépose (ou met à jour) dans le compte du propriétaire le dossier d'architecture logicielle de Sycenter lui-même. */
class ExampleArchitecture extends Command
{
    protected $signature = 'sycenter:example-architecture';

    protected $description = "Crée le document d'architecture logicielle de Sycenter dans le compte du propriétaire.";

    public function handle(): int
    {
        $owner = User::where('role', 'owner')->first();
        if (! $owner) {
            $this->error('Aucun compte propriétaire.');

            return self::FAILURE;
        }
        $example = json_decode(file_get_contents(database_path('examples/sycenter-architecture.json')), true, flags: JSON_THROW_ON_ERROR);
        $document = $owner->documents()->updateOrCreate(
            ['type' => 'software', 'title' => $example['title']],
            ['version' => $example['version'], 'status' => 'draft', 'data' => array_merge(config('documents.software.defaults'), $example['data'])],
        );
        $this->info("Document « {$document->title} » prêt (n° {$document->id}).");

        return self::SUCCESS;
    }
}
