---
title: "Team Pulse - base de connaissances du rapport challenge"
language: fr
project: Team Pulse
author: Nicolas Tuor
date: 2026-08-06
prototype_url: https://nix177.github.io/challenge_TeamPulse/
repository_url: https://github.com/Nix177/challenge_TeamPulse
final_commit: 15a580b39c083b5156ce44545e59247b3ce028c0
document_type: rag_knowledge_base
---

# Team Pulse - base de connaissances complète

## Instructions d’utilisation pour le chatbot

- Répondre uniquement à partir de cette base de connaissances.
- Distinguer clairement ce qui a été réalisé, ce qui a été testé et ce qui reste une hypothèse.
- Ne pas présenter Team Pulse comme un produit validé ou prêt pour la production.
- Quand la réponse n’est pas documentée, dire que l’information manque ou qu’un retour utilisateur serait nécessaire.
- Mettre l’accent sur la démarche de vibe coding, le regard critique, la validation et la transmission à un·e stagiaire.
- Ne pas inventer de durée précise de réalisation. La consigne prévoyait 60 à 90 minutes, mais le projet a connu des approfondissements au-delà du MVP.

## Résumé canonique

Team Pulse est un prototype de baromètre d’humeur d’équipe utilisable au début d’une réunion, d’un atelier ou d’un cours. Une personne crée une session et partage un code ou un lien. Les participants choisissent anonymement l’un de cinq niveaux. Pendant la collecte, la personne qui anime voit uniquement le nombre de réponses. Elle révèle ensuite une visualisation agrégée commune aux participants et au facilitateur. Le projet a surtout servi à documenter une démarche de vibe coding : cadrer un besoin, obtenir rapidement une première version, tester le résultat réel, challenger les affirmations de l’IA, corriger les régressions et savoir s’arrêter au stade du prototype.

## Faits de référence

- Nom du prototype : Team Pulse.

- Type : baromètre d’humeur d’équipe.

- Moment d’usage : au début d’une réunion, d’un atelier ou d’un cours.

- Question : « Comment vous sentez-vous en ce début de session ? »

- Réponses visibles : Pas bien du tout ; Pas très bien ; Mitigé ; Plutôt bien ; Très bien.

- Rôles : facilitateur et participants.

- Aucun compte utilisateur.

- Technologies : HTML, CSS et JavaScript statiques ; Supabase ; GitHub Pages.

- Pendant la collecte, le public voit le total mais pas la répartition par catégorie.

- Après révélation, les participants et le facilitateur voient les comptes agrégés.

- Visualisation finale : Pulse Profile avec points anonymes empilés, courbe fondée sur les données et résumé textuel accessible.

- Prototype public : https://nix177.github.io/challenge_TeamPulse/

- Dépôt : https://github.com/Nix177/challenge_TeamPulse

- État documenté : commit 15a580b39c083b5156ce44545e59247b3ce028c0.


## Chronologie détaillée des moments importants

### 1. Premier prototype fonctionnel

**Situation :** Une première version permettait de créer ou rejoindre une session, choisir un niveau et afficher un résultat. Elle démontrait la faisabilité mais ne clarifiait pas encore suffisamment le moment d’usage ni le rôle de chaque écran.


**Enseignement :** Ne pas confondre faisabilité technique et clarté du produit.


### 2. Clarification de l’usage

**Situation :** L’interface mélangeait des formulations de début de séance et des invitations à améliorer la prochaine session. Le produit a été recadré comme check-in au début d’une réunion, d’un atelier ou d’un cours.


**Enseignement :** Une application simple a besoin d’un usage unique et explicite.


### 3. Simplification du parcours facilitateur

**Situation :** Le facilitateur devait d’abord fermer les réponses, puis afficher les résultats dans un second écran. Ces deux actions ont été fusionnées en un seul bouton : « Afficher les résultats ».


**Enseignement :** Quand deux étapes n’ont pas de valeur distincte pour l’utilisateur, elles doivent être fusionnées.


### 4. Simplification du parcours participant

**Situation :** Le participant devait sélectionner, continuer, confirmer puis valider. La confirmation intermédiaire a été supprimée : sélectionner puis envoyer suffit.


**Enseignement :** Réduire les clics n’est utile que si l’état et les conséquences restent clairs.


