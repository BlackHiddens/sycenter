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
            'document' => $document->only('id', 'title', 'version', 'status', 'type', 'data'),
            'typeName' => config("documents.{$document->type}.name"),
            'canWrite' => $request->user()->canWrite(),
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $this->guard($request, $document, write: true);
        $v = $request->validate([
            'title' => 'required|string|max:120',
            'version' => ['required', 'regex:/^\d+(\.\d+){0,2}$/'],
            'data.client' => 'nullable|string|max:120',
            'data.classification' => 'required|in:Public,Interne,Confidentiel',
            'data.sites' => 'required|integer|min:1|max:500',
            'data.wan' => 'required|string|max:60',
            'data.topology' => 'required|string|max:60',
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
        ], [], [
            'title' => 'nom du projet', 'data.vlans.*.id' => 'numéro de VLAN', 'data.vlans.*.name' => 'nom du VLAN',
            'data.vlans.*.subnet' => 'sous-réseau', 'data.vlans.*.gateway' => 'passerelle', 'data.sites' => 'nombre de sites',
            'data.flows.*.source' => 'source', 'data.flows.*.destination' => 'destination', 'data.flows.*.service' => 'service',
        ]);
        $document->update(['title' => $v['title'], 'version' => $v['version'], 'data' => $v['data'], 'status' => 'draft']);

        return back();
    }

    public function pdf(Request $request, Document $document)
    {
        $this->guard($request, $document);
        if ($request->user()->canWrite()) {
            $document->update(['status' => 'generated']);
        }

        return Pdf::loadView("documents.{$document->type}", ['doc' => $document, 'd' => $document->data])
            ->download(Str::slug($document->title).'-v'.$document->version.'.pdf');
    }

    public function destroy(Request $request, Document $document)
    {
        $this->guard($request, $document, write: true);
        $document->delete();

        return to_route('documents.index');
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
}
