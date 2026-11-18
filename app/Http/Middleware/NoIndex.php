<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Plateforme privée : aucune page ne doit apparaître dans un moteur de recherche.
 * L'en-tête couvre aussi ce qui n'est pas du HTML (PDF, redirections, erreurs).
 * Les fichiers statiques reçoivent le même en-tête via public/.htaccess.
 */
class NoIndex
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

        return $response;
    }
}
