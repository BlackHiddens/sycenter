# Sycenter

Plateforme personnelle de Kevin (marque : Sykerio). Un seul espace, plusieurs petites apps derrière un
lanceur d'icônes. En ligne sur https://sykerio.com. Kevin est le seul propriétaire ; lui seul crée des comptes.

## Travailler avec Kevin

- Écrire en français, le tutoyer, être franc : dire quand on n'est pas d'accord ou quand quelque chose n'est pas vérifié.
- Il valide sur le rendu. Il attend une interface très soignée, graphique, avec peu de texte.
- Il ne lit pas le code : expliquer ce que ça change pour lui, pas comment c'est fait.
- Toute l'interface est en français. Les pages de profil et de réinitialisation du mot de passe du kit sont encore en anglais.

## Pile technique

Laravel 12 (PHP 8.3) · Inertia 2 · React 19 + TypeScript · Tailwind 4 · composants shadcn (`resources/js/components/ui`) ·
Dompdf pour les PDF · MySQL en production, SQLite en mémoire pour les tests (PHPUnit, pas Pest).
Base de départ : `laravel/react-starter-kit`. L'ancien starter Metronic / Laravel 10 a été supprimé à la demande de Kevin.

```bash
composer install && npm install && cp .env.example .env && php artisan key:generate
php artisan migrate && php artisan sycenter:owner mail@exemple.fr "Nom"   # compte propriétaire
composer run dev          # serveur + Vite
php artisan test          # 38 tests, tous dans tests/Feature (PlatformTest couvre la plateforme)
npm run contrast          # contraste WCAG des thèmes, doit rester à 100 %
npx tsc --noEmit && vendor/bin/pint
```

## Plateforme

- **Registre d'apps** : `config/apps.php`. Ajouter une app = une entrée (nom, icône, couleur, route) + ses routes sous le
  middleware `app:<clé>` (`EnsureAppAccess`). `active => false` l'affiche en « à venir ».
