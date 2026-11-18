<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Tableau de tâches personnel : chacun ne voit que les siennes. */
class TaskController extends Controller
{
    private const COLUMNS = ['id', 'title', 'notes', 'status', 'priority', 'tag', 'due_date', 'completed_at', 'recurrence', 'steps', 'icon', 'hue', 'waiting_for', 'waiting_since', 'follow_up_on', 'follow_ups'];

    public function index(Request $request)
    {
        $user = $request->user();

        // Jours où au moins une tâche a été terminée, pour la série et le graphique de la semaine.
        $perDay = $user->tasks()->where('status', 'done')->where('completed_at', '>=', today()->subDays(90))
            ->pluck('completed_at')->countBy(fn (Carbon $d) => $d->toDateString());
        $streak = 0;
        for ($day = $perDay->has(today()->toDateString()) ? today() : today()->subDay(); $perDay->has($day->toDateString()); $day = $day->subDay()) {
            $streak++;
        }

        return Inertia::render('tasks/index', [
            'tasks' => $user->tasks()->onBoard()->orderBy('position')->orderBy('id')->get(self::COLUMNS),
            'archivedCount' => $user->tasks()->archived()->count(),
            'activity' => collect(range(6, 0))->map(fn ($i) => ['date' => today()->subDays($i)->toDateString(), 'count' => $perDay->get(today()->subDays($i)->toDateString(), 0)]),
            'streak' => $streak,
            'notebook' => $user->practices()->handy()->get(['id', 'title', 'category', 'body', 'uses']),
            'canWrite' => $user->canWrite(),
        ]);
    }

