# Kinan orchestre : protocole de benchmark

État : **aucun résultat de comparaison n'existe à ce jour** (seule une mesure observationnelle des conversations existe : section 6 bis). Ce document fixe la méthode ; les tableaux de résultats sont volontairement vides. Tant qu'ils ne sont pas remplis, aucun chiffre d'économie n'est annoncé (voir `ROADMAP.md`, phase 2). Les mauvais résultats seront publiés comme les bons.

## 1. Question et hypothèses

Question : à résultat équivalent, la délégation de Kinan (juge Sonnet, agents Haiku / Sonnet / Opus choisis selon la tâche) consomme-t-elle moins de jetons, coûte-t-elle moins cher et prend-elle moins de temps qu'un modèle unique ?

Hypothèse à tester, pas à croire : déléguer les lectures à Haiku coûte moins cher, mais le juge et ses relectures ajoutent des jetons, et une mauvaise délégation peut coûter plus qu'elle ne rapporte (surcoût fixe, aller-retour, reprise après échec).

## 2. Conditions comparées

| Code | Condition | Lancement |
|---|---|---|
| A | Un modèle unique, le plus fort utilisé en pratique, sans le plugin | `claude --model <modèle>` dans une session sans le plugin |
| B | Un modèle unique, le plus petit qui réussit la tâche en moyenne | idem, autre modèle |
| K | Kinan : plugin installé, configuration par défaut | `claude --agent kinan-orchestre:kinan` |

- Même version de Claude Code, même machine, mêmes réglages d'effort et de permissions (consigner la commande exacte et la version dans le journal d'essai).
- A et B sont indispensables : comparer K seulement à un modèle faible, ou seulement à un modèle fort, donnerait un résultat trompeur.
- Une variante K sans le hook de rappel (`rappel-relais.js`) peut isoler son effet ; elle n'est pas obligatoire.

## 3. Jeux de tâches

Trois jeux, chacun répété **N fois par condition** (N fixé avant de lancer, au moins 5 ; l'ordre des conditions est tiré au sort). Chaque tâche est définie avant l'essai par une fiche : identifiant, énoncé exact du brief, état initial du dépôt (un commit), critère de réussite vérifiable sans juge humain quand c'est possible, rubrique de qualité sinon.

| Jeu | Nature | Exemples de types de tâches (à écrire dans les fiches) |
|---|---|---|
| Simple | Une action localisée, résultat vérifiable par une commande | corriger une faute dans un texte, renommer un symbole, lire des fichiers et répondre à une question factuelle |
| Intermédiaire | Plusieurs fichiers, une vérification automatique | ajouter une fonction avec son test, produire une page à partir d'une spec, corriger un bug reproductible par un test |
| Complexe | Raisonnement long, ou plusieurs essais probables | bug qui résiste, refonte touchant plusieurs modules, spec puis exécution |

Les tâches sont tirées de dépôts réels ou de dépôts de test publics, jamais écrites pour favoriser une condition. Un dépôt est remis à l'état initial avant chaque essai (`git reset --hard` dans une copie jetable, jamais dans le dépôt de travail).

## 4. Mesures

| Mesure | Source | Remarque |
|---|---|---|
| Jetons d'entrée, de sortie, cache lu, cache créé, par modèle | journaux `~/.claude/projects/<projet>/*.jsonl` et `subagents/` | un message occupe plusieurs lignes : dédoublonner par `message.id` |
| Nombre d'appels | idem (messages assistant) | séparer conversation principale et sous-agents (`isSidechain`) |
| Coût | jetons x tarif du modèle | tarifs relevés sur la page officielle du fournisseur à la date de l'essai, notés dans le journal d'essai ; jamais repris de mémoire |
| Durée | premier et dernier horodatage du journal | durée réelle, attentes d'autorisation comprises : les noter |
| Délégations, escalades | `~/.kinan-os/taches.json` (début, fin, agent) | une escalade = reprise d'une mission par un modèle plus fort |
| Échecs d'outils | `historique.jsonl` (état `erreur`) | lissés sur 60 s par `etat.js` : sous-estiment les échecs réels |
| Réussite | critère automatique de la fiche | binaire : réussi ou non, sans demi-point |
| Qualité à résultat équivalent | rubrique, notée en aveugle | l'évaluateur ne sait pas quelle condition a produit la copie ; rubrique figée avant l'essai |

Cache : le coût dépend fortement de la lecture du cache, qui varie d'un essai à l'autre. Reporter les quatre types de jetons, pas un total unique, et ne comparer les coûts qu'avec les mêmes tarifs.

## 5. Protocole d'un essai

1. Restaurer le dépôt à l'état initial de la fiche ; ouvrir une conversation neuve (pas de reprise, pas de contexte hérité).
2. Lancer la condition avec la commande consignée ; coller le brief tel quel, sans l'enrichir selon la condition.
3. Laisser aller jusqu'à la fin. Ne pas intervenir, sauf pour une autorisation de permission (la consigner). Interrompre à un plafond fixé d'avance (durée ou nombre de tours) et marquer « échec par plafond ».
4. Archiver : journaux `.jsonl` de la conversation et des sous-agents, `~/.kinan-os/` (copie), diff produit, sortie du critère automatique.
5. Extraire les totaux : `node outils/jetons-journaux.js <dossier des journaux de l'essai> --tarifs tarifs.json` (voir 6).
6. Noter la qualité en aveugle, puis remplir une ligne du tableau.

Biais à surveiller : effet d'ordre et de cache d'un essai à l'autre (tirage au sort, conversations neuves), variance du modèle (d'où N répétitions), tâches choisies après coup, essais écartés sans règle écrite (tout essai lancé est compté).