- **Droits** (`app/Models/User.php`) : `role` = `owner` | `user` | `viewer`, et `apps` = liste JSON des clés autorisées.
  `canUse(app)` : le propriétaire a tout ; `owner_only` (l'app Accès) lui est réservée. `canWrite()` est faux pour `viewer`,
  qui consulte et télécharge sans rien modifier. Pas de paquet de permissions : c'est volontairement simple.
- **Pas d'inscription publique** : la route `/register` n'existe pas. Le propriétaire ne peut ni être modifié, ni supprimé,
  ni supprimer son propre compte.
- **Données partagées avec React** (`HandleInertiaRequests`) : `auth.user`, et `apps` (ce que l'utilisateur voit, avec `href`
  nul si l'app est à venir, et `badge` = nombre d'éléments en attente, utilisé par Tâches).
- **Mise en page** (`resources/js/layouts/app-layout.tsx`) : rail d'icônes à gauche (une par app, thème, compte), panneau
  secondaire optionnel propre à l'app (`panel`, `panelTitle`), puis en-tête (`title`, `actions`) et contenu.
  Briques visuelles communes dans `resources/js/components/sy.tsx` (`Pill`, `IconTile`, `PanelSection`, classes de tableau).

## Design

Inspiré du template ReUI « clinic » (shadcn) : palette neutre, cartes à coins de 14 px, la couleur est réservée aux icônes
d'app et aux états. Ne pas copier le code de ce template, seulement son langage visuel.

- **Trois thèmes** dans `resources/css/app.css` : `:root` (clair), `.dark`, `.sykerio`. Choix mémorisé par appareil
  (`use-appearance.tsx`), bouton palette dans le rail.
- **Sykerio** = rail anthracite `#272727` + contenu clair + vert de marque `#00A478` (couleurs du logo,
  `public/images/sykerio.png`). Le vert exact ne passe pas en texte blanc sur fond clair (3,2:1) : sur fond clair on
  utilise `#007A59`. Kevin est au courant.
- **Règle des 100 %** : toute couleur passe par un jeton du thème, et `npm run contrast` (`scripts/contrast.mjs`) doit
  rester à 60/60. Ajouter un jeton = l'ajouter dans les trois thèmes et dans le script. Ne pas coder de couleur en dur
  dans un composant, sauf les couleurs d'icônes d'app (non textuelles).
- Tout écran doit tenir à 400 px de large sans défilement horizontal. Piège récurrent : une grille CSS sans colonne
  explicite s'élargit avec son contenu ; mettre `grid-cols-[minmax(0,1fr)]` et `min-w-0`.

## App Documents

Un document = une ligne `documents` (`type`, `title`, `version`, `status` brouillon/généré, `data` JSON libre).
L'assistant (`resources/js/pages/documents/edit.tsx`) est générique : étape Contexte, étapes du modèle, étape Génération.
Le brouillon est enregistré à chaque changement d'étape ; la validation serveur bloque le passage à l'étape suivante.

Un modèle de document, c'est quatre endroits à garder alignés :

1. `config/documents.php` : nom, couleur, `active`, et `defaults` (contenu initial). Les `defaults` complètent aussi les
   documents créés avant l'ajout d'un champ (`DocumentController::data`), donc **tout nouveau champ doit y figurer**.
2. `DocumentController::rules()` : règles de validation et libellés français par type.
3. `resources/js/pages/documents/forms/<type>.tsx` : étapes, phrase d'introduction par étape, champs, aperçu en direct.
   À déclarer dans `forms` de `edit.tsx`. Composants de champ dans `components/doc-form.tsx` ; chaque champ a un `hint`
   (aide affichée sous le champ : Kevin veut comprendre quoi écrire sans deviner).
4. `resources/views/documents/<type>.blade.php` : le PDF, qui étend `_layout.blade.php` (page de garde avec logo, sommaire,
   fiche, en-tête et pied de page) et utilise `_h`, `_kv`, `_rows`. Dompdf : pas de flexbox ni de grille, mise en page
   par tableaux et `inline-block` ; police DejaVu Sans.

Modèles actifs : `network` (architecture réseau, avec schéma de topologie) et `software` (architecture logicielle, avec
schéma en couches). `pra` est déclaré mais inactif. Le contenu des formulaires est une proposition de Claude : Kevin n'a
pas fourni de trame et a demandé de ne pas insister là-dessus pour l'instant. Niveau visé : couvrir tous les aspects
d'un dossier d'architecture sans entrer dans le détail. Sortie PDF seulement ; l'export DOCX n'existe pas.

## App Tâches

Personnelle : chacun ne voit que ses tâches et ses fiches, propriétaire compris. Kevin se décrit comme peu structuré et
oublie les étapes de traitement : l'app doit montrer **où il en est** d'un coup d'œil, par le dessin plus que par le texte.

- **Étapes** (`steps`, JSON `[{text, done}]` sur la tâche ; dessin dans `components/task-steps.tsx`) : barre segmentée sur
  chaque carte, et sous la barre la **prochaine étape**, cochable d'un clic. Dans la fenêtre d'une tâche, un parcours
  vertical (pastilles reliées) enregistré à chaque clic par `tasks.steps`. Une fiche de bonnes pratiques peut être
  importée comme liste d'étapes (une ligne = une étape, numéros et puces retirés).
- **La tâche avance seule** (`Task::statusFromSteps`, recopiée côté React pour l'affichage immédiat) : une étape cochée →
  En cours ; toutes cochées → Terminé ; tout décoché depuis Terminé → À faire. Le formulaire de la tâche n'envoie jamais
  les étapes (`update()` les ignore) pour ne pas écraser ce qui a été coché entre-temps.
- **Tableau** (`tasks/index.tsx`, `TaskController`) : colonnes À faire / En cours / Terminé, glisser-déposer avec ordre
  enregistré (`tasks.move`), flèches et pastille ronde pour la même chose au clavier ou sur mobile, ajout rapide.
  Au-delà de 3 tâches En cours, la colonne affiche un avertissement (`MAX_DOING`).
- **Carte « Maintenant »** : retards, tâches entamées, échéances du jour, priorités hautes, avec leur prochaine étape.
- **Répétition** : une tâche `recurrence` (daily/weekly/monthly) terminée crée la suivante, étapes décochées, et perd sa
  propre répétition (`settle()`), ce qui évite les doublons si on la rouvre.
- **Archive** (`tasks/archive.tsx`) : une tâche y est si `archived_at` est rempli (bouton sur la carte, la fenêtre, ou
  « tout archiver » sur la colonne Terminé) ou si elle est terminée depuis plus de 7 jours (`Task::ARCHIVE_AFTER_DAYS`,
  scopes `archived` / `onBoard`). Depuis l'archive : remettre à faire (étapes décochées), supprimer, ou tout vider.
  Graphique des tâches terminées sur 12 semaines.
- **Série** : jours consécutifs avec au moins une tâche terminée, plus un graphique sur 7 jours.
- **Bonnes pratiques** (`tasks/practices.tsx`, `PracticeController`) : fiches par catégorie, recherche, copie. Révision
  espacée : la fiche due s'affiche sur le tableau, réponse masquée ; « Je savais » double l'intervalle (60 jours au plus),
  « À revoir » la ramène au lendemain (`review_at`, `interval_days`).
- **Pastille** sur le rail et l'accueil : tâches du tableau à échéance atteinte + fiches à réviser.

Fuseau de l'application : Europe/Paris (les séries et échéances en dépendent).

## App Accès

`UserController`, réservée au propriétaire : créer un compte (il saisit lui-même le mot de passe, aucun e-mail n'est
envoyé), choisir rôle et apps, retirer un compte. L'envoi d'e-mails n'est pas configuré (`MAIL_MAILER=log`), donc
« mot de passe oublié » ne fonctionne pas en production.

## Déploiement (Hostinger mutualisé)

Compte `u222444226`, site `sykerio.com`, racine `public_html`, PHP 8.3, base MySQL `u222444226_appcenter`
(hôte `127.0.0.1` depuis l'application). Pas de SSH ni de Node sur le serveur : on construit ici et on envoie.
Tout passe par le connecteur Hostinger (`mcp__Hostinger_Connector__search` puis `execute`). Il n'y a **pas** de
déploiement automatique : pousser sur GitHub ne met rien en ligne.

- L'application entière vit dans `public_html` ; le `.htaccess` racine renvoie tout vers `public/` et bloque les fichiers
  cachés. Vérifier après tout changement que `https://sykerio.com/.env` répond 403.
- Le `.env` de production n'existe que sur le serveur et n'est lisible par aucun outil. **Ne jamais** redéployer avec
  `hosting_websites_deploy-static-site-archive` : il écrase tout le dossier, `.env` compris. Cette opération n'a servi
  qu'à la première installation.
- **Mettre à jour** : `npm run build`, puis envoyer fichier par fichier (protocole TUS, URL donnée par
  `hosting_files_generate-upload-url`) tout `public/build/` et les fichiers PHP, vues, config, migrations et routes
  modifiés depuis le dernier déploiement, `public/build/manifest.json` en dernier. `vendor/` n'est à renvoyer que si
  `composer.lock` change (installer avec `--no-dev`, sans les dossiers `.git`).
- **Lancer une commande artisan** (migrations) : créer une tâche planifiée `* * * * *` avec
  `/opt/alt/php83/usr/bin/php /home/u222444226/domains/sykerio.com/public_html/artisan migrate --force --no-interaction`,
  lire sa sortie (`hosting_cron-jobs_output`) après une minute, puis **la supprimer aussitôt**.
- Finir par `hosting_cache_clear` : le CDN Hostinger a déjà servi une vieille page.
- L'environnement cloud « sycenter » autorise les hôtes nécessaires (`sykerio.com`, `srv2121-files.hstgr.io`,
  `codeload.github.com`, `api.github.com`). Sans les deux derniers, Composer retombe sur des clones git très lents.
- Claude n'a pas le mot de passe du compte de Kevin : impossible de tester connecté en production. Vérifier en local
  dans un navigateur (Playwright), puis en production ce qui est accessible sans connexion, et le dire à Kevin.

## Secrets

Aucun secret dans le dépôt, les messages de commit ou ce fichier. Le mot de passe de la base a transité par une
conversation : Kevin a prévu de le changer dans hPanel ; il faudra alors renvoyer un `.env` complet sur le serveur
(nouvelle `APP_KEY` acceptable : elle ne fait que déconnecter les sessions).

## État et suite

- En ligne : plateforme, Documents (réseau, logiciel), Tâches, Accès. Branche de travail `claude/festive-wozniak-usldmb` ;
  `main` contient encore l'ancien Metronic tant que rien n'est fusionné.
- À venir : app Notes « façon Trame » (mise de côté par Kevin pour l'instant), modèle PRA, export DOCX, traduction des
  pages de profil, envoi d'e-mails.