    /** L'archive : ce qui a quitté le tableau, avec le rythme des 12 dernières semaines. */
    public function archive(Request $request)
    {
        $user = $request->user();
        $since = today()->startOfWeek()->subWeeks(11);
        $perWeek = $user->tasks()->where('status', 'done')->where('completed_at', '>=', $since)
            ->pluck('completed_at')->countBy(fn (Carbon $d) => $d->copy()->startOfWeek()->toDateString());

        return Inertia::render('tasks/archive', [
            'tasks' => $user->tasks()->archived()->orderByRaw('coalesce(archived_at, completed_at) desc')
                ->get([...self::COLUMNS, 'archived_at']),
            'weeks' => collect(range(11, 0))->map(function ($i) use ($perWeek) {
                $week = today()->startOfWeek()->subWeeks($i)->toDateString();

                return ['week' => $week, 'count' => $perWeek->get($week, 0)];
            }),
            'openTasks' => $user->tasks()->onBoard()->where('status', '!=', 'done')->count(),
            'practiceCount' => $user->practices()->count(),
            'canWrite' => $user->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $v = $this->validated($request);
        $v['steps'] = $v['steps'] ?? [];
        $v['status'] = Task::statusFromSteps($v['status'], $v['steps']);
        $task = $request->user()->tasks()->create($v + ['position' => $this->lastPosition($request, $v['status'])]);
        $this->settle($task, 'todo');

        return back();
    }

    /** Le formulaire de la tâche ; ses étapes passent par steps(), qui les enregistre au fil de l'eau. */
    public function update(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $was = $task->status;
        $task->update(Arr::except($this->validated($request), 'steps'));
        $this->settle($task, $was);

        return back();
    }

    /** Enregistre les étapes et fait avancer la tâche de colonne selon ce qui est coché. */
    public function steps(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $steps = $request->validate($this->stepRules(), [], ['steps.*.text' => 'étape'])['steps'] ?? [];
        $was = $task->status;
        $status = Task::statusFromSteps($was, $steps);
        $task->update(['steps' => $steps, 'status' => $status] + ($status !== $was ? ['position' => $this->lastPosition($request, $status)] : []));
        $this->settle($task, $was);

        return back();
    }

    /** Déplace une tâche dans une colonne, avant la tâche "before" ou en fin de colonne. */
    public function move(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $v = $request->validate(['status' => 'required|in:todo,doing,waiting,done', 'before' => 'nullable|integer', 'waiting_for' => 'nullable|string|max:80']);
        $ids = $request->user()->tasks()->where('status', $v['status'])->whereKeyNot($task->id)->orderBy('position')->orderBy('id')->pluck('id')->all();
        $at = array_search($v['before'] ?? null, $ids, true);
        array_splice($ids, $at === false ? count($ids) : $at, 0, [$task->id]);

        $was = $task->status;
        $task->update(['status' => $v['status']] + (array_key_exists('waiting_for', $v) ? ['waiting_for' => $v['waiting_for']] : []));
        foreach ($ids as $position => $id) {
            Task::whereKey($id)->update(['position' => $position]);
        }
        $this->settle($task, $was);

        return back();
    }

    /** J'ai relancé : la prochaine relance est repoussée de quelques jours. */
    public function followUp(Request $request, Task $task)
    {
        $this->guard($request, $task);
        abort_unless($task->status === 'waiting', 422);
        $task->update(['follow_up_on' => today()->addDays(Task::FOLLOW_UP_DAYS), 'follow_ups' => min(255, $task->follow_ups + 1)]);

        return back();
    }

    /** Range une tâche dans l'archive. */
    public function archiveOne(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $task->update(['archived_at' => now()]);

        return back();
    }

    /** Range d'un coup toutes les tâches terminées encore sur le tableau. */
    public function archiveDone(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $request->user()->tasks()->onBoard()->where('status', 'done')->update(['archived_at' => now()]);

        return back();
    }

    /** Sort une tâche de l'archive et la remet à faire, étapes décochées. */
    public function restore(Request $request, Task $task)
    {
        $this->guard($request, $task);
        $task->update([
            'archived_at' => null, 'status' => 'todo', 'completed_at' => null, 'position' => $this->lastPosition($request, 'todo'),
            'steps' => collect($task->steps ?? [])->map(fn ($s) => ['text' => $s['text'], 'done' => false])->all(),
        ]);

        return back();
    }

    /** Supprime définitivement tout le contenu de l'archive. */
    public function purge(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $request->user()->tasks()->archived()->delete();

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
     * terminée crée sa prochaine occurrence (étapes décochées) et cesse elle-même de se répéter.
     */
    private function settle(Task $task, string $previousStatus): void
    {
        $done = $task->status === 'done';
        $task->update(['completed_at' => $done ? ($task->completed_at ?? now()) : null]);
        // Entrée en attente : on note depuis quand, et la première relance tombe quelques jours plus tard.
        // Sortie de l'attente : la relance n'a plus d'objet ; on garde qui on attendait, pour mémoire.
        if ($task->status === 'waiting' && $previousStatus !== 'waiting') {
            $task->update(['waiting_since' => today(), 'follow_up_on' => $task->follow_up_on ?? today()->addDays(Task::FOLLOW_UP_DAYS), 'follow_ups' => 0]);
        } elseif ($task->status !== 'waiting' && $previousStatus === 'waiting') {
            $task->update(['waiting_since' => null, 'follow_up_on' => null]);
        }
        if (! $done || $previousStatus === 'done' || ! $task->recurrence) {
            return;
        }

        $from = $task->due_date && $task->due_date->isFuture() ? $task->due_date->copy() : today();
        Task::create([
            'user_id' => $task->user_id, 'title' => $task->title, 'notes' => $task->notes, 'priority' => $task->priority, 'tag' => $task->tag,
            'recurrence' => $task->recurrence, 'status' => 'todo',
            'steps' => collect($task->steps ?? [])->map(fn ($s) => ['text' => $s['text'], 'done' => false])->all(),
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

    private function stepRules(): array
    {
        return ['steps' => 'present|array|max:30', 'steps.*.text' => 'required|string|max:160', 'steps.*.done' => 'required|boolean'];
    }

    private function validated(Request $request): array
    {
        $v = $request->validate([
            'title' => 'required|string|max:160',
            'notes' => 'nullable|string|max:4000',
            'status' => 'required|in:todo,doing,waiting,done',
            'priority' => 'required|in:low,normal,high',
            'tag' => 'nullable|string|max:40',
            'due_date' => 'nullable|date',
            'recurrence' => 'nullable|in:daily,weekly,monthly',
            'icon' => ['nullable', Rule::in(Task::ICONS)],
            'hue' => ['nullable', Rule::in(Task::HUES)],
            'waiting_for' => 'nullable|string|max:80',
            'follow_up_on' => 'nullable|date',
            'steps' => 'nullable|array|max:30',
            'steps.*.text' => 'required|string|max:160',
            'steps.*.done' => 'boolean',
        ], [], ['title' => 'titre', 'due_date' => 'échéance', 'tag' => 'étiquette', 'recurrence' => 'répétition', 'steps.*.text' => 'étape', 'waiting_for' => 'en attente de', 'follow_up_on' => 'date de relance']);
        if (isset($v['steps'])) {
            $v['steps'] = array_map(fn ($s) => ['text' => $s['text'], 'done' => (bool) ($s['done'] ?? false)], $v['steps']);
        }

        return $v;
    }
}
