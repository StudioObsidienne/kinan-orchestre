# Pistes d'amélioration de Kinan Orchestre

Les éléments cochés sont faits. Les autres sont des pistes d'amélioration, pas des fonctions déjà en place. On avancera étape par étape.

## Phase 1 : consolider les fondations
- [x] Test d'installation sur une machine extérieure (Windows : fait par un testeur ; macOS et Linux à faire)
- [x] Tests automatisés (scripts, hooks, démarrage du tableau de bord) : `node --test tests/` dans le plugin, `npm test` dans le tableau de bord (avec un vrai démarrage d'Electron)
- [x] Tests d'interruption et d'erreur : agent muet, hook en échec, configuration corrompue, tâche bloquée (`tests/erreurs.test.js`) ; un fichier d'état corrompu est maintenant réparé au lieu de bloquer les événements suivants
- [x] Concurrence : verrouillage quand deux agents touchent les mêmes fichiers (`hooks/verrou-fichiers.js`, `tests/concurrence.test.js`). Limites : les modifications faites par Bash ne sont pas vues ; les sous-agents d'une même conversation ne sont distingués que si Claude Code transmet `agent_id`
- [x] Documenter les permissions et les outils autorisés de chaque agent (README, « Permissions des agents » ; contrôlé par `tests/manifestes.test.js`)
- [ ] Démonstration publique fonctionnelle
- [x] Mise à jour : explication en tête du README, vérification de version dans le tableau de bord (désactivée par défaut)

## Phase 2 : prouver la valeur
Avis externe pris en compte (7 nov. 2026) : le prochain grand cap de Kinan n'est ni visuel ni fonctionnel, il est scientifique et technique. Il faut démontrer que l'orchestration apporte un avantage mesurable, que ses mécanismes résistent aux erreurs et que les résultats sont fiables : passer de la démonstration de fonctionnement à la démonstration de performance et de fiabilité. Trois documents à produire en premier :
- [ ] `KINAN_ARCHITECTURE.md` : interactions entre les deux dépôts, flux de données, responsabilités et limites
- [ ] `KINAN_BENCHMARK.md` : protocole de comparaison reproductible, avec résultats, coûts, temps et qualité
- [ ] `KINAN_SECURITY.md` : permissions, données locales, accès réseau et mécanismes de protection (documentation centralisée)
- Benchmark reproductible, Kinan contre un modèle unique : jetons d'entrée et de sortie, coût, temps, nombre d'appels, qualité à résultat équivalent
- Trois jeux de tâches (simples, intermédiaires, complexes), chacun répété plusieurs fois
- Publier les résultats, y compris les mauvais
- Tant que ce n'est pas mesuré, aucun chiffre d'économie n'est annoncé.

## Phase 3 : améliorer le moteur
- Routage plus fiable : score de la tâche (complexité, ambiguïté, risque, volume de contexte, besoin d'outils)
- Escalade adaptative Haiku, Sonnet, Opus, avec règles par type de tâche
- Vérification à plusieurs niveaux : structure, tests/lint/types, sémantique, relecture contradictoire ; le juge peut refuser une livraison
- Observabilité : identifiant par tâche, modèle, jetons, coût, escalades, verdict du juge, codes d'erreur
- Gestion d'erreurs : délais maximum, reprises limitées, récupération après interruption
- Mémoire partagée (projet, agents, décisions) avec validation
- Parallélisation des tâches indépendantes
- Alerte de limites d'usage (session 5 h et hebdomadaire) dans le tableau de bord

## Phase 4 : en faire un produit
- Tableau de bord : activité, coûts, performance, historique d'une tâche (pourquoi cet agent, quel coût, quel verdict)
- Budgets par projet
- Configuration simplifiée, documentation utilisateur
- Moteur découplé de Claude Code, autres fournisseurs de modèles (long terme)
- Bibliothèque d'agents spécialisés

## Sécurité (en continu)
- Politique de rétention, purge complète et chiffrement optionnel des journaux locaux
- Rapports d'agents traités comme des entrées non fiables ; permissions par agent
- Audit de la partie courrier et veille avant de la présenter comme sûre

