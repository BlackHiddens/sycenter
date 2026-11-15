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
    'software' => ['name' => 'Architecture logicielle', 'description' => 'Composants, données, déploiement.', 'color' => '#7C3AED', 'active' => false],
    'pra' => ['name' => 'Plan de reprise (PRA)', 'description' => 'RTO/RPO, scénarios, procédures.', 'color' => '#D97706', 'active' => false],
];