### 5. Réécriture de l’échelle

**Situation :** Les libellés « Très difficile » et « Difficile » répondaient mal à la question « Comment vous sentez-vous ? ». Ils ont été remplacés par « Pas bien du tout », « Pas très bien », « Mitigé », « Plutôt bien » et « Très bien ».


**Enseignement :** Les réponses doivent former une phrase naturelle avec la question.


### 6. Confidentialité pendant la collecte

**Situation :** Le système a été conçu pour ne publier que le total tant que la session est ouverte. Les cinq compteurs agrégés ne deviennent publics qu’après la révélation.


**Enseignement :** L’anonymat ne dépend pas seulement de l’absence de noms, mais aussi du moment où les données sont montrées.


### 7. Correction SQL dans Supabase

**Situation :** Une fonction générée utilisait des qualifications invalides comme pg_catalog.coalesce. La définition active a été inspectée et corrigée avec btrim et COALESCE standard.


**Enseignement :** Le SQL généré doit être vérifié dans la base active, pas seulement dans un fichier de migration.


### 8. Gestion Git et branche de fonctionnalité

**Situation :** Une branche de refonte a été créée, puis main a été réinitialisé et forcé par l’agent avant d’être remis dans un état cohérent. La suite a interdit tout force-push et utilisé un merge normal.


**Enseignement :** L’IA peut prendre des décisions Git risquées ; les garde-fous doivent être explicites.


### 9. Faux reçu possible

**Situation :** Le choix participant était mémorisé avant que l’API confirme l’enregistrement. Une réponse refusée pouvait donc être affichée comme enregistrée. L’état est désormais mis à jour uniquement après succès.


**Enseignement :** L’interface ne doit jamais affirmer un succès avant confirmation du backend.


### 10. Faux résultat à zéro

**Situation :** Une session fermée sans compteurs pouvait être rendue comme un graphique de zéro réponse. Une validation stricte distingue désormais données absentes et véritable résultat nul.


**Enseignement :** Une absence de donnée n’est pas une valeur zéro.


### 11. Imports manquants

**Situation :** hasValidCounts était appelé sans import dans app.js. createEmptyCounts était aussi utilisé sans import dans le mode de démonstration.


**Enseignement :** Les tests de syntaxe ne détectent pas toujours les références qui ne s’exécutent que dans certains parcours.


### 12. Tests verts, interface cassée

**Situation :** Trente-neuf tests passaient mais les choix du baromètre restaient non cliquables ou sans état visible. Le HTML utilisait d’autres classes que le CSS. Une capture dans le navigateur a révélé le défaut.


**Enseignement :** Le test navigateur reste indispensable pour une interface.


### 13. Feedback de copie

**Situation :** Les boutons copiaient le code et le lien mais le retour n’était perceptible que par la zone ARIA. Le libellé change maintenant en « Code copié ✓ » ou « Lien copié ✓ ».


**Enseignement :** Chaque action doit donner un retour visible et honnête.


### 14. Actualisation manuelle

**Situation :** Le facilitateur et le participant dépendaient trop du polling automatique. Des boutons d’actualisation ont été ajoutés, tout en conservant le polling et les messages d’erreur non destructifs.


**Enseignement :** L’automatisation doit être complétée par une action de récupération compréhensible.


### 15. Première visualisation finale

**Situation :** La barre 100 % et les cinq grandes lignes étaient exactes mais ressemblaient à un tableau administratif. Elles n’exprimaient pas l’identité de Team Pulse.


**Enseignement :** Une visualisation correcte peut rester inadéquate au produit.


### 16. Pulse Profile

**Situation :** Le résultat final utilise des points anonymes empilés, une courbe fondée sur les cinq compteurs, une gestion particulière du cas à une réponse et un résumé textuel accessible.


**Enseignement :** La forme visuelle doit représenter les données, pas seulement décorer l’écran.


### 17. Décision de terminer

**Situation :** Une fois le parcours fonctionnel, le rendu suffisant pour une maquette et les principaux bugs corrigés, la prochaine étape pertinente n’était plus une nouvelle itération IA mais un retour d’utilisateur réel.


**Enseignement :** Savoir s’arrêter fait partie de la maîtrise du vibe coding.


