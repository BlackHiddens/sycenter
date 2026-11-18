<?php

namespace App\Http\Controllers;

use App\Models\FeedItem;
use App\Services\FeedReader;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** App Veille : actualités par thème, récupérées des flux RSS publics de config/veille.php. */
class VeilleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $seenAt = $user->veille_seen_at;
        // « Nouveau » = arrivé depuis la visite précédente. Un rechargement partiel (après récupération) ne compte pas comme une visite.
        if (! $request->header('X-Inertia-Partial-Component')) {
            $user->forceFill(['veille_seen_at' => now()])->saveQuietly();
        }

        $sources = collect(config('veille.sources'))->map(fn ($s) => ['name' => $s['name'], 'theme' => $s['theme'], 'lang' => $s['lang']]);

        return Inertia::render('veille/index', [
            'themes' => config('veille.themes'),
            'sources' => $sources,
            'items' => fn () => FeedItem::whereIn('source', $sources->keys())->orderByDesc('published_at')->limit(400)
                ->get(['id', 'source', 'theme', 'title', 'summary', 'url', 'image', 'published_at', 'created_at']),
            'saved' => fn () => $user->savedFeedItems()->orderByDesc('feed_saves.created_at')->pluck('feed_items.id'),
            'seenAt' => $seenAt?->toIso8601String(),
            'refreshedAt' => fn () => FeedReader::refreshedAt()?->toIso8601String(),
            'stale' => fn () => FeedReader::stale(),
            'canWrite' => $user->canWrite(),
            'canTask' => $user->canUse('tasks') && $user->canWrite(),
        ]);
    }

    /** Récupère les flux si le cache a vieilli (ou à la demande). Appelée par la page, hors Inertia. */
    public function refresh(Request $request, FeedReader $reader)
    {
        if (! $request->boolean('force') && ! FeedReader::stale()) {
            return response()->json(['refreshed' => false]);
        }
        // Une seule récupération à la fois, et pas plus d'une par minute même à la demande.
        $lock = cache()->lock('veille.refresh', 60);
        if (! $lock->get()) {
            return response()->json(['refreshed' => false]);
        }
        $report = $reader->refresh();

        return response()->json(['refreshed' => true, 'failed' => collect($report)->filter(fn ($r) => is_string($r))->keys()]);
    }

    /** Mettre de côté / retirer : propre à chacun. */
    public function save(Request $request, FeedItem $item)
    {
        abort_unless($request->user()->canWrite(), 403);
        $saved = $request->user()->savedFeedItems()->toggle($item->id)['attached'] !== [];

        return response()->json(['saved' => $saved]);
    }

    /** Un article à traiter devient une tâche : son image (pictogramme, couleur du thème), le lien dans la description. */
    public function toTask(Request $request, FeedItem $item)
    {
        $user = $request->user();
        abort_unless($user->canUse('tasks') && $user->canWrite(), 403);
        $hue = ['cyber' => 'rose', 'windows' => 'blue', 'dev' => 'violet'][$item->theme] ?? 'slate';
        $task = $user->tasks()->create([
            'title' => mb_substr($item->title, 0, 160),
            'notes' => trim(($item->summary ? $item->summary."\n\n" : '').$item->url),
            'status' => 'todo',
            'priority' => 'normal',
            'tag' => 'Veille',
            'icon' => 'search',
            'hue' => $hue,
            'steps' => [['text' => "Lire l'article", 'done' => false]],
            'position' => (int) $user->tasks()->where('status', 'todo')->max('position') + 1,
        ]);

        return response()->json(['task' => $task->id]);
    }
}
