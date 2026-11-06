# Contribuer

1. Ouvrez un ticket avant un changement important (nouvel agent par défaut, nouvel événement de hook, changement du schéma de configuration).
2. Un changement = une demande de fusion, avec une ligne dans `CHANGELOG.md` (section « Non publié »).
3. Avant de proposer :
   - `claude plugin validate .` passe ;
   - `node --check` passe sur chaque fichier de `hooks/` et `outils/` ;
   - `node --test tests/` passe (hooks, erreurs, concurrence, manifestes, permissions des agents) ;
   - les hooks restent silencieux en cas d'erreur, sans accès réseau, sans dépendance externe ;
   - `examples/` ne contient aucun code d'envoi (courrier, message, devis) ;
   - aucune donnée personnelle, aucun chemin absolu propre à une machine, aucun chiffre non mesuré.
4. Règles verrouillées (le juge Kinan, les règles de sécurité de base) : tout changement doit être discuté dans un ticket.
5. Langues : le README existe en anglais (`README.md`) et en français (`README.fr.md`) ; tenez les deux à jour ensemble.

En contribuant, vous acceptez que votre contribution soit publiée sous la licence Apache-2.0 du projet (voir `LICENSE`).