## 1. Compréhension du cas pratique

La consigne ne demandait pas un produit fini. Elle cherchait à observer une manière de travailler avec l’IA : comment le besoin est formulé, comment le problème est découpé, comment une première proposition est testée, comment les défauts sont détectés et comment cette démarche pourrait être transmise à un·e stagiaire.


J’ai donc considéré l’application comme un support de démonstration. La qualité finale compte, mais elle ne constitue pas le seul résultat. Les décisions, les tests, les erreurs repérées et le critère d’arrêt font partie du livrable.


## 2. Pourquoi avoir choisi le baromètre d’humeur

Parmi les trois idées proposées, le baromètre offrait le meilleur équilibre entre simplicité et richesse de validation. La roue des tâches et le générateur de brise-glace auraient permis un prototype très direct, mais le baromètre oblige à réfléchir à l’expérience individuelle, au résultat collectif, à l’anonymat, au rôle de la personne qui anime et à la manière de représenter les réponses sans donner l’impression d’évaluer les personnes.


Il s’agit aussi d’un bon support pour un rôle de mentor Citizen Developer. L’interface paraît simple, mais elle montre qu’un outil métier ne se réduit pas à un écran généré : il faut décider quand il est utilisé, qui peut voir quelles données, comment l’utilisateur comprend qu’une action a réussi et quelles limites doivent rester explicites.


## 3. Découpage du problème avant de commencer

Avant de demander du code, j’ai réduit le sujet à quelques décisions observables. Cette étape a servi de garde-fou face à la tendance de l’IA à proposer trop rapidement une architecture ou des fonctionnalités supplémentaires.


- Usage principal : un check-in de 30 secondes au début d’une session, pas un questionnaire de satisfaction de fin.

- Deux rôles : une personne crée et révèle la session ; les autres répondent anonymement.

- Parcours minimal : créer, partager, répondre, attendre, révéler le résultat.

- Données minimales : un code de session, un statut, un total et cinq compteurs agrégés.

- Règle de confidentialité : aucune réponse individuelle n’est rendue publique ; les catégories ne sont révélées qu’à la fermeture.

- Critère de réussite : le parcours fonctionne dans plusieurs fenêtres et reste compréhensible sans mode d’emploi.

- Critère d’arrêt : lorsque les prochaines décisions ne peuvent plus être améliorées sans retour d’un utilisateur réel.



## 4. Prompt de départ - version synthétique

Crée une mini-application web appelée Team Pulse. Une personne crée une session et partage un code ou un lien. Les participants choisissent anonymement l’un de cinq niveaux pour indiquer comment ils arrivent dans la session. L’organisateur voit le nombre de réponses, puis révèle une visualisation collective. Pas de compte utilisateur, pas de sauvegarde permanente obligatoire, interface en français, responsive et accessible. Commence par la version la plus simple qui fonctionne.


Ce prompt restait volontairement incomplet. Il devait produire une hypothèse testable, pas spécifier tout le produit avant d’avoir vu une première version.


## 5. Outils et répartition des rôles

Antigravity a servi principalement à implémenter, refactoriser, exécuter les tests et pousser les changements. Claude a été utilisé pour certains audits ciblés de code et de références manquantes. ChatGPT a servi à analyser l’expérience utilisateur, reformuler les demandes, comparer les rapports de l’IA au dépôt réel et maintenir une vue d’ensemble du projet.


Git et GitHub ont servi de filet de sécurité et de trace de l’évolution. GitHub Pages a assuré le déploiement public. Supabase a été utilisé pour permettre un état partagé entre plusieurs appareils sans compte utilisateur.


## 7. Comment j’ai validé que « ça marche »

Je n’ai jamais considéré le rapport de l’agent comme une preuve suffisante. Plusieurs niveaux de validation ont été croisés : syntaxe, tests unitaires, inspection ciblée, test navigateur, test multi-fenêtres, vérification de la fonction réellement active dans Supabase et contrôle de l’état du déploiement GitHub Pages.


L’exemple le plus parlant reste celui des choix du baromètre. Les tests étaient verts et l’agent affirmait avoir vérifié le navigateur, mais la capture montrait que les contrôles ne fonctionnaient pas. Cette contradiction a conduit à examiner le HTML et le CSS, puis à corriger les classes incohérentes.


