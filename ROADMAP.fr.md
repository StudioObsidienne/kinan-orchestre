# Pistes d'amélioration de Kinan Orchestre

Ce sont des pistes d'amélioration, pas des fonctions déjà en place. Rien ci-dessous n'est livré. On avancera étape par étape.

## Phase 1 : consolider les fondations
- Test d'installation sur une machine extérieure (Windows, puis macOS et Linux)
- Tests automatisés (scripts, hooks, démarrage du tableau de bord)
- Tests d'interruption et d'erreur : agent muet, hook en échec, configuration corrompue, tâche bloquée
- Concurrence : verrouillage quand deux agents touchent les mêmes fichiers
- Documenter les permissions et les outils autorisés de chaque agent
- Démonstration publique fonctionnelle
- Mise à jour : explication en tête du README, vérification de version dans le tableau de bord

## Phase 2 : prouver la valeur
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

