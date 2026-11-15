<?php

// Modèles de documents. "defaults" = contenu initial du formulaire.
return [
    'network' => [
        'name' => 'Architecture réseau', 'description' => 'Topologie, VLAN, adressage, sécurité, flux.', 'color' => '#2563EB', 'active' => true,
        'defaults' => [
            'client' => '', 'classification' => 'Interne', 'sites' => 1, 'wan' => 'VPN IPsec', 'topology' => 'Cœur / distribution / accès',
            'vlans' => [['id' => 10, 'name' => 'Utilisateurs', 'subnet' => '10.10.10.0/24', 'gateway' => '10.10.10.1']],
            'firewall' => '', 'remote_access' => 'VPN SSL + MFA', 'dmz' => false, 'nac' => false,
            'flows' => [],
        ],
    ],
    'software' => [
        'name' => 'Architecture logicielle', 'description' => 'Composants, flux, déploiement, décisions.', 'color' => '#7C3AED', 'active' => true,
        'defaults' => [
            'client' => '', 'classification' => 'Interne', 'goal' => '', 'style' => 'Monolithe modulaire', 'users' => '', 'availability' => '99,5 %', 'constraints' => '',
            'components' => [
                ['name' => 'Application web', 'layer' => 'Interface', 'tech' => '', 'role' => ''],
                ['name' => 'API', 'layer' => 'Service', 'tech' => '', 'role' => ''],
                ['name' => 'Base de données', 'layer' => 'Données', 'tech' => '', 'role' => ''],
            ],
            'interfaces' => [], 'hosting' => 'Cloud public', 'environments' => ['Production'], 'auth' => 'Identifiant et mot de passe',
            'encrypt_transit' => true, 'encrypt_rest' => false, 'backup' => '', 'monitoring' => '', 'decisions' => [],
        ],
    ],
    'pra' => ['name' => 'Plan de reprise (PRA)', 'description' => 'RTO/RPO, scénarios, procédures.', 'color' => '#D97706', 'active' => false],
];
