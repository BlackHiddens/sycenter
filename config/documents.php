<?php

// Modèles de documents. "defaults" = contenu initial du formulaire ; il complète aussi les documents
// créés avant l'ajout d'un champ (voir DocumentController::data).
return [
    'network' => [
        'name' => 'Architecture réseau', 'description' => 'Topologie, VLAN, adressage, sécurité, flux.', 'color' => '#2563EB', 'active' => true,
        'defaults' => [
            'client' => '', 'classification' => 'Interne', 'goal' => '',
            'sites' => 1, 'wan' => 'VPN IPsec', 'topology' => 'Collapsed core', 'redundancy' => 'Aucune', 'internet' => '',
            'equipment' => [],
            'vlans' => [['id' => 10, 'name' => 'Utilisateurs', 'subnet' => '10.10.10.0/24', 'gateway' => '10.10.10.1']],
            'dhcp' => '', 'dns' => '',
            'firewall' => '', 'remote_access' => 'VPN SSL + MFA', 'wifi' => 'Aucun', 'dmz' => false, 'nac' => false, 'guest' => false,
            'flows' => [],
            'monitoring' => '', 'backup' => '', 'naming' => '', 'risks' => [],
        ],
    ],
    'software' => [
        'name' => 'Architecture logicielle', 'description' => 'Composants, flux, déploiement, décisions.', 'color' => '#7C3AED', 'active' => true,
        'defaults' => [
            'client' => '', 'classification' => 'Interne', 'goal' => '', 'scope' => '', 'actors' => [],
            'style' => 'Monolithe modulaire', 'users' => '', 'performance' => '', 'availability' => '99,5 %', 'constraints' => '',
            'components' => [
                ['name' => 'Application web', 'layer' => 'Interface', 'tech' => '', 'role' => ''],
                ['name' => 'API', 'layer' => 'Service', 'tech' => '', 'role' => ''],
                ['name' => 'Base de données', 'layer' => 'Données', 'tech' => '', 'role' => ''],
            ],
            'interfaces' => [], 'entities' => [], 'retention' => '',
            'hosting' => 'Cloud public', 'environments' => ['Production'], 'auth' => 'Identifiant et mot de passe',
            'encrypt_transit' => true, 'encrypt_rest' => false, 'cicd' => '', 'backup' => '', 'recovery' => '', 'monitoring' => '',
            'decisions' => [], 'risks' => [],
        ],
    ],
    'pra' => ['name' => 'Plan de reprise (PRA)', 'description' => 'RTO/RPO, scénarios, procédures.', 'color' => '#D97706', 'active' => false],
];
