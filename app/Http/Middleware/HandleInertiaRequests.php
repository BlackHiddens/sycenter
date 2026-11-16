<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'apps' => fn () => $this->apps($request),
            'flash' => fn () => $request->session()->get('flash'),
        ]);
    }

    /** Apps visibles par l'utilisateur : celles qu'il peut ouvrir, plus les "à venir" pour le propriétaire. */
    private function apps(Request $request): array
    {
        $user = $request->user();
        if (! $user) {
            return [];
        }

        return collect(config('apps'))
            ->map(fn ($a, $key) => [
                'key' => $key, 'name' => $a['name'], 'verb' => $a['verb'], 'tagline' => $a['tagline'], 'icon' => $a['icon'], 'color' => $a['color'],
                'href' => $user->canUse($key) && $a['route'] ? route($a['route']) : null,
                'ownerOnly' => ! empty($a['owner_only']),
                'badge' => $key === 'tasks' && $user->canUse('tasks') ? $this->tasksBadge($user) : 0,
            ])
            ->filter(fn ($a) => $a['href'] || $user->isOwner())
            ->values()->all();
    }

    /** Ce qui attend dans l'app Tâches : échéances atteintes et fiches à réviser. */
    private function tasksBadge($user): int
    {
        return $user->tasks()->where('status', '!=', 'done')->whereDate('due_date', '<=', today())->count()
            + $user->practices()->due()->count();
    }
}