## 6. Ce qui se mesure déjà, sans coût

- **Totaux de jetons et d'appels d'un journal** : `node outils/jetons-journaux.js <fichier.jsonl | dossier> [--tarifs tarifs.json]`. Sans `--tarifs`, aucun coût n'est affiché ; le fichier de tarifs (USD par million de jetons) est à remplir par vous, aucun tarif n'est intégré. Vérifié sur des journaux synthétiques seulement (dédoublonnage, séparation sous-agents, calcul) ; pas encore confronté à un vrai essai.
- **Tableau de bord, onglet Gestion** : jetons et coût estimé par modèle (`kinan-dashboard/gestion-ipc.js:183`), tarifs réglables dans `reglages.json`, et « coche verte » sur 3 h (`economies.js`). Mêmes sources que ci-dessus.
- **Durée des hooks** : `node bench/mesurer-hooks.js [N]` lance chaque hook N fois avec un événement simulé, dans un dossier d'état temporaire ; 0 jeton, 0 réseau.
- **Texte ajouté au contexte par le plugin** : à `SessionStart`, 7 lignes, environ 1,3 ko avec la configuration par défaut (`hooks/session.js`) ; le prompt du juge `agents/kinan.md` fait 5,2 ko. C'est un surcoût fixe de la condition K, à inclure dans ses jetons (il y est déjà, puisque les journaux le comptent).

