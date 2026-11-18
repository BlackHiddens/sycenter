<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    /** Une tâche terminée quitte le tableau après ce nombre de jours, même sans archivage manuel. */
    public const ARCHIVE_AFTER_DAYS = 7;

    protected $fillable = ['user_id', 'title', 'notes', 'status', 'priority', 'tag', 'due_date', 'position', 'completed_at', 'recurrence', 'steps', 'archived_at', 'icon', 'hue', 'waiting_for', 'waiting_since', 'follow_up_on', 'follow_ups'];

    /** Jours d'attente avant de proposer une relance. */
    public const FOLLOW_UP_DAYS = 3;

    public const ICONS = ['server', 'database', 'bug', 'rocket', 'refresh', 'shield', 'key', 'mail', 'phone', 'users', 'calendar', 'file', 'graduation', 'clipboard', 'wrench', 'settings', 'search', 'chart', 'alert', 'lightbulb', 'package', 'monitor', 'message', 'coffee'];

    public const HUES = ['blue', 'violet', 'green', 'amber', 'rose', 'slate'];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'completed_at' => 'datetime', 'archived_at' => 'datetime', 'steps' => 'array', 'waiting_since' => 'date:Y-m-d', 'follow_up_on' => 'date:Y-m-d'];
    }

    /** Dans l'archive : rangée à la main, ou terminée depuis plus de ARCHIVE_AFTER_DAYS jours. */
    public function scopeArchived(Builder $query): Builder
    {
        return $query->where(fn ($q) => $q->whereNotNull('archived_at')
            ->orWhere(fn ($q) => $q->where('status', 'done')->where('completed_at', '<', now()->subDays(self::ARCHIVE_AFTER_DAYS))));
    }

    /** Sur le tableau : tout ce qui n'est pas dans l'archive. */
    public function scopeOnBoard(Builder $query): Builder
    {
        return $query->whereNull('archived_at')
            ->where(fn ($q) => $q->where('status', '!=', 'done')->orWhereNull('completed_at')
                ->orWhere('completed_at', '>=', now()->subDays(self::ARCHIVE_AFTER_DAYS)));
    }

    /**
     * État déduit des étapes cochées : toutes faites, la tâche est terminée ; une seule faite, elle est en cours ;
     * aucune faite alors qu'elle était terminée, elle revient à faire. Une tâche en attente le reste tant que
     * tout n'est pas coché : c'est la réponse attendue qui la débloque, pas une étape.
     */
    public static function statusFromSteps(string $current, array $steps): string
    {
        $done = collect($steps)->where('done', true)->count();

        return match (true) {
            $steps === [] => $current,
            $done === count($steps) => 'done',
            $current === 'waiting' => 'waiting',
            $done > 0 => 'doing',
            $current === 'done' => 'todo',
            default => $current,
        };
    }
}
