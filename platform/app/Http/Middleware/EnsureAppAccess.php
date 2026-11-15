<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAppAccess
{
    public function handle(Request $request, Closure $next, string $app)
    {
        abort_unless($request->user()?->canUse($app), 403);

        return $next($request);
    }
}
