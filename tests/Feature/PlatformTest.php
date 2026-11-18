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
            'name' => 'Invité', 'email' => 'invite@example.com', 'password' => 'motdepasse-solide-42', 'role' => 'user', 'apps' => ['docs'],
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

    /** cocher les étapes fait avancer la tâche de colonne, dans les deux sens */
    public function test_steps_move_the_task_between_columns(): void
    {
        $user = $this->member(['tasks']);
        $this->actingAs($user)->post('/tasks', ['title' => 'Livrer', 'status' => 'todo', 'priority' => 'normal', 'steps' => [['text' => 'Tester'], ['text' => 'Envoyer']]])->assertSessionHasNoErrors();
        $task = $user->tasks()->sole();
        $this->assertSame([['text' => 'Tester', 'done' => false], ['text' => 'Envoyer', 'done' => false]], $task->steps);

        $put = fn (bool $a, bool $b) => $this->actingAs($user)->put("/tasks/{$task->id}/steps", ['steps' => [['text' => 'Tester', 'done' => $a], ['text' => 'Envoyer', 'done' => $b]]]);
        $put(true, false);
        $this->assertSame('doing', $task->fresh()->status);
        $put(true, true);
        $this->assertSame('done', $task->fresh()->status);
        $this->assertNotNull($task->fresh()->completed_at);
        $put(false, false);
        $this->assertSame('todo', $task->fresh()->status);
        $this->assertNull($task->fresh()->completed_at);

        // Enregistrer le formulaire ne touche pas aux étapes.
        $this->actingAs($user)->put("/tasks/{$task->id}", ['title' => 'Livrer v2', 'status' => 'todo', 'priority' => 'high', 'steps' => []]);
        $this->assertCount(2, $task->fresh()->steps);
        $this->actingAs($this->member(['tasks']))->put("/tasks/{$task->id}/steps", ['steps' => []])->assertForbidden();
    }

    /** une routine répétée revient avec ses étapes décochées */
    public function test_recurring_task_keeps_its_steps_unchecked(): void
    {
        $user = $this->member(['tasks']);
        $task = $user->tasks()->create(['title' => 'Sauvegarde', 'recurrence' => 'daily', 'steps' => [['text' => 'Lancer', 'done' => false]]]);
        $this->actingAs($user)->put("/tasks/{$task->id}/steps", ['steps' => [['text' => 'Lancer', 'done' => true]]]);
        $this->assertSame('done', $task->fresh()->status);
        $this->assertSame([['text' => 'Lancer', 'done' => false]], $user->tasks()->where('status', 'todo')->sole()->steps);
    }

    /** archive : à la main, en lot, automatiquement après 7 jours ; restauration et suppression */
    public function test_archive_restore_and_purge(): void
    {
        $user = $this->member(['tasks']);
        $old = $user->tasks()->create(['title' => 'Vieille', 'status' => 'done', 'completed_at' => now()->subDays(8)]);
        $recent = $user->tasks()->create(['title' => 'Récente', 'status' => 'done', 'completed_at' => now(), 'steps' => [['text' => 'A', 'done' => true]]]);
        $open = $user->tasks()->create(['title' => 'Ouverte']);
        $other = $this->member(['tasks']);
        $foreign = $other->tasks()->create(['title' => 'À un autre', 'archived_at' => now()]);

        $this->actingAs($user)->get('/tasks')->assertInertia(fn ($p) => $p->has('tasks', 2)->where('archivedCount', 1));
        $this->actingAs($user)->post("/tasks/{$open->id}/archive");
        $this->actingAs($user)->post('/tasks/archive-done');
        $this->actingAs($user)->get('/tasks')->assertInertia(fn ($p) => $p->has('tasks', 0)->where('archivedCount', 3));
        $this->actingAs($user)->get('/tasks/archive')->assertOk()->assertInertia(fn ($p) => $p->has('tasks', 3)->has('weeks', 12)->where('weeks.11.count', 1));

        $this->actingAs($user)->post("/tasks/{$recent->id}/restore");
        $recent->refresh();
        $this->assertSame(['todo', null, false], [$recent->status, $recent->archived_at, $recent->steps[0]['done']]);

        $this->actingAs($other)->post("/tasks/{$old->id}/restore")->assertForbidden();
        $this->actingAs($user)->delete('/tasks/archive');
        $this->assertSame(['Récente'], $user->tasks()->pluck('title')->all());
        $this->assertNotNull($foreign->fresh());
        $this->actingAs($this->member(['tasks'], 'viewer'))->delete('/tasks/archive')->assertForbidden();
    }

    /** notes : création avec modèle, enregistrement du dessin, liens calculés côté serveur */
    public function test_note_lifecycle_and_links(): void
    {
        $user = $this->member(['notes']);
        $this->actingAs($user)->post('/notes', ['title' => 'Cible', 'color' => 'blue'])->assertRedirect();
        $target = $user->notes()->sole();
        $this->actingAs($user)->post('/notes', ['template' => 'mindmap'])
            ->assertRedirect(route('notes.edit', ['note' => $target->id + 1, 'template' => 'mindmap']));
        $note = $user->notes()->latest('id')->first();
        $this->assertStringStartsWith('Note du ', $note->title);

        $this->actingAs($user)->get("/notes/{$note->id}/edit?template=mindmap")->assertOk()
            ->assertInertia(fn ($p) => $p->where('template', 'mindmap')->has('others', 1));

        $scene = json_encode(['type' => 'excalidraw', 'elements' => [
            ['id' => 'a', 'type' => 'text', 'text' => 'Bonjour', 'link' => "https://sykerio.com/notes/{$target->id}"],
            ['id' => 'b', 'type' => 'rectangle', 'link' => "/notes/{$note->id}"],
            ['id' => 'c', 'type' => 'rectangle', 'link' => '/notes/999999', 'isDeleted' => true],
            ['id' => 'd', 'type' => 'rectangle', 'link' => 'https://exemple.fr'],
        ]]);
        $this->actingAs($user)->putJson("/notes/{$note->id}/scene", ['scene' => $scene, 'text' => 'Bonjour', 'preview' => 'data:image/png;base64,AAAA'])->assertNoContent();
        $note->refresh();
        $this->assertSame([$target->id], $note->links);
        $this->assertSame('Bonjour', $note->text);

        // Une note déjà dessinée ne redemande pas son modèle ; la note liée connaît son lien entrant.
        $this->actingAs($user)->get("/notes/{$note->id}/edit?template=mindmap")->assertInertia(fn ($p) => $p->where('template', null));
        $this->actingAs($user)->get("/notes/{$target->id}/edit")->assertInertia(fn ($p) => $p->has('backlinks', 1)->where('backlinks.0.id', $note->id));

        $this->actingAs($user)->putJson("/notes/{$note->id}/scene", ['scene' => '{"pas":"un dessin"}'])->assertStatus(422);
        $this->actingAs($user)->putJson("/notes/{$note->id}/scene", ['scene' => $scene, 'preview' => 'javascript:alert(1)'])->assertStatus(422);

        $this->actingAs($user)->put("/notes/{$note->id}", ['color' => 'rose', 'pinned' => true]);
        $this->assertSame(['rose', true], [$note->fresh()->color, $note->fresh()->pinned]);
        $this->actingAs($user)->put("/notes/{$note->id}", ['color' => 'fuchsia'])->assertSessionHasErrors('color');
    }

    /** la plateforme demande partout à ne pas être indexée : pages, redirections, erreurs */
    public function test_every_response_asks_not_to_be_indexed(): void
    {
        $login = $this->get('/login')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
        $this->assertStringContainsString('<meta name="robots" content="noindex', $login->getContent());
        $this->get('/')->assertRedirect('/login')->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
        $this->get('/register')->assertNotFound()->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    }

    /** en-têtes de sécurité, jeton sur chaque script en ligne, mots de passe faibles refusés */
    public function test_security_headers_and_password_rules(): void
    {
        config(['app.debug' => false]); // la politique de contenu ne s'applique qu'hors mode débogage, comme en production
        $page = $this->get('/login')->assertOk()
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'same-origin');
        $this->assertFalse($page->headers->has('X-Powered-By'));
        preg_match("/'nonce-([^']+)'/", $page->headers->get('Content-Security-Policy'), $m);
        $this->assertNotEmpty($m[1] ?? null);
        // Chaque script de la page porte le jeton de la politique de contenu.
        preg_match_all('/<script\b[^>]*>/', $page->getContent(), $scripts);
        $this->assertNotEmpty($scripts[0]);
        foreach ($scripts[0] as $tag) {
            $this->assertStringContainsString("nonce=\"{$m[1]}\"", $tag);
        }

        $owner = $this->owner();
        $weak = ['name' => 'X', 'email' => 'x@example.com', 'role' => 'user', 'apps' => []];
        $this->actingAs($owner)->post('/users', $weak + ['password' => 'courtcourt'])->assertSessionHasErrors('password');
        $this->actingAs($owner)->post('/users', $weak + ['password' => 'seulementdeslettres'])->assertSessionHasErrors('password');
        $this->actingAs($owner)->post('/users', $weak + ['password' => 'des-lettres-et-42'])->assertSessionHasNoErrors();
    }

    /** le dossier d'architecture de Sycenter respecte les règles du formulaire et se dépose sans doublon */
    public function test_sycenter_architecture_example(): void
    {
        $owner = $this->owner();
        $this->artisan('sycenter:example-architecture')->assertSuccessful();
        $this->artisan('sycenter:example-architecture')->assertSuccessful();
        $doc = $owner->documents()->sole();
        $example = json_decode(file_get_contents(database_path('examples/sycenter-architecture.json')), true);
        $this->actingAs($owner)->put("/documents/{$doc->id}", $example)->assertSessionHasNoErrors();
        $pdf = $this->actingAs($owner)->get("/documents/{$doc->id}/pdf")->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }

    /** en attente : qui, depuis quand, relance proposée après 3 jours, pastille, sortie à réception */
    public function test_waiting_tasks_and_follow_ups(): void
    {
        $user = $this->member(['tasks']);
        $task = $user->tasks()->create(['title' => 'Correctif éditeur', 'icon' => 'bug', 'hue' => 'rose', 'steps' => [['text' => 'Ticket', 'done' => true], ['text' => 'Tester', 'done' => false]]]);

        $this->actingAs($user)->patch("/tasks/{$task->id}/move", ['status' => 'waiting', 'waiting_for' => 'Éditeur']);
        $task->refresh();
        $this->assertSame(['waiting', 'Éditeur', today()->toDateString(), today()->addDays(3)->toDateString()], [$task->status, $task->waiting_for, $task->waiting_since->toDateString(), $task->follow_up_on->toDateString()]);

        // Cocher une étape ne sort pas de l'attente ; seule la dernière termine la tâche.
        $this->actingAs($user)->put("/tasks/{$task->id}/steps", ['steps' => [['text' => 'Ticket', 'done' => true], ['text' => 'Tester', 'done' => false], ['text' => 'Livrer', 'done' => false]]]);
        $this->assertSame('waiting', $task->fresh()->status);

        // Relance due : elle compte dans la pastille ; « j'ai relancé » la repousse.
        $task->update(['follow_up_on' => today()->subDay()]);
        $this->actingAs($user)->get('/tasks')->assertInertia(fn ($p) => $p->where('apps.0.key', 'tasks')->where('apps.0.badge', 1)->where('tasks.0.icon', 'bug'));
        $this->actingAs($user)->post("/tasks/{$task->id}/follow-up");
        $this->assertSame([1, today()->addDays(3)->toDateString()], [$task->fresh()->follow_ups, $task->fresh()->follow_up_on->toDateString()]);

        // Reçu : retour en cours, la relance disparaît, on garde qui on attendait.
        $this->actingAs($user)->patch("/tasks/{$task->id}/move", ['status' => 'doing']);
        $task->refresh();
        $this->assertSame(['doing', null, 'Éditeur'], [$task->status, $task->follow_up_on, $task->waiting_for]);
        $this->actingAs($user)->post("/tasks/{$task->id}/follow-up")->assertStatus(422);

        $this->actingAs($user)->put("/tasks/{$task->id}", ['title' => 'X', 'status' => 'doing', 'priority' => 'low', 'icon' => 'licorne'])->assertSessionHasErrors('icon');
        $this->actingAs($this->member(['tasks']))->post("/tasks/{$task->id}/follow-up")->assertForbidden();
    }

    /** notes privées, fermées sans le droit, lecture seule pour le rôle dédié */
    public function test_notes_are_private(): void
    {
        $user = $this->member(['notes']);
        $note = $user->notes()->create(['title' => 'Privée']);
        $this->actingAs($this->member(['docs']))->get('/notes')->assertForbidden();
        $other = $this->member(['notes']);
        $this->actingAs($other)->get("/notes/{$note->id}/edit")->assertForbidden();
        $this->actingAs($other)->putJson("/notes/{$note->id}/scene", ['scene' => '{"elements":[]}'])->assertForbidden();
        $this->actingAs($this->owner())->delete("/notes/{$note->id}")->assertForbidden();

        $viewer = $this->member(['notes'], 'viewer');
        $mine = $viewer->notes()->create(['title' => 'Lecture']);
        $this->actingAs($viewer)->get("/notes/{$mine->id}/edit")->assertOk()->assertInertia(fn ($p) => $p->where('canWrite', false));
        $this->actingAs($viewer)->post('/notes', [])->assertForbidden();
        $this->actingAs($viewer)->putJson("/notes/{$mine->id}/scene", ['scene' => '{"elements":[]}'])->assertForbidden();

        $this->actingAs($user)->delete("/notes/{$note->id}")->assertRedirect('/notes');
        $this->assertNull($note->fresh());
    }
}
