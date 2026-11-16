<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/** Tableau de tâches personnel : chacun ne voit que les siennes. */
class TaskController extends Controller
{
    /** Une tâche terminée quitte le tableau après ce nombre de jours (elle reste en base). */
    private const ARCHIVE_AFTER_DAYS = 7;

    public function index(Request $request)
    {
        $user = $request->user();
        $cutoff = now()->subDays(self::ARCHIVE_AFTER_DAYS);
        $archived = fn ($q) => $q->where('status', 'done')->where('completed_at', '<', $cutoff);

        // Jours où au moins une tâche a été terminée, pour la série et le graphique de la semaine.
        $perDay = $user->tasks()->where('status', 'done')->where('completed_at', '>=', today()->subDays(90))
            ->pluck('completed_at')->countBy(fn (Carbon $d) => $d->toDateString());
        $streak = 0;
        for ($day = $perDay->has(today()->toDateString()) ? today() : today()->subDay(); $perDay->has($day->toDateString()); $day = $day->subDay()) {
            $streak++;
        }

        return Inertia::render('tasks/index', [
            'tasks' => $user->tasks()->whereNot($archived)->orderBy('position')->orderBy('id')
                ->get(['id', 'title', 'notes', 'status', 'priority', 'tag', 'due_date', 'completed_at', 'recurrence']),
            'archivedCount' => $user->tasks()->where($archived)->count(),
            'activity' => collect(range(6, 0))->map(fn ($i) => ['date' => today()->subDays($i)->toDateString(), 'count' => $perDay->get(today()->subDays($i)->toDateString(), 0)]),
            'streak' => $streak,
            'review' => $user->practices()->due()->orderByRaw('review_at is null desc')->orderBy('review_at')->first(['id', 'title', 'category', 'body']),
            'reviewDue' => $user->practices()->due()->count(),
            'practiceCount' => $user->practices()->count(),
            'canWrite' => $user->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $v = $this->validated($request);
        $task = $request->user()->tasks()->create($v + ['position' => $this->lastPosition($request, $v['status'])]);
        $this->settle($task, 'todo');

        return back();
    }

    public function update(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $was = $task->status;
        $task->update($this->validated($request));
        $this->settle($task, $was);

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

        $was = $task->status;
        $task->update(['status' => $v['status']]);
        foreach ($ids as $position => $id) {
            Task::whereKey($id)->update(['position' => $position]);
        }
        $this->settle($task, $was);

        return back();
    }

    public function destroy(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $task->delete();

        return back();
    }

    /**
     * Met à jour la date de fin après un changement d'état. Une tâche répétée qui vient d'être
     * terminée crée sa prochaine occurrence et cesse elle-même de se répéter.
     */
    private function settle(Task $task, string $previousStatus): void
    {
        $done = $task->status === 'done';
        $task->update(['completed_at' => $done ? ($task->completed_at ?? now()) : null]);
        if (! $done || $previousStatus === 'done' || ! $task->recurrence) {
            return;
        }

        $from = $task->due_date && $task->due_date->isFuture() ? $task->due_date->copy() : today();
        Task::create([
            'user_id' => $task->user_id, 'title' => $task->title, 'notes' => $task->notes, 'priority' => $task->priority, 'tag' => $task->tag,
            'recurrence' => $task->recurrence, 'status' => 'todo',
            'due_date' => match ($task->recurrence) {
                'daily' => $from->addDay(), 'weekly' => $from->addWeek(), 'monthly' => $from->addMonthNoOverflow(),
            },
            'position' => Task::where('user_id', $task->user_id)->where('status', 'todo')->max('position') + 1,
        ]);
        $task->update(['recurrence' => null]);
    }

    private function lastPosition(Request $request, string $status): int
    {
        return $request->user()->tasks()->where('status', $status)->max('position') + 1;
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
            'recurrence' => 'nullable|in:daily,weekly,monthly',
        ], [], ['title' => 'titre', 'due_date' => 'échéance', 'tag' => 'étiquette', 'recurrence' => 'répétition']);
    }
}