- Tester le parcours nominal et les états d’erreur.

- Vérifier la différence entre données absentes et données égales à zéro.

- Utiliser une fenêtre privée pour simuler un participant distinct.

- Contrôler l’état réel du déploiement au lieu d’accepter une affirmation de l’agent.

- Vérifier la fonction SQL active après une migration.

- Conserver un historique Git permettant de revenir à un état stable.



## 8. Ce que j’ai trouvé le plus difficile

Le plus difficile n’a pas été la technique. C’était de ne pas disposer d’un projet réel ni d’une personne pour laquelle produire quelque chose de sur mesure. Je ne pouvais pas demander à un client : à quel moment utiliseriez-vous cet outil ? Souhaitez-vous que le résultat provoque une discussion ou qu’il reste purement informatif ? Quelles formulations ou couleurs vous mettraient mal à l’aise ?


Sans cette boucle humaine, il est facile d’optimiser selon ses propres goûts, d’ajouter des fonctionnalités spéculatives ou de continuer parce que l’IA peut encore générer quelque chose. J’ai compensé en fixant un usage unique, en formulant des critères de validation et en arrêtant lorsque les prochaines décisions auraient nécessité un retour terrain.


Cette difficulté est aussi une leçon de mentorat : le vibe coding peut accélérer la production au point de faire oublier la recherche utilisateur. Le bon réflexe n’est pas toujours de demander une meilleure version à l’IA, mais parfois d’aller parler à la personne concernée.


## 9. Comment je transmettrais la démarche à un·e stagiaire

Je transmettrais une boucle de travail courte et répétable, plus utile qu’un long cours sur chaque ligne de code générée.


- Formuler le besoin en une phrase et nommer la personne qui l’utilisera.

- Définir trois à cinq critères observables de réussite.

- Demander à l’IA la plus petite version testable.

- Tester immédiatement le parcours dans le navigateur.

- Quand quelque chose échoue, isoler un comportement et corriger une cause à la fois.

- Demander à l’IA d’expliquer ce qu’elle a changé, mais vérifier dans le dépôt et dans l’application.

- Committer chaque état stable avant une refonte importante.

- Noter les limites et décider explicitement quand arrêter.



## 10. Ce que je dirais à quelqu’un qui pense que le vibe coding remplace le développement classique

Le vibe coding abaisse fortement la barrière du premier prototype. Il permet à une personne qui ne maîtrise pas toute la stack d’explorer rapidement un besoin et de produire une application fonctionnelle. En ce sens, il change réellement la manière de créer des outils numériques.


Il ne supprime toutefois ni la complexité du logiciel ni la responsabilité. Dès que l’application devient plus importante, les questions classiques reviennent : architecture, sécurité, confidentialité, tests, accessibilité, performance, maintenance, observabilité et compréhension du code. Dans ce projet, l’IA a produit rapidement beaucoup de code, mais elle a aussi oublié des imports, créé des incohérences entre HTML et CSS, annoncé des déploiements trop tôt et affirmé avoir vérifié des comportements encore cassés.


Je présenterais donc le vibe coding comme un multiplicateur de capacité et un nouveau mode de collaboration avec le développement. Il ne remplace pas les développeurs ; il rend encore plus importante la capacité à cadrer, relire, tester, sécuriser et maintenir.


## 11. Gestion du périmètre et du temps

La consigne estimait l’exercice à 60 à 90 minutes. Le projet montre précisément un risque du vibe coding : chaque amélioration paraît peu coûteuse, et le périmètre peut s’étendre rapidement. Une version minimale conforme aurait pu s’arrêter beaucoup plus tôt, sans synchronisation poussée, sans plusieurs cycles de refonte visuelle et sans approfondissement de la base de données.


Avec une contrainte stricte, je définirais à l’avance un seuil de sortie : une session locale, cinq choix, un résultat simple et un test navigateur. Les éléments supplémentaires seraient placés dans une liste de prolongements. Dans le cadre de ce travail, j’ai poursuivi pour documenter davantage l’itération et le regard critique, mais cette extension elle-même constitue un apprentissage sur la maîtrise du périmètre.


## 12. Limites actuelles du prototype

