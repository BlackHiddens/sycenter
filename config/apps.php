<?php

// Registre des apps de la plateforme. Ajouter une app = ajouter une entrée ici + ses routes.
return [
    'docs' => ['name' => 'Documents', 'verb' => 'Générer', 'tagline' => 'Documents par formulaire', 'icon' => 'file-text', 'color' => '#2563EB', 'route' => 'documents.index', 'active' => true],
    'tasks' => ['name' => 'Tâches', 'verb' => 'Suivre', 'tagline' => 'Tableau et bonnes pratiques', 'icon' => 'square-check', 'color' => '#7C3AED', 'route' => 'tasks.index', 'active' => true],
    'notes' => ['name' => 'Notes', 'verb' => 'Écrire', 'tagline' => 'Penser en dessinant', 'icon' => 'notebook-pen', 'color' => '#D97706', 'route' => 'notes.index', 'active' => true],
    'access' => ['name' => 'Accès', 'verb' => 'Administrer', 'tagline' => 'Utilisateurs et droits', 'icon' => 'users', 'color' => '#E11D48', 'route' => 'users.index', 'active' => true, 'owner_only' => true],
];
