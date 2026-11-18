<?php

// App Veille. Des flux RSS ou Atom publics, rangés par thème. Ajouter une source = une ligne ici.
// Les teintes de thème sont des couleurs de repère (tuiles, couvertures), jamais des couleurs de texte.
return [
    'themes' => [
        'dev' => ['name' => 'Développement', 'icon' => 'code', 'color' => '#7C3AED'],
        'cyber' => ['name' => 'Cybersécurité', 'icon' => 'shield', 'color' => '#DC2626'],
        'windows' => ['name' => 'Windows', 'icon' => 'monitor', 'color' => '#2563EB'],
    ],

    'sources' => [
        'developpez' => ['name' => 'Developpez.com', 'theme' => 'dev', 'lang' => 'fr', 'url' => 'https://www.developpez.com/index/rss'],
        'lmi-dev' => ['name' => 'Le Monde Informatique', 'theme' => 'dev', 'lang' => 'fr', 'url' => 'https://www.lemondeinformatique.fr/flux-rss/thematique/developpement/rss.xml'],
        'github' => ['name' => 'GitHub Blog', 'theme' => 'dev', 'lang' => 'en', 'url' => 'https://github.blog/feed/'],
        'ms-dev' => ['name' => 'Microsoft for Developers', 'theme' => 'dev', 'lang' => 'en', 'url' => 'https://devblogs.microsoft.com/feed/'],
        'laravel' => ['name' => 'Laravel News', 'theme' => 'dev', 'lang' => 'en', 'url' => 'https://feed.laravel-news.com/'],

        'cert-fr' => ['name' => 'CERT-FR', 'theme' => 'cyber', 'lang' => 'fr', 'url' => 'https://cert.cyber.gouv.fr/feed/'],
        'zataz' => ['name' => 'ZATAZ', 'theme' => 'cyber', 'lang' => 'fr', 'url' => 'https://www.zataz.com/feed/'],
        'lmi-secu' => ['name' => 'Le Monde Informatique', 'theme' => 'cyber', 'lang' => 'fr', 'url' => 'https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml'],
        'bleeping' => ['name' => 'BleepingComputer', 'theme' => 'cyber', 'lang' => 'en', 'url' => 'https://www.bleepingcomputer.com/feed/'],
        'thn' => ['name' => 'The Hacker News', 'theme' => 'cyber', 'lang' => 'en', 'url' => 'https://feeds.feedburner.com/TheHackersNews'],

        'it-connect' => ['name' => 'IT-Connect', 'theme' => 'windows', 'lang' => 'fr', 'url' => 'https://www.it-connect.fr/feed/'],
        'windows-blog' => ['name' => 'Windows Blog', 'theme' => 'windows', 'lang' => 'en', 'url' => 'https://blogs.windows.com/feed/'],
        'neowin' => ['name' => 'Neowin · Microsoft', 'theme' => 'windows', 'lang' => 'en', 'url' => 'https://www.neowin.net/news/rss/microsoft'],
    ],

    'refresh_minutes' => 30, // au-delà, la page relance une récupération en arrière-plan
    'keep_days' => 30,       // les articles plus anciens partent, sauf ceux mis de côté
    'per_source' => 15,      // derniers articles gardés par source à chaque récupération
];
