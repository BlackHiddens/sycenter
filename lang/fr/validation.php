<?php

// Messages des règles utilisées par la plateforme.
return [
    'required' => 'Le champ « :attribute » est obligatoire.',
    'present' => 'Le champ « :attribute » est obligatoire.',
    'string' => 'Le champ « :attribute » doit être un texte.',
    'integer' => 'Le champ « :attribute » doit être un nombre entier.',
    'boolean' => 'Le champ « :attribute » doit être vrai ou faux.',
    'array' => 'Le champ « :attribute » doit être une liste.',
    'email' => 'Le champ « :attribute » doit être une adresse e-mail valide.',
    'ipv4' => 'Le champ « :attribute » doit être une adresse IPv4 valide, par exemple 10.10.20.1.',
    'regex' => 'Le format du champ « :attribute » est invalide.',
    'in' => 'La valeur du champ « :attribute » n\'est pas autorisée.',
    'distinct' => 'Le champ « :attribute » contient une valeur en double.',
    'unique' => 'Cette valeur est déjà utilisée pour « :attribute ».',
    'confirmed' => 'La confirmation du champ « :attribute » ne correspond pas.',
    'current_password' => 'Le mot de passe est incorrect.',
    'lowercase' => 'Le champ « :attribute » doit être en minuscules.',
    'min' => [
        'numeric' => 'Le champ « :attribute » doit valoir au moins :min.',
        'string' => 'Le champ « :attribute » doit contenir au moins :min caractères.',
        'array' => 'Le champ « :attribute » doit contenir au moins :min éléments.',
    ],
    'max' => [
        'numeric' => 'Le champ « :attribute » ne doit pas dépasser :max.',
        'string' => 'Le champ « :attribute » ne doit pas dépasser :max caractères.',
        'array' => 'Le champ « :attribute » ne doit pas contenir plus de :max éléments.',
    ],
    'password' => [
        'letters' => 'Le mot de passe doit contenir au moins une lettre.',
        'mixed' => 'Le mot de passe doit contenir au moins une majuscule et une minuscule.',
        'numbers' => 'Le mot de passe doit contenir au moins un chiffre.',
        'symbols' => 'Le mot de passe doit contenir au moins un symbole.',
        'uncompromised' => 'Ce mot de passe apparaît dans une fuite de données connue. Choisis-en un autre.',
    ],
    'custom' => [
        'data.vlans.*.subnet' => ['regex' => 'Le sous-réseau doit être en notation CIDR, par exemple 10.10.20.0/24.'],
        'version' => ['regex' => 'La version doit être de la forme 1.0 ou 1.2.3.'],
    ],
    'attributes' => ['name' => 'nom', 'email' => 'e-mail', 'password' => 'mot de passe', 'role' => 'rôle', 'apps' => 'apps autorisées', 'version' => 'version'],
];
