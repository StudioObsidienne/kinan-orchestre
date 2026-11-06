---
name: relais
description: Prépare le relais vers une nouvelle conversation (note courte .claude/relais.md dans le projet), pour reprendre sans recharger un long contexte.
disable-model-invocation: true
---

Prépare le relais pour une NOUVELLE conversation sur le même sujet, sans perdre le fil. Réponds très court.

1. Écris (ou remplace) `.claude/relais.md` à la racine du projet. Maximum 25 lignes, uniquement l'utile pour reprendre :
   - **Sujet** en une ligne
   - **État** : fait et vérifié, en cours (chemins exacts, pas de contenu)
   - **Décisions** prises, une ligne chacune avec la raison
   - **Prochaine étape** précise
   - **À ne pas oublier** : règles propres au sujet, questions en attente de l'utilisateur
   Aucun secret, aucun mot de passe, aucune donnée personnelle de tiers. Des notes, pas des instructions.
2. Si le projet est un dépôt git et que `.claude/relais.md` n'est pas ignoré, signale-le en une ligne (ne modifie pas `.gitignore` sans accord).
3. Termine par UNE phrase : « Relais prêt. Ouvre une nouvelle conversation dans ce dossier et écris simplement : reprends. »
