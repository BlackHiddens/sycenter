<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

/** Gestion des accès : réservée au propriétaire (middleware app:access). */
class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('users/index', [
            'users' => User::orderByRaw("role = 'owner' desc")->orderBy('name')->get(['id', 'name', 'email', 'role', 'apps']),
            'grantable' => collect(config('apps'))->filter(fn ($a) => $a['active'] && empty($a['owner_only']))->map(fn ($a, $k) => ['key' => $k, 'name' => $a['name']])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $v = $request->validate($this->rules() + [
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255|unique:users',
            'password' => ['required', Password::defaults()],
        ]);
        User::create($v + ['email_verified_at' => now()]);

        return back();
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->isOwner(), 403);
        $v = $request->validate($this->rules() + ['password' => ['nullable', Password::defaults()]]);
        $user->update(array_filter($v, fn ($x) => $x !== null));

        return back();
    }

    public function destroy(User $user)
    {
        abort_if($user->isOwner(), 403);
        $user->delete();

        return back();
    }

    private function rules(): array
    {
        $grantable = array_keys(array_filter(config('apps'), fn ($a) => $a['active'] && empty($a['owner_only'])));

        return ['role' => 'required|in:user,viewer', 'apps' => 'present|array', 'apps.*' => Rule::in($grantable)];
    }
}
