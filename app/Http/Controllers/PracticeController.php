<?php

namespace App\Http\Controllers;

use App\Models\Practice;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Carnet personnel (commandes, astuces) dans l'app Tâches : on note pour ne pas chercher deux fois. */
class PracticeController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('tasks/practices', [
            'practices' => $request->user()->practices()->handy()->get(['id', 'title', 'category', 'body', 'uses', 'last_used_at', 'updated_at']),
            'openTasks' => $request->user()->tasks()->onBoard()->where('status', '!=', 'done')->count(),
            'archivedCount' => $request->user()->tasks()->archived()->count(),
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

    /** Une fiche copiée : elle remonte dans le carnet. Ne passe pas par Inertia, la page ne bouge pas. */
    public function used(Request $request, Practice $practice)
    {
        abort_unless($practice->user_id === $request->user()->id, 403);
        $practice->timestamps = false;
        $practice->forceFill(['uses' => $practice->uses + 1, 'last_used_at' => now()])->save();

        return response()->noContent();
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