Team Pulse est une maquette fonctionnelle, pas un produit validé.


- Le risque de ré-identification reste élevé dans les très petits groupes.

- Le secret de facilitateur est adapté au prototype, pas à une gestion complète des identités et des droits.

- Les formulations, les couleurs et la visualisation n’ont pas été testées avec des utilisateurs réels.

- L’accessibilité a été prise en compte techniquement, mais pas évaluée avec des personnes concernées.

- Le produit ne dispose pas de supervision, de journalisation métier ni de stratégie de maintenance.

- Le besoin réel de conservation, d’historique ou de comparaison entre sessions n’a pas été validé.



## 13. Prolongement envisagé : commentaire facultatif

Un prolongement possible serait de permettre au participant d’ajouter une précision courte après son choix. Cette précision ne serait pas publiée automatiquement au groupe. Deux intentions pourraient être proposées : « Garder entre nous », visible uniquement par la personne qui anime, et « À aborder avec le groupe », qui autorise le facilitateur à reprendre le thème sans exposer automatiquement le texte ni identifier l’auteur.


Cette fonction répondrait à un besoin plausible : un niveau d’humeur ne suffit pas toujours à expliquer une difficulté, et certaines personnes peuvent souhaiter signaler un contexte sans le partager devant tout le monde. Le facilitateur saurait alors s’il doit simplement prendre l’information en compte, contacter la personne ou ouvrir une discussion générale.


Je ne l’ajouterais toutefois pas sans retour terrain. Un texte libre peut contenir des informations sensibles ou rendre une personne identifiable. Il faudrait définir la durée de conservation, le droit de suppression, les avertissements, la modération éventuelle et les règles d’usage par le facilitateur.


## 14. Prochaine étape pertinente

Le développement peut s’arrêter ici. Pour aller plus loin, la priorité serait de trouver un client, une équipe ou un groupe pilote et d’observer quelques usages réels. Les questions utiles seraient : le moment du check-in est-il compris ? Le résultat modifie-t-il réellement la manière de commencer ? La visualisation aide-t-elle à décider ? Le commentaire privé correspond-il à un besoin ou crée-t-il une responsabilité inutile ?


À ce stade, un entretien de quinze minutes avec quelques utilisateurs apporterait plus d’information qu’une nouvelle série de prompts.


## 15. Bilan

Team Pulse répond au besoin du cas pratique : le prototype est accessible, fonctionnel et publiquement testable. Le résultat le plus important est cependant la démarche visible dans son évolution. L’IA a accéléré la construction, mais elle n’a pas remplacé la définition du besoin, le jugement sur l’expérience, la vérification technique, la prudence sur les données ni la décision d’arrêter.


Le projet constitue ainsi un exemple de la manière dont j’accompagnerais un·e stagiaire : utiliser l’IA pour produire rapidement une hypothèse, garder les critères de réussite sous contrôle humain, tester ce qui se passe réellement et transformer chaque erreur en règle de travail réutilisable.


## Architecture fonctionnelle

### Parcours facilitateur

- Créer directement une session depuis l’accueil.

- Partager le code ou le lien.

- Voir le nombre de réponses.

- Actualiser manuellement si nécessaire.

- Cliquer sur « Afficher les résultats » ; cette action ferme les réponses et révèle la répartition.

- Créer une nouvelle session, actualiser le résultat ou supprimer la session.


### Parcours participant

- Rejoindre avec un code ou un lien.

- Choisir une réponse parmi cinq.

- Envoyer la réponse en une seule étape.

- Voir un reçu et son propre choix si la soumission a réussi.

- Attendre le résultat avec polling automatique et bouton « Actualiser maintenant ».

- Voir le résultat collectif après révélation.


### Confidentialité

- Aucun nom n’est demandé.

- Les réponses individuelles ne sont pas rendues publiques.

- Pendant la collecte, seul le total est public.

- Après la fermeture, seuls des comptes agrégés sont publics.

- Dans un très petit groupe, l’anonymat reste limité et un avertissement est affiché.


## Questions-réponses canoniques pour le chatbot

