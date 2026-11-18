<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * En-têtes de sécurité du navigateur.
 *
 * La politique de contenu (CSP) n'autorise que les scripts du site, et chaque script en ligne porte un jeton
 * (nonce) tiré à chaque page : un script injecté par un pirate ne l'a pas et n'est pas exécuté.
 * Les styles en ligne restent permis (React, Excalidraw et la barre de progression d'Inertia en posent).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();
        $response = $next($request);

        header_remove('X-Powered-By');
        $response->headers->remove('X-Powered-By');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');

        if (app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        // En développement, le serveur Vite sert les scripts depuis un autre port, et la page d'erreur détaillée
        // du mode débogage contient des scripts sans jeton : pas de CSP stricte dans ces deux cas.
        if (! Vite::isRunningHot() && ! config('app.debug')) {
            $response->headers->set('Content-Security-Policy', implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'nonce-{$nonce}'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob:",
                "font-src 'self' data:",
                "connect-src 'self'",
                // Aucun processus d'arrière-plan n'est nécessaire (Excalidraw s'en passe et travaille dans la page).
                // À l'export SVG, Excalidraw essaie aussi ses polices de secours sur esm.sh : refusées ici, sans effet
                // sur le fichier, qui embarque nos propres polices. D'où des messages dans la console, inoffensifs.
                "worker-src 'none'",
                "frame-src 'none'",
                "frame-ancestors 'none'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]));
        }

        return $response;
    }
}
