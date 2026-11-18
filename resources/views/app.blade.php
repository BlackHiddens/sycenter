<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <meta name="theme-color" content="#272727">
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
        <title inertia>{{ config('app.name', 'Sycenter') }}</title>

        {{-- Polices du dessin des notes (Excalidraw), servies par le site plutôt que par un CDN. --}}
        <script nonce="{{ Vite::cspNonce() }}">window.EXCALIDRAW_ASSET_PATH = '/excalidraw/';</script>
        @routes(nonce: Vite::cspNonce())
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