### Pourquoi avoir choisi le baromètre plutôt que la roue des tâches ou le brise-glace ?
Parce qu’il restait assez simple pour un prototype rapide tout en introduisant des questions intéressantes de rôle, d’anonymat, de synchronisation, de visualisation et de prudence dans l’interprétation. Il démontrait mieux la démarche de Citizen Development qu’un outil purement aléatoire.


### Comment le problème a-t-il été découpé ?
En définissant d’abord le moment d’usage, les deux rôles, le parcours minimal, les données strictement nécessaires, les règles de confidentialité, les critères observables de réussite et le critère d’arrêt.


### Quel a été le moment le plus instructif ?
Le fait que 39 tests passaient alors que les choix du baromètre ne fonctionnaient toujours pas dans le navigateur. Cela a montré qu’un rapport automatisé ne remplace pas l’observation du comportement réel.


### Quelles erreurs l’IA a-t-elle commises ?
Des imports manquants, un SQL incorrectement qualifié, un décalage entre les classes HTML et CSS, des affirmations de déploiement prématurées, un faux état de succès possible et une visualisation exacte mais peu adaptée au produit.


### Comment la réussite a-t-elle été validée ?
Par la combinaison de tests de syntaxe, tests unitaires, inspection de code, test dans un vrai navigateur, simulation multi-fenêtres, vérification de la fonction Supabase active et contrôle du déploiement GitHub Pages.


### Qu’est-ce qui a été le plus difficile ?
L’absence d’un client ou utilisateur réel à qui poser des questions sur le moment d’usage, les attentes visuelles, les effets souhaités et les limites acceptables. Sans cette personne, beaucoup de décisions restent des hypothèses.


### Pourquoi le vibe coding ne remplace-t-il pas le développement classique ?
Parce qu’il accélère le premier prototype mais ne supprime ni l’architecture, ni la sécurité, ni les tests, ni l’accessibilité, ni la maintenance. L’IA produit vite, mais elle peut aussi introduire des erreurs et affirmer à tort que tout fonctionne.


### Pourquoi avoir arrêté le développement ?
Parce que le prototype est fonctionnel et visuellement suffisant pour une maquette. Les prochaines améliorations ne peuvent plus être justifiées sans retour d’un utilisateur réel.


### Quelle serait la prochaine fonctionnalité ?
Éventuellement un commentaire facultatif avec deux intentions : « Garder entre nous » ou « À aborder avec le groupe ». Cette extension devrait être validée avant développement car elle introduit des données sensibles et des responsabilités pour le facilitateur.


### Quelle est la principale limite actuelle ?
L’absence de validation terrain. Le produit fonctionne techniquement, mais son utilité réelle, ses formulations et sa visualisation n’ont pas encore été confrontées à des utilisateurs.


### Le projet respecte-t-il parfaitement la contrainte de temps ?
La consigne estimait 60 à 90 minutes. Le projet illustre justement le risque d’élargissement du périmètre en vibe coding. Un MVP conforme aurait pu être figé plus tôt ; les approfondissements ont servi à documenter davantage l’itération et le regard critique.


### Comment transmettre cette méthode à un·e stagiaire ?
En utilisant une boucle courte : besoin en une phrase, critères de réussite, plus petite version testable, test immédiat, correction d’une cause à la fois, commit d’un état stable, puis décision explicite de continuer ou d’arrêter.


## Suggestions de boutons pour l’interface du chatbot

- Pourquoi ce choix d’application ?

- Comment le problème a-t-il été découpé ?

- Quelles erreurs de l’IA ont été détectées ?

- Comment avez-vous vérifié que cela fonctionnait ?

- Qu’avez-vous trouvé le plus difficile ?

- Le vibe coding remplace-t-il le développement classique ?

- Quelles sont les limites du prototype ?

- Quelle serait la prochaine étape ?


## Garde-fous de réponse

- Ne pas inventer de feedback client : aucun test utilisateur formel n’a encore été mené.

- Ne pas dire que le prototype est un produit prêt pour la production.

- Ne pas prétendre que toutes les décisions ont été prises dans la fenêtre de 60 à 90 minutes.

- Ne pas exposer ou supposer des réponses individuelles de participants.

- Quand une question porte sur une décision non documentée, répondre que cela devrait être validé avec un utilisateur ou un client.

- Privilégier des réponses courtes, concrètes et reliées à un moment du projet.
