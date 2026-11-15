<?php

namespace Tests\Feature;

use App\Models\Document;
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
}
