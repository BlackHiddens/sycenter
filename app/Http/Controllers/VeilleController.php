<?php

namespace App\Http\Controllers;

use App\Models\FeedItem;
use App\Models\FeedSource;
use App\Services\FeedReader;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/** App Veille : actualités par thème, lues dans les flux RSS / Atom que chacun choisit. */
class VeilleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $seenAt = $user->veille_seen_at;
        // Première visite : la liste de départ de config/veille.php. Ensuite, chacun fait la sienne.
        if (! $seenAt && ! $user->feedSources()->exists()) {
            foreach (config('veille.sources') as $s) {
                $user->feedSources()->create(['theme' => $s['theme'], 'name' => $s['name'], 'url' => $s['url'], 'lang' => $s['lang']]);
            }
        }
        // « Nouveau » = arrivé depuis la visite précédente. Ni un rechargement partiel (après une lecture des flux),
        // ni le retour après l'ajout ou la modification d'un flux ne comptent comme une visite.
        if (! $request->header('X-Inertia-Partial-Component') && ! session('veille.keep_seen')) {
            $user->forceFill(['veille_seen_at' => now()])->saveQuietly();
        }

        $sources = $user->feedSources()->orderBy('name')->get(['id', 'theme', 'name', 'url', 'lang', 'fetched_at', 'error']);

        return Inertia::render('veille/index', [
            'themes' => config('veille.themes'),
            'sources' => $sources,
            'items' => fn () => FeedItem::whereIn('feed_source_id', $sources->pluck('id'))
                ->orderByRaw('saved_at is null')->orderByDesc('published_at')->limit(500)
                ->get(['id', 'feed_source_id', 'title', 'summary', 'url', 'image', 'published_at', 'saved_at', 'created_at']),
            'seenAt' => $seenAt?->toIso8601String(),
            'refreshedAt' => $sources->min('fetched_at')?->toIso8601String(),
            'stale' => $this->stale($sources),
            'canWrite' => $user->canWrite(),
            'canTask' => $user->canUse('tasks') && $user->canWrite(),
            'maxSources' => config('veille.max_sources'),
        ]);
    }

    /** Flux à relire : jamais lus, ou lus il y a plus de 10 minutes. La page les relit alors à l'ouverture. */
    private function stale($sources): bool
    {
        return $sources->contains(fn ($s) => ! $s->fetched_at || $s->fetched_at->lt(now()->subMinutes(config('veille.refresh_minutes'))));
    }

    /** Lit les flux de la personne (appelée par la page, hors Inertia). Une lecture par minute au plus. */
    public function refresh(Request $request, FeedReader $reader)
    {
        $sources = $request->user()->feedSources()->get();
        if (! $request->boolean('force') && ! $this->stale($sources)) {
            return response()->json(['refreshed' => false]);
        }
        if (! cache()->lock('veille.refresh.'.$request->user()->id, 60)->get()) {
            return response()->json(['refreshed' => false]);
        }
        $reader->refresh($sources);

        return response()->json(['refreshed' => true]);
    }

    /** Ajouter un flux : l'adresse d'un flux, ou celle d'un site qui en annonce un. */
    public function storeSource(Request $request, FeedReader $reader)
    {
        $user = $request->user();
        abort_unless($user->canWrite(), 403);
        $v = $request->validate([
            'url' => 'required|string|max:2048|url:http,https',
            'theme' => ['required', Rule::in(array_keys(config('veille.themes')))],
            'name' => 'nullable|string|max:80',
        ], [], ['url' => 'adresse', 'theme' => 'thème', 'name' => 'nom']);
        if ($user->feedSources()->count() >= config('veille.max_sources')) {
            throw ValidationException::withMessages(['url' => 'Tu suis déjà '.config('veille.max_sources').' flux : retires-en un avant d’en ajouter.']);
        }

        $found = $reader->discover(trim($v['url']));
        if (is_string($found)) {
            throw ValidationException::withMessages(['url' => $found]);
        }
        if ($user->feedSources()->where('url', $found['url'])->exists()) {
            throw ValidationException::withMessages(['url' => 'Ce flux est déjà dans ta veille.']);
        }

        $source = $user->feedSources()->create([
            'theme' => $v['theme'],
            'name' => trim($v['name'] ?? '') ?: ($found['title'] ?: parse_url($found['url'], PHP_URL_HOST)),
            'url' => $found['url'],
            'lang' => $found['lang'],
            'fetched_at' => now(),
        ]);
        $reader->store($source, $found['items']);

        return back()->with('veille.keep_seen', true);
    }

    /** Renommer un flux ou le changer de thème. */
    public function updateSource(Request $request, FeedSource $source)
    {
        $this->own($request, $source);
        $source->update($request->validate([
            'theme' => ['required', Rule::in(array_keys(config('veille.themes')))],
            'name' => 'required|string|max:80',
        ], [], ['theme' => 'thème', 'name' => 'nom']));

        return back()->with('veille.keep_seen', true);
    }

    /** Retirer un flux : ses articles partent avec lui, y compris ceux mis de côté. */
    public function destroySource(Request $request, FeedSource $source)
    {
        $this->own($request, $source);
        $source->delete();

        return back()->with('veille.keep_seen', true);
    }

    /** Mettre de côté / retirer. */
    public function save(Request $request, FeedItem $item)
    {
        $this->own($request, $item->source);
        $item->forceFill(['saved_at' => $item->saved_at ? null : now()])->save();

        return response()->json(['saved' => (bool) $item->saved_at]);
    }

    /** Un article à traiter devient une tâche : son image (pictogramme, couleur du thème), le lien dans la description. */
    public function toTask(Request $request, FeedItem $item)
    {
        $this->own($request, $item->source);
        $user = $request->user();
        abort_unless($user->canUse('tasks'), 403);
        $task = $user->tasks()->create([
            'title' => mb_substr($item->title, 0, 160),
            'notes' => trim(($item->summary ? $item->summary."\n\n" : '').$item->url),
            'status' => 'todo',
            'priority' => 'normal',
            'tag' => 'Veille',
            'icon' => 'search',
            'hue' => ['cyber' => 'rose', 'windows' => 'blue', 'dev' => 'violet'][$item->source->theme] ?? 'slate',
            'steps' => [['text' => "Lire l'article", 'done' => false]],
            'position' => (int) $user->tasks()->where('status', 'todo')->max('position') + 1,
        ]);

        return response()->json(['task' => $task->id]);
    }

    private function own(Request $request, FeedSource $source): void
    {
        abort_unless($source->user_id === $request->user()->id && $request->user()->canWrite(), 403);
    }
}