Mesure faite le 2026-11-10 (Windows 11, Node v26.13.0, 30 lancements par ligne, événements simulés, dossier d'état temporaire) :

| Hook | Médiane | Min – max |
|---|---|---|
| `node -e 0` (démarrage de Node seul) | 25 ms | 24 – 28 ms |
| `session.js` (SessionStart) | 31 ms | 30 – 34 ms |
| `etat.js` (UserPromptSubmit) | 36 ms | 35 – 40 ms |
| `etat.js` (PreToolUse Agent) | 38 ms | 36 – 40 ms |
| `verrou-fichiers.js` (PreToolUse Edit) | 34 ms | 32 – 37 ms |
| `rappel-relais.js` (sans journal de conversation) | 31 ms | 29 – 34 ms |

Lecture : un hook coûte quelques dizaines de millisecondes, dont environ 25 ms de démarrage de Node. Ces valeurs viennent d'une machine, sur un état vide : `etat.js` grossit avec `historique.jsonl` (2 000 lignes au plus), et `rappel-relais.js` lit jusqu'à 512 Ko du journal réel. Ne pas en déduire un temps par tâche.

## 6 bis. Mesure observationnelle du 10 novembre 2026 (sans condition témoin)

Ce n'est **pas** le benchmark : aucune comparaison avec et sans Kinan n'a été faite, aucun coût n'est estimé (aucun tarif fourni), aucune économie n'est annoncée. C'est une photographie de la répartition réelle des jetons dans les conversations du projet Studio Obsidienne.

Commande : `node bench/mesure-jetons-conversations.js <dossier des journaux .jsonl du projet>`. Données : 104 fichiers non vides, 15 conversations, 4 223 messages de l'assistant dédoublonnés par identifiant de message. Le journal de la session en cours était encore écrit pendant la mesure (instantané).

| Périmètre | Appels | Jetons de sortie | Jetons d'entrée | Cache lu | Cache créé |
|---|---|---|---|---|---|
| Conversation principale | 2 090 | 1 453 293 | 5 084 | 528 899 354 | 8 212 473 |
| Sous-agents | 2 135 | 2 981 989 | 4 346 | (voir détail par modèle) | |

| Modèle | Appels (principale) | Sortie (principale) | Appels (sous-agents) | Sortie (sous-agents) | Cache lu (sous-agents) |
|---|---|---|---|---|---|
| Opus | 797 | 657 908 | 916 | 1 360 175 | 141 138 812 |
| Sonnet | 1 293 | 795 385 | 1 023 | 1 321 103 | 164 902 048 |
| Haiku | 0 | 0 | 196 | 300 711 | 6 483 145 |

Parts, tous messages : jetons de sortie Opus 45,5 %, Sonnet 47,7 %, Haiku 6,8 % ; appels Opus 40,5 %, Sonnet 54,8 %, Haiku 4,6 %. Sous-agents seuls : sortie 45,6 % / 44,3 % / 10,1 % ; appels 42,9 % / 47,9 % / 9,2 %.

Limites : une seule personne, un seul projet ; pas de série témoin ; le cache est compté à part ; les journaux sont locaux et non publiés ; les durées par conversation vont de quelques minutes à plus de 5 000 minutes (session laissée ouverte : intervalle, pas temps actif). Non mesuré : réussite, qualité, délégations et escalades (`taches.json` non lu), coût.

## 7. Tableaux de résultats (à remplir)

Un tableau par jeu. Une ligne par essai ; un récapitulatif (médiane et étendue sur N) en dessous. Aucune valeur ci-dessous n'est mesurée.

| Essai | Condition | Tâche | Réussite | Entrée | Sortie | Cache lu | Cache créé | Appels | Coût | Durée | Délégations | Qualité |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | |

| Jeu | Condition | N | Taux de réussite | Coût médian (étendue) | Jetons médians | Durée médiane | Qualité médiane |
|---|---|---|---|---|---|---|---|
| Simple | A | | | | | | |
| Simple | B | | | | | | |
| Simple | K | | | | | | |
| Intermédiaire | A / B / K | | | | | | |
| Complexe | A / B / K | | | | | | |

Tarifs utilisés (à noter avant l'essai) : modèle, prix par million de jetons (entrée, sortie, cache lu, cache créé), date et URL de la source : *à remplir*.

## 8. Limites

- Le coût en abonnement (limites d'usage) n'est pas le coût à l'API : les jetons sont mesurables, pas le tarif réellement facturé à chacun.
- Les journaux de Claude Code ne sont pas une interface documentée ; `outils/jetons-journaux.js` et le tableau de bord peuvent se tromper si le format change.
- « Qualité équivalente » est un jugement : rubrique figée, notation en aveugle, mais subjectivité résiduelle.
- Un petit N ne prouve rien : publier les étendues, pas seulement les médianes ; ne conclure qu'au vu de l'écart entre conditions comparé à la variance.
- Les résultats vaudront pour les tâches, les modèles et les versions testés, à une date donnée. Rien n'autorise à les généraliser.
- Testé sous Windows uniquement.
