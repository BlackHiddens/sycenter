<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Tableau de tâches personnel : chacun ne voit que les siennes. */
class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('tasks/index', [
            'tasks' => $user->tasks()->orderBy('position')->orderBy('id')
                ->get(['id', 'title', 'notes', 'status', 'priority', 'tag', 'due_date', 'completed_at']),
            'practiceCount' => $user->practices()->count(),
            'canWrite' => $user->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $v = $this->validated($request);
        $request->user()->tasks()->create($v + [
            'position' => $request->user()->tasks()->where('status', $v['status'])->max('position') + 1,
            'completed_at' => $v['status'] === 'done' ? now() : null,
        ]);

        return back();
    }

    public function update(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $v = $this->validated($request);
        $task->update($v + ['completed_at' => $v['status'] === 'done' ? ($task->completed_at ?? now()) : null]);

        return back();
    }

    /** Déplace une tâche dans une colonne, avant la tâche "before" ou en fin de colonne. */
    public function move(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $v = $request->validate(['status' => 'required|in:todo,doing,done', 'before' => 'nullable|integer']);
        $ids = $request->user()->tasks()->where('status', $v['status'])->whereKeyNot($task->id)->orderBy('position')->orderBy('id')->pluck('id')->all();
        $at = array_search($v['before'] ?? null, $ids, true);
        array_splice($ids, $at === false ? count($ids) : $at, 0, [$task->id]);

        $task->update(['status' => $v['status'], 'completed_at' => $v['status'] === 'done' ? ($task->completed_at ?? now()) : null]);
        foreach ($ids as $position => $id) {
            Task::whereKey($id)->update(['position' => $position]);
        }

        return back();
    }

    public function destroy(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $task->delete();

        return back();
    }

    private function guard(Request $request, Task $task): void
    {
        abort_unless($task->user_id === $request->user()->id && $request->user()->canWrite(), 403);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:160',
            'notes' => 'nullable|string|max:4000',
            'status' => 'required|in:todo,doing,done',
            'priority' => 'required|in:low,normal,high',
            'tag' => 'nullable|string|max:40',
            'due_date' => 'nullable|date',
        ], [], ['title' => 'titre', 'due_date' => 'échéance', 'tag' => 'étiquette']);
    }
}
