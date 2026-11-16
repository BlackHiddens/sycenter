<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('documents/index', [
            'documents' => Document::with('user:id,name')
                ->when(! $user->isOwner(), fn ($q) => $q->where('user_id', $user->id))
                ->latest('updated_at')->get()
                ->map(fn (Document $d) => [
                    'id' => $d->id, 'title' => $d->title, 'type' => config("documents.{$d->type}.name"), 'version' => $d->version,
                    'status' => $d->status, 'updated_at' => $d->updated_at->toIso8601String(), 'author' => $d->user->name,
                ]),
            'types' => $this->types(),
            'canWrite' => $user->canWrite(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->canWrite(), 403);
        $type = $request->validate(['type' => ['required', Rule::in(array_keys(array_filter(config('documents'), fn ($t) => $t['active'])))]])['type'];
        $doc = $request->user()->documents()->create([
            'type' => $type, 'title' => 'Nouveau document', 'data' => config("documents.$type.defaults"),
        ]);

        return to_route('documents.edit', $doc);
    }

    public function edit(Request $request, Document $document)
    {
        $this->guard($request, $document);

        return Inertia::render('documents/edit', [
            'document' => ['data' => $this->data($document)] + $document->only('id', 'title', 'version', 'status', 'type'),
            'typeName' => config("documents.{$document->type}.name"),
            'canWrite' => $request->user()->canWrite(),
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $this->guard($request, $document, write: true);
        [$rules, $names] = $this->rules($document->type);
        $v = $request->validate($rules, [], $names);
        $document->update(['title' => $v['title'], 'version' => $v['version'], 'data' => $v['data'], 'status' => 'draft']);

        return back();
    }

    public function pdf(Request $request, Document $document)
    {
        $this->guard($request, $document);
        if ($request->user()->canWrite()) {
            $document->update(['status' => 'generated']);
        }

        return Pdf::loadView("documents.{$document->type}", ['doc' => $document, 'd' => $this->data($document)])
            ->download(Str::slug($document->title).'-v'.$document->version.'.pdf');
    }

    public function destroy(Request $request, Document $document)
    {
        $this->guard($request, $document, write: true);
        $document->delete();

        return to_route('documents.index');
    }

    /** Contenu du document, complété par les valeurs par défaut des champs ajoutés depuis sa création. */
    private function data(Document $document): array
    {
        return array_merge(config("documents.{$document->type}.defaults"), $document->data);
    }

    private function guard(Request $request, Document $document, bool $write = false): void
    {
        $user = $request->user();
        abort_unless($user->isOwner() || $document->user_id === $user->id, 403);
        abort_if($write && ! $user->canWrite(), 403);
    }

    private function types(): array
    {
        return collect(config('documents'))->map(fn ($t, $k) => ['key' => $k, 'name' => $t['name'], 'description' => $t['description'], 'color' => $t['color'], 'active' => $t['active']])->values()->all();
    }

    /** Règles de validation et libellés des champs, selon le modèle de document. */
    private function rules(string $type): array
    {
        $common = [
            'title' => 'required|string|max:120',
            'version' => ['required', 'regex:/^\d+(\.\d+){0,2}$/'],
            'data.client' => 'nullable|string|max:120',
            'data.goal' => 'nullable|string|max:2000',
            'data.classification' => 'required|in:Public,Interne,Confidentiel',
        ];

        return match ($type) {
            'network' => [$common + [
                'data.sites' => 'required|integer|min:1|max:500',
                'data.wan' => 'required|string|max:60',
                'data.topology' => 'required|string|max:60',
                'data.redundancy' => 'nullable|string|max:60',
                'data.internet' => 'nullable|string|max:120',
                'data.equipment' => 'array|max:100',
                'data.equipment.*.role' => 'required|string|max:40',
                'data.equipment.*.model' => 'nullable|string|max:80',
                'data.equipment.*.qty' => 'required|integer|min:1|max:9999',
                'data.equipment.*.location' => 'nullable|string|max:80',
                'data.dhcp' => 'nullable|string|max:160',
                'data.dns' => 'nullable|string|max:160',
                'data.wifi' => 'nullable|string|max:60',
                'data.guest' => 'boolean',
                'data.monitoring' => 'nullable|string|max:200',
                'data.backup' => 'nullable|string|max:200',
                'data.naming' => 'nullable|string|max:200',
                'data.risks' => 'array|max:50',
                'data.risks.*.risk' => 'required|string|max:200',
                'data.risks.*.mitigation' => 'nullable|string|max:300',
                'data.vlans' => 'array|max:200',
                'data.vlans.*.id' => 'required|integer|min:1|max:4094|distinct',
                'data.vlans.*.name' => 'required|string|max:60',
                'data.vlans.*.subnet' => ['required', 'regex:/^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[0-2])$/'],
                'data.vlans.*.gateway' => 'required|ipv4',
                'data.firewall' => 'nullable|string|max:120',
                'data.remote_access' => 'required|string|max:60',
                'data.dmz' => 'boolean',
                'data.nac' => 'boolean',
                'data.flows' => 'array|max:300',
                'data.flows.*.source' => 'required|string|max:60',
                'data.flows.*.destination' => 'required|string|max:60',
                'data.flows.*.service' => 'required|string|max:60',
                'data.flows.*.action' => 'required|in:Autoriser,Bloquer',
            ], [
                'title' => 'nom du projet', 'data.vlans.*.id' => 'numéro de VLAN', 'data.vlans.*.name' => 'nom du VLAN',
                'data.vlans.*.subnet' => 'sous-réseau', 'data.vlans.*.gateway' => 'passerelle', 'data.sites' => 'nombre de sites',
                'data.flows.*.source' => 'source', 'data.flows.*.destination' => 'destination', 'data.flows.*.service' => 'service',
                'data.equipment.*.qty' => 'quantité', 'data.equipment.*.role' => 'rôle', 'data.risks.*.risk' => 'risque',
            ]],
            'software' => [$common + [
                'data.scope' => 'nullable|string|max:2000',
                'data.actors' => 'array|max:50',
                'data.actors.*.name' => 'required|string|max:80',
                'data.actors.*.need' => 'nullable|string|max:200',
                'data.performance' => 'nullable|string|max:120',
                'data.entities' => 'array|max:100',
                'data.entities.*.name' => 'required|string|max:80',
                'data.entities.*.description' => 'nullable|string|max:200',
                'data.entities.*.sensitivity' => 'required|in:Publique,Interne,Personnelle,Sensible',
                'data.retention' => 'nullable|string|max:200',
                'data.cicd' => 'nullable|string|max:200',
                'data.recovery' => 'nullable|string|max:200',
                'data.risks' => 'array|max:50',
                'data.risks.*.risk' => 'required|string|max:200',
                'data.risks.*.impact' => 'required|in:Faible,Moyen,Fort',
                'data.risks.*.mitigation' => 'nullable|string|max:300',
                'data.style' => 'required|string|max:60',
                'data.users' => 'nullable|string|max:120',
                'data.availability' => 'required|string|max:20',
                'data.constraints' => 'nullable|string|max:2000',
                'data.components' => 'array|max:100',
                'data.components.*.name' => 'required|string|max:60|distinct',
                'data.components.*.layer' => 'required|in:Interface,Service,Données,Externe',
                'data.components.*.tech' => 'nullable|string|max:80',
                'data.components.*.role' => 'nullable|string|max:200',
                'data.interfaces' => 'array|max:200',
                'data.interfaces.*.source' => 'required|string|max:60',
                'data.interfaces.*.destination' => 'required|string|max:60',
                'data.interfaces.*.protocol' => 'required|string|max:60',
                'data.interfaces.*.purpose' => 'nullable|string|max:200',
                'data.hosting' => 'required|string|max:60',
                'data.environments' => 'array',
                'data.environments.*' => 'in:Développement,Recette,Préproduction,Production',
                'data.auth' => 'required|string|max:60',
                'data.encrypt_transit' => 'boolean',
                'data.encrypt_rest' => 'boolean',
                'data.backup' => 'nullable|string|max:200',
                'data.monitoring' => 'nullable|string|max:200',
                'data.decisions' => 'array|max:100',
                'data.decisions.*.decision' => 'required|string|max:200',
                'data.decisions.*.reason' => 'nullable|string|max:400',
            ], [
                'title' => 'nom du projet', 'data.components.*.name' => 'nom du composant', 'data.components.*.layer' => 'couche',
                'data.interfaces.*.source' => 'source', 'data.interfaces.*.destination' => 'destination', 'data.interfaces.*.protocol' => 'protocole',
                'data.decisions.*.decision' => 'décision', 'data.style' => 'style d\'architecture',
                'data.actors.*.name' => 'acteur', 'data.entities.*.name' => 'donnée', 'data.risks.*.risk' => 'risque',
            ]],
        };
    }
}
