# Integration IA dans la plateforme de gestion des dossiers

Document de presentation destine aux parties prenantes du projet. Il resume,
etape par etape et sans detail technique excessif, les deux cas d'usage
d'intelligence artificielle prevus dans l'application :

1. La recommandation automatique d'affectation d'un dossier a un avocat.
2. Un assistant conversationnel capable de repondre aux questions sur un
   dossier et sur les documents du cabinet (approche RAG).

Fournisseur retenu pour les modeles : **Mistral AI**, heberge en Union
Europeenne, un seul modele pour la comprehension et la redaction en francais.
Les documents des clients ne transitent que vers ce service europeen, jamais
vers des infrastructures hors UE.

---

## Vue d'ensemble

|                     | Cas 1 : Recommandation d'affectation        | Cas 2 : Assistant conversationnel                |
|---------------------|---------------------------------------------|--------------------------------------------------|
| Declencheur         | Creation d'un nouveau dossier               | Question posee par un utilisateur                 |
| Objectif            | Suggerer le bon avocat et la bonne agence   | Repondre en langue naturelle sur un dossier      |
| Technologie centrale | LLM pour la lecture/redaction + moteur de regles metier pour la decision | RAG : recherche semantique + generation encadree |
| Decision finale     | Un humain valide ou rejette la suggestion   | L'utilisateur evalue la reponse et ses sources   |

---

## Cas 1 : Analyse automatique et recommandation d'affectation

### Le probleme actuel

Chaque dossier entrant doit etre attribue a un avocat. Cette decision repose
aujourd'hui uniquement sur le jugement des chefs : elle est lente, variable
d'une personne a l'autre, et difficile a justifier a posteriori.

### Le principe

Le systeme lit le dossier, le resume, puis propose une affectation en
s'appuyant sur les donnees reelles du cabinet : specialites de chaque avocat,
niveau d'expertise, charge de travail en cours. Le chef garde toujours le
dernier mot.

### Schema du flux

```
 Nouveau dossier cree
        |
        v
 +--------------------+     1. LECTURE INTELLIGENTE (LLM)
 |    Etape A         |        - Resume automatique du contenu
 |  Comprendre le     |        - Detection du domaine juridique
 |  dossier           |        - Extraction des mots cles
 +--------------------+
        |
        v
 +--------------------+     2. CLASSEMENT OBJECTIF (regles metier)
 |    Etape B         |        - Liste des avocats disponibles
 |  Classer les       |        - Score = specialites x niveau
 |  candidats         |              x charge de travail
 +--------------------+        - Classement deterministe et explicable
        |
        v
 +--------------------+     3. RECOMMANDATION REDIGEE (LLM)
 |    Etape C         |        - Justification en francais clair :
 |  Recommander       |          pourquoi cet avocat, quels points forts
 |  et expliquer      |        - Score de confiance affiche
 +--------------------+
        |
        v
 +--------------------+     4. VALIDATION HUMAINE
 |    Etape D         |        - Le chef accepte, modifie ou rejette
 |  Decision humaine  |        - Chaque choix est historise
 +--------------------+             (base d'apprentissage organisationnel)
```

### Pourquoi cette approche convaincra

- **Aucune boite noire** : la decision ne vient pas de l'IA mais de regles
  metier transparentes. L'IA comprend le dossier et redige ; le classement
  reste auditable ligne par ligne devant un client ou un barreau.
- **Reproductible** : deux analyses du meme dossier donnent le meme resultat.
- **Amelioration continue sans cout** : chaque validation ou rejet mesure
  la pertinence reelle des suggestions et permettra d'ajuster les regles.

---

## Cas 2 : Assistant conversationnel sur les dossiers (RAG)

### Le probleme actuel

L'information est dispersée : description du dossier, documents telecharges
(contrats, pieces, correspondances), historique des actions. Retrouver une
information precise demande des minutes ou des heures de recherche manuelle.

### Le principe

Un assistant type chat, disponible dans chaque dossier et en mode global,
qui recherche dans les documents et les donnees de l'application avant de
repondre. Chaque reponse cite ses sources (document, page).

### Schema global

