<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Notes dessinées, personnelles : chacun ne voit que les siennes. */
class NoteController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('notes/index', [
            'notes' => $user->notes()->orderByDesc('pinned')->latest('updated_at')
                ->get(['id', 'title', 'color', 'pinned', 'text', 'preview', 'links', 'updated_at']),
            'colors' => config('notes.colors'),
            'templates' => config('notes.templates'),
            'canWrite' => $user->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $v = $request->validate([
            'title' => 'nullable|string|max:120',
            'color' => ['nullable', Rule::in(array_keys(config('notes.colors')))],
            'template' => ['nullable', Rule::in(array_keys(config('notes.templates')))],
        ]);
        $note = $request->user()->notes()->create([
            'title' => ($v['title'] ?? '') ?: 'Note du '.now()->translatedFormat('j F'),
            'color' => $v['color'] ?? 'slate',
        ]);

        // Le modèle est dessiné par le navigateur à la première ouverture, tant que la note est vide.
        return to_route('notes.edit', ['note' => $note, 'template' => $v['template'] ?? 'blank']);
    }

    public function edit(Request $request, Note $note)
    {
        $this->guard($request, $note);
        $user = $request->user();

        return Inertia::render('notes/edit', [
            'note' => $note->only('id', 'title', 'color', 'pinned', 'scene', 'updated_at'),
            'template' => $note->scene ? null : $request->query('template'),
            'others' => $user->notes()->whereKeyNot($note->id)->orderBy('title')->get(['id', 'title', 'color']),
            'backlinks' => $user->notes()->whereJsonContains('links', $note->id)->get(['id', 'title', 'color']),
            'colors' => config('notes.colors'),
            'canWrite' => $user->canWrite(),
            'canTasks' => $user->canUse('tasks') && $user->canWrite(),
        ]);
    }

    /** Titre, couleur, épinglage. */
    public function update(Request $request, Note $note)
    {
        $this->guard($request, $note, write: true);
        $note->update($request->validate([
            'title' => 'sometimes|required|string|max:120',
            'color' => ['sometimes', Rule::in(array_keys(config('notes.colors')))],
            'pinned' => 'sometimes|boolean',
        ], [], ['title' => 'titre']));

        return back();
    }

    /** Enregistrement automatique du dessin, de son texte et de sa vignette. */
    public function scene(Request $request, Note $note)
    {
        $this->guard($request, $note, write: true);
        $max = config('notes.max_scene_kb');
        $v = $request->validate([
            'scene' => "required|string|max:{$max}000",
            'text' => 'nullable|string|max:100000',
            'preview' => 'nullable|string|max:600000|starts_with:data:image/',
        ], ['scene.max' => 'Ce dessin est trop lourd pour être enregistré. Retire une ou deux images collées.']);
        $scene = json_decode($v['scene'], true);
        abort_unless(is_array($scene) && is_array($scene['elements'] ?? null), 422, 'Dessin illisible.');

        $note->update([
            'scene' => $v['scene'],
            'text' => $v['text'] ?? '',
            'preview' => $v['preview'] ?? $note->preview,
            'links' => Note::linksIn($scene['elements'], $note->id),
        ]);

        return response()->noContent();
    }

    public function destroy(Request $request, Note $note)
    {
        $this->guard($request, $note, write: true);
        $note->delete();

        return to_route('notes.index');
    }

    private function guard(Request $request, Note $note, bool $write = false): void
    {
        abort_unless($note->user_id === $request->user()->id, 403);
        abort_if($write && ! $request->user()->canWrite(), 403);
    }
}
