<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        return User::factory()->create(['role' => 'owner']);
    }

    private function member(array $apps = ['docs'], string $role = 'user'): User
    {
        return User::factory()->create(['role' => $role, 'apps' => $apps]);
    }

    private function payload(array $data = []): array
    {
        return ['title' => 'Siège', 'version' => '1.0', 'data' => array_merge(config('documents.network.defaults'), $data)];
    }

    /** les invités sont renvoyés vers la connexion et l'inscription publique n'existe pas */
    public function test_guests_are_redirected_and_registration_is_closed(): void
    {
        $this->get('/')->assertRedirect('/login');
        $this->get('/register')->assertNotFound();
    }

    /** un utilisateur sans droit ne peut ouvrir ni Documents ni Accès */
    public function test_user_without_grant_cannot_open_apps(): void
    {
        $user = $this->member(apps: []);
        $this->actingAs($user)->get('/')->assertOk();
        $this->actingAs($user)->get('/documents')->assertForbidden();
        $this->actingAs($user)->get('/users')->assertForbidden();
    }

    /** seul le propriétaire gère les accès */
    public function test_only_owner_manages_access(): void
    {
        $this->actingAs($this->member())->post('/users', [])->assertForbidden();

        $this->actingAs($owner = $this->owner())->post('/users', [
            'name' => 'Invité', 'email' => 'invite@example.com', 'password' => 'motdepasse-solide', 'role' => 'user', 'apps' => ['docs'],
        ])->assertSessionHasNoErrors();
        $guest = User::where('email', 'invite@example.com')->firstOrFail();
        $this->assertTrue($guest->canUse('docs'));
        $this->assertFalse($guest->canUse('access'));

        // On ne peut ni créer un second propriétaire, ni donner l'app Accès, ni modifier ou supprimer le propriétaire.
        $this->actingAs($owner)->put("/users/{$guest->id}", ['role' => 'owner', 'apps' => ['access']])->assertSessionHasErrors(['role', 'apps.0']);
        $this->actingAs($owner)->delete("/users/{$owner->id}")->assertForbidden();

        $this->actingAs($owner)->delete("/users/{$guest->id}");
        $this->assertNull(User::find($guest->id));
    }

    /** cycle de vie d'un document réseau : création, enregistrement, PDF */
    public function test_network_document_lifecycle(): void
    {
        $user = $this->member();
        $this->actingAs($user)->post('/documents', ['type' => 'network'])->assertRedirect();
        $doc = Document::firstOrFail();

        $this->actingAs($user)->put("/documents/{$doc->id}", $this->payload(['vlans' => [['id' => 20, 'name' => 'Serveurs', 'subnet' => '10.10.20.0/24', 'gateway' => '10.10.20.1']]]))
            ->assertSessionHasNoErrors();
        $this->assertSame('Siège', $doc->fresh()->title);
        $this->assertSame(20, $doc->fresh()->data['vlans'][0]['id']);

        $this->actingAs($user)->put("/documents/{$doc->id}", $this->payload(['vlans' => [['id' => 5000, 'name' => 'X', 'subnet' => '10.0.0.0', 'gateway' => 'abc']]]))
            ->assertSessionHasErrors(['data.vlans.0.id', 'data.vlans.0.subnet', 'data.vlans.0.gateway']);

        $pdf = $this->actingAs($user)->get("/documents/{$doc->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        $this->assertSame('generated', $doc->fresh()->status);
    }

    /** un modèle inactif ne peut pas être créé */
    public function test_inactive_template_cannot_be_created(): void
    {
        $this->actingAs($this->member())->post('/documents', ['type' => 'pra'])->assertSessionHasErrors('type');
    }

    /** les documents sont cloisonnés entre utilisateurs, sauf pour le propriétaire */
    public function test_documents_are_isolated_except_for_owner(): void
    {
        $doc = $this->member()->documents()->create(['type' => 'network', 'title' => 'Privé', 'data' => config('documents.network.defaults')]);
        $this->actingAs($this->member())->get("/documents/{$doc->id}/edit")->assertForbidden();
        $this->actingAs($this->member())->put("/documents/{$doc->id}", $this->payload())->assertForbidden();
        $this->actingAs($this->owner())->get("/documents/{$doc->id}/edit")->assertOk();
    }

    /** le rôle lecture seule consulte et télécharge sans modifier */
    public function test_viewer_reads_and_downloads_without_writing(): void
    {
        $viewer = $this->member(role: 'viewer');
        $doc = $viewer->documents()->create(['type' => 'network', 'title' => 'Lecture', 'data' => config('documents.network.defaults')]);
        $this->actingAs($viewer)->post('/documents', ['type' => 'network'])->assertForbidden();
        $this->actingAs($viewer)->put("/documents/{$doc->id}", $this->payload())->assertForbidden();
        $this->actingAs($viewer)->delete("/documents/{$doc->id}")->assertForbidden();
        $this->actingAs($viewer)->get("/documents/{$doc->id}/pdf")->assertOk();
        $this->assertSame('draft', $doc->fresh()->status);
    }

    /** document d'architecture logicielle : enregistrement, validation, PDF */
    public function test_software_document_lifecycle(): void
    {
        $user = $this->member();
        $this->actingAs($user)->post('/documents', ['type' => 'software'])->assertRedirect();
        $doc = Document::firstOrFail();
        $data = array_merge(config('documents.software.defaults'), [
            'goal' => 'Suivre les commandes.',
            'decisions' => [['decision' => 'PostgreSQL', 'reason' => 'Données relationnelles']],
        ]);

        $this->actingAs($user)->put("/documents/{$doc->id}", ['title' => 'Portail', 'version' => '1.0', 'data' => $data])->assertSessionHasNoErrors();
        $this->assertSame('PostgreSQL', $doc->fresh()->data['decisions'][0]['decision']);

        $data['components'][0]['layer'] = 'Inconnue';
        $this->actingAs($user)->put("/documents/{$doc->id}", ['title' => 'Portail', 'version' => '1.0', 'data' => $data])->assertSessionHasErrors('data.components.0.layer');

        $pdf = $this->actingAs($user)->get("/documents/{$doc->id}/pdf")->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }

    /** tâches : création, déplacement ordonné entre colonnes, date de fin */
    public function test_tasks_can_be_created_and_moved(): void
    {
        $user = $this->member(['tasks']);
        foreach (['A', 'B', 'C'] as $title) {
            $this->actingAs($user)->post('/tasks', ['title' => $title, 'status' => 'todo', 'priority' => 'normal'])->assertSessionHasNoErrors();
        }
        [$a, $b, $c] = $user->tasks()->orderBy('position')->get()->all();
        $order = fn (string $status) => $user->tasks()->where('status', $status)->orderBy('position')->pluck('title')->all();
        $this->assertSame(['A', 'B', 'C'], $order('todo'));

        $this->actingAs($user)->patch("/tasks/{$c->id}/move", ['status' => 'todo', 'before' => $a->id]);
        $this->assertSame(['C', 'A', 'B'], $order('todo'));

        $this->actingAs($user)->patch("/tasks/{$b->id}/move", ['status' => 'done', 'before' => null]);
        $this->assertSame(['C', 'A'], $order('todo'));
        $this->assertNotNull($b->fresh()->completed_at);

        $this->actingAs($user)->patch("/tasks/{$b->id}/move", ['status' => 'doing']);
        $this->assertNull($b->fresh()->completed_at);
    }

    /** tâches et pratiques : privées, fermées sans le droit, en lecture seule pour le rôle dédié */
    public function test_tasks_and_practices_are_private(): void
    {
        $user = $this->member(['tasks']);
        $task = $user->tasks()->create(['title' => 'Privée']);
        $practice = $user->practices()->create(['title' => 'T', 'category' => 'Git', 'body' => 'B']);

        $this->actingAs($this->member(['docs']))->get('/tasks')->assertForbidden();
        $other = $this->member(['tasks']);
        $this->actingAs($other)->put("/tasks/{$task->id}", ['title' => 'X', 'status' => 'todo', 'priority' => 'low'])->assertForbidden();
        $this->actingAs($other)->patch("/tasks/{$task->id}/move", ['status' => 'done'])->assertForbidden();
        $this->actingAs($other)->delete("/practices/{$practice->id}")->assertForbidden();
        $this->actingAs($this->owner())->delete("/tasks/{$task->id}")->assertForbidden();

        $viewer = $this->member(['tasks'], 'viewer');
        $this->actingAs($viewer)->get('/tasks')->assertOk();
        $this->actingAs($viewer)->post('/tasks', ['title' => 'X', 'status' => 'todo', 'priority' => 'low'])->assertForbidden();
        $this->actingAs($viewer)->post('/practices', ['title' => 'X', 'category' => 'Y', 'body' => 'Z'])->assertForbidden();

        $this->actingAs($user)->post('/practices', ['title' => 'Rebase', 'category' => 'Git', 'body' => 'git pull --rebase'])->assertSessionHasNoErrors();
        $this->actingAs($user)->get('/practices')->assertOk();
        $this->assertSame(2, $user->practices()->count());
        $this->assertSame(1, Task::count());
    }

    /** une tâche répétée terminée crée la suivante, une seule fois */
    public function test_recurring_task_spawns_next_occurrence(): void
    {
        $user = $this->member(['tasks']);
        $task = $user->tasks()->create(['title' => 'Sauvegarde', 'recurrence' => 'weekly', 'due_date' => today()]);

        $this->actingAs($user)->patch("/tasks/{$task->id}/move", ['status' => 'done']);
        $next = $user->tasks()->where('status', 'todo')->sole();
        $this->assertSame('weekly', $next->recurrence);
        $this->assertSame(today()->addWeek()->toDateString(), $next->due_date->toDateString());
        $this->assertNull($task->fresh()->recurrence);

        // Rouvrir puis terminer de nouveau l'ancienne ne recrée rien.
        $this->actingAs($user)->patch("/tasks/{$task->id}/move", ['status' => 'todo']);
        $this->actingAs($user)->patch("/tasks/{$task->id}/move", ['status' => 'done']);
        $this->assertSame(2, $user->tasks()->count());
    }

    /** série, archivage automatique et pastille */
    public function test_board_reports_streak_archive_and_badge(): void
    {
        $user = $this->member(['tasks']);
        $user->tasks()->create(['title' => 'Hier', 'status' => 'done', 'completed_at' => now()->subDay()]);
        $user->tasks()->create(['title' => 'Auj', 'status' => 'done', 'completed_at' => now()]);
        $user->tasks()->create(['title' => 'Vieille', 'status' => 'done', 'completed_at' => now()->subDays(10)]);
        $user->tasks()->create(['title' => 'En retard', 'due_date' => today()->subDay()]);
        $user->practices()->create(['title' => 'T', 'category' => 'Git', 'body' => 'B']);

        $this->actingAs($user)->get('/tasks')->assertInertia(fn ($page) => $page
            ->where('streak', 2)
            ->where('archivedCount', 1)
            ->has('tasks', 3)
            ->where('activity.6.count', 1)
            ->where('review.title', 'T')
            ->where('apps.0.key', 'tasks')->where('apps.0.badge', 2));
    }

    /** révision espacée : une fiche sue s'éloigne, une fiche oubliée revient demain */
    public function test_practice_review_schedules_next_date(): void
    {
        $user = $this->member(['tasks']);
        $practice = $user->practices()->create(['title' => 'T', 'category' => 'Git', 'body' => 'B']);

        $this->actingAs($user)->post("/practices/{$practice->id}/review", ['remembered' => true]);
        $this->assertSame(2, $practice->fresh()->interval_days);
        $this->assertSame(today()->addDays(2)->toDateString(), $practice->fresh()->review_at->toDateString());
        $this->actingAs($user)->get('/tasks')->assertInertia(fn ($page) => $page->where('review', null)->where('reviewDue', 0));

        $this->actingAs($user)->post("/practices/{$practice->id}/review", ['remembered' => false]);
        $this->assertSame(1, $practice->fresh()->interval_days);
        $this->actingAs($this->member(['tasks']))->post("/practices/{$practice->id}/review", ['remembered' => true])->assertForbidden();
    }
}