```
        PHASE 1 : PREPARATION (au moment de l'upload d'un document)

 Document ajoute au dossier
        |
        v
 +------------------+     1. EXTRACTION DU TEXTE
 | Lecture du       |        PDF, Word, texte brut -> texte pur
 | document         |
 +------------------+
        |
        v
 +------------------+     2. DECOUPAGE EN PASSAGES
 | Decoupage        |        Paragraphes de taille homogene,
 | intelligent      |        avec numero de page conserve
 +------------------+
        |
        v
 +------------------+     3. INDEXATION SEMANTIQUE
 | Creation des     |        Chaque passage devient un vecteur
 | empreintes       |        numerique (embedding) qui capte son sens,
 | numeriques       |        stocke dans la base de donnees
 +------------------+


        PHASE 2 : INTERROGATION (a chaque question posee)

 Question de l'utilisateur
 ("Quels sont les delais dans le contrat X ?")
        |
        v
 +------------------+     1. COMPREHENSION ET FILTRAGE D'ACCES
 | Securite d'abord |        - Qui peut voir quoi : role, agence,
 |                  |          documents confidentiels
 +------------------+        Filtre applique AVANT toute recherche
        |
        v
 +------------------+     2. RECHERCHE HYBRIDE DANS LES DOCUMENTS
 | Double recherche |        - Par sens : passages proches de la question
 |                  |        - Par mots cles : termes exacts (articles,
 +------------------+          references juridiques)
                               Fusion des deux resultats
        |
        v
 +------------------+     3. ASSEMBLAGE DU CONTEXTE
 | Contexte complet |        Passages retrouves + donnees structurees
 |                  |        du dossier (client, statut, affectation,
 +------------------+          dernieres actions)
        |
        v
 +------------------+     4. REDACTION DE LA REPONSE (LLM)
 | Reponse avec     |        - Reponse en francais naturel, en streaming
 | sources citees   |        - Citations : nom du document + page
 +------------------+        - Si l'information n'existe pas : le dit
        |
        v
 Reponse affichee a l'utilisateur, conversation conservee
```

### Deux modes d'utilisation

| Mode | Perimetre | Exemple de question |
|------|-----------|---------------------|
| Par dossier | Les documents et l'historique d'un seul dossier | "Resume les faits et les demandes adverses" |
| Global | Tous les dossiers accessibles selon le role | "Sur quels dossiers ai-je des delais cette semaine ?" |

### Points cles

- **La recherche est hybride par necessite metier** : le droit exige a la fois
  la recherche par concepts ("delai de prescription") et par references
  exactes ("article 123-2"). Une seule des deux methodes echouerait.
- **La securite prime sur tout** : les droits d'acces sont appliques par la
  base de donnees avant la recherche, jamais delegues au modele. Un avocat ne
  peut obtenir, par astuce de formulation, une information hors de son perimetre.
- **Traçabilite totale** : chaque affirmation renvoie vers sa source exacte,
  verifiable en un clic. L'assistant ne decide jamais seul : il informe.

---

## Ce que nous ne faisons pas volontairement

| Choix | Raison |
|-------|--------|
| Pas d'entrainement de modele sur mesure (fine-tuning) | Aucune base de donnees d'apprentissage disponible aujourd'hui ; cout et maintenance eleves pour un benefice non demontre. Les modeles generaux en francais suffisent. |
| Pas de base de donnees vectorielle dediee (Pinecone, Qdrant...) | Une infrastructure supplementaire a exploiter et sauvegarder, sans gain a notre echelle. Les vecteurs vivent dans notre Postgres existant (extension pgvector). |
| Pas de decision automatique sans humain | L'affectation engage la responsabilite du cabinet : l'IA propose, l'humain dispose. |
| Pas d'envoi des documents hors Union Europeenne | Mistral AI heberge en UE ; les embeddings pourront de plus etre generes localement si le client l'exige. |

## Chiffres ordres de grandeur

- Analyse d'un dossier a sa creation : quelques secondes, en tache de fond
  (l'utilisateur n'attend pas).
- Reponse de l'assistant : quelques secondes, affichage progressif.
- Cout par analyse ou par question : de l'ordre du centime d'euro.
- Volume : dimensionne pour des milliers de documents par cabinet.
