<?php

namespace App\Http\Controllers;

use App\Models\Practice;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Carnet personnel de bonnes pratiques, dans l'app Tâches. */
class PracticeController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('tasks/practices', [
            'practices' => $request->user()->practices()->orderBy('category')->orderBy('title')->get(['id', 'title', 'category', 'body']),
            'openTasks' => $request->user()->tasks()->where('status', '!=', 'done')->count(),
            'canWrite' => $request->user()->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $request->user()->practices()->create($this->validated($request));

        return back();
    }

    public function update(Request $request, Practice $practice)
    {
        $this->guard($request, $practice);
        $practice->update($this->validated($request));

        return back();
    }

    /**
     * Révision espacée : une fiche sue revient deux fois plus tard (60 jours au plus),
     * une fiche oubliée revient le lendemain.
     */
    public function review(Request $request, Practice $practice)
    {
        $this->guard($request, $practice);
        $days = $request->validate(['remembered' => 'required|boolean'])['remembered'] ? min($practice->interval_days * 2, 60) : 1;
        $practice->update(['interval_days' => $days, 'review_at' => today()->addDays($days)]);

        return back();
    }

    public function destroy(Request $request, Practice $practice)
    {
        $this->guard($request, $practice);
        $practice->delete();

        return back();
    }

    private function guard(Request $request, Practice $practice): void
    {
        abort_unless($practice->user_id === $request->user()->id && $request->user()->canWrite(), 403);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:160',
            'category' => 'required|string|max:40',
            'body' => 'required|string|max:8000',
        ], [], ['title' => 'titre', 'category' => 'catégorie', 'body' => 'contenu']);
    }
}
