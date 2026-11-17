<?php

// App Notes. Une couleur sert de thème : on retrouve une note par sa couleur autant que par son dessin.
// Les teintes sont des couleurs de repère (pastilles, bords), jamais des couleurs de texte.
return [
    'colors' => [
        'slate' => ['name' => 'Divers', 'hex' => '#64748B'],
        'blue' => ['name' => 'Projets', 'hex' => '#2563EB'],
        'green' => ['name' => 'Idées', 'hex' => '#059669'],
        'amber' => ['name' => 'Clients', 'hex' => '#D97706'],
        'rose' => ['name' => 'Urgent', 'hex' => '#E11D48'],
        'violet' => ['name' => 'Technique', 'hex' => '#7C3AED'],
    ],

    // Modèles de départ, dessinés par le navigateur à la première ouverture (resources/js/pages/notes/templates.ts).
    'templates' => [
        'blank' => 'Page blanche',
        'mindmap' => 'Carte mentale',
        'flow' => 'Processus',
        'matrix' => 'Matrice 2 × 2',
        'compare' => 'Comparaison',
    ],

    // Taille maximale d'un dessin enregistré, images collées comprises (en kilo-octets).
    'max_scene_kb' => 12288,
];
