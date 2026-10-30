# CeproExamsMGT into CREP

## C'est quoi CePro-ExamsMGT ?

[CePro-ExamsMGT] est un outil développé et maintenu par l'équipe du [CePro] à l'EPFL.
Il sert aux professeur·es et à leurs assistant·es à inscrire leur·s examen·s en y indiquant le nombre d'élèves, nombre de pages, la date de l'examen, la personne à contacter, etc...
Cela permet à l'équipe du CePro via une interface affichant les divers inscriptions de gérer les sessions d'examens, en gardant un suivi précis de chacun d'entre eux.
En utilisant le "statut" de l'examen renseigné sur l'application, cela permet également à la personne responsable du bon déroulement de l'épreuve de prendre contact avec l'enseignant ou l'un·e de ses assistant·es pour s'assurer qu'il n'y ait pas de problème et que la préparation de l'examen suive son cours comme il se doit.

L'outil permet également de réaliser des statistiques pour donner un ordre idée du travail fournit par le CePro lors de chaque session d'examens, en indiquant le nombre d'examens, sur quel plateforme l'examen a été réalisé, le nombre de pages par année, le nombre de copies par année, etc...

## Fonctionnalités

- Authentification & Autorisation par Entra ID
- Inscription des examens (professeur·es)
- Inscription des absences & examens différés (étudiant·es)
- Affichage des examens inscrits
  - Filtres
  - Années précédentes
  - Recherche plain-text
  - Export des données (CSV / Excel)
  - Cacher des colonnes du tableau
- Statistiques
  - Statistiques pour l'année ou pour chaque session d'examens
  - Type d'examen (AMC, ANS, SCAN_QR_PDF, SCAN_QR_JPG, ...)
  - Nombre de copies
  - Nombre de pages
- Importation
  - Examens
  - Utilisateurs·trices
  - Cours
- Upload Excel files
  - Formation pour les assistants étudiants
  - Le but : Détecter les étudiants qui se sont déjà inscrits (les "invalides")
  - Recap File : Etudiants qui ont déjà fait le cours (liste de plusieurs années)
  - Bookwhen File : Ceux qui sont inscrits pour faire le cours de maintenant
  - Physics, Analysis, ICC, Chimie, AL : Liste des assistants actuels pour chaque section
  - La sortie finale sort un fichier de tous les étudiants qui ne sont pas aptes à s'inscrire au cours. Les étudiants valides eux ne sont pas retournés dans le fichier de sortie.
  - Si un étudiant est présent dans le Bookwhen ainsi que dans le Recap file → Invalide
  - Si un étudiant est présent dans le Bookwhen, pas dans le Recap mais n'est dans aucun fichier (Physics, Analysis, ICC, Chimie, AL) → Invalide
  - Si un étudiant est présent dans le Bookwhen, pas dans le recap, et qu'il est présent dans un des fichiers (Physics, Analysis, ICC, Chimie, AL) → Valide

## Pourquoi l'intégrer dans CREP ?

CREP gère les inscriptions pour l'impression des examens. Il serait donc intéressant de faire "d'une pierre deux coups", en inscrivant l'examen, l'inscrire pour l'impression directement avec le même formulaire.

Pour l'équipe du CePro, il serait utile d'avoir un outil où tout est regroupé, autant pour les impressions (ce que CREP fait déjà) que pour les examens de manière générale.

Pour les professeur·es ainsi que leurs étudiant·es, il serait pratique de pouvoir inscrire leur examen et directement prévoir l'impression de celui-ci.

## Qu'est-ce qui pourrait être amélioré de l'outil d'origine ?

CePro-ExamsMGT est un outil bien pensé, complet et pratique. Néanmoins, certaines choses pourraient être ajoutées ou améliorées.

- Responsiveness du tableau affichant les examens
  - Suivant la taille de l'écran, le tableau affichant les examens sur la page `exams_data` peut être légèrement cassée, sa manière de réagir au changement de taille d'écran peut être un petit peu améliorée.
- Statistiques
  - Les statistiques des examens fonctionnent bien, néanmoins il serait possible d'afficher de manière "plus claire" les graphiques, ainsi qu'ajouter des statistiques supplémentaires.
- Liste des examens lors de l'inscription
  - En l'état, CePro-ExamsMGT stocke dans sa base de données tous les cours pour lesquels il est possible de s'incrire. Cela représente une quantité conséquente de données. Il serait bien, à la manière dont le fait CREP dans son formulaire, d'utiliser le web-service d'Oasis pour lister les cours lors de l'inscription.
- Les fonctionnalités "Import"
  - Les fonctionnalités d'importation des examens, utilisateurs et des cours n'a aujourd'hui plus beaucoup de sens pour une version récente de CePro-ExamsMGT.
    Les examens sont importés via le formulaire d'inscription et pas via une importation depuis un fichier.
    L'authentification se fait maintenant avec Entra ID, donc les utilisateurs·trices ne sont plus stocké·es en base de données.
    Les cours ne seront également plus stockés en base de données, mais récoltés directement depuis le web-service d'Oasis.

## Objectif

L'objectif principal est de recréer l'expérience utilisateur actuelle de CePro-ExamsMGT, en y retranscrivant toutes ses fonctionnalités.

En second plan, il sera bon de faire les modifications mentionnées dans [Qu'est-ce qui pourrait être amélioré de l'outil d'origine ?](#quest-ce-qui-pourrait-être-amélioré-de-loutil-dorigine-).

Ce sérait également une bonne chose de questionner les divers utilisateurs·trices de CePro-ExamsMGT pour de potentielles features requests qu'ils·elles auraient en tête depuis un certain temps.

## Technologies

Intégrer CePro-ExamsMGT dans CREP signifie de s'aligner avec les technologies actuellement présentes dans CREP, plus précisément :

- [Ansible]
- [Docker]
- [NextAuth]
- [Next.js]
- [React]

[Ansible]: https://ansible.com/
[CePro-ExamsMGT]: https://ceproexamsmgt.epfl.ch/
[CePro]: https://epfl.ch/education/teaching/teaching-support/the-propedeutic-centre/
[Docker]: https://docker.com/
[Next.js]: https://nextjs.org/
[NextAuth]: https://next-auth.js.org/
[React]: https://react.dev/
