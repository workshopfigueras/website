# CONTRACT.md — Contrat de payload « personnalisation multi-zones »

> Public : le développeur du configurateur front (`perso2_engine.js`, hébergé
> sur Vercel). **Aucune connaissance d'Odoo requise.** Ce fichier est la
> référence figée : le front DOIT s'y conformer. Il est versionné DANS le
> module Odoo (donc il évolue avec lui).

Principe : **une commande = un article + N zones marquées, chaque zone porte
son propre visuel** (ou son propre texte). Fini « un seul fichier appliqué
partout ». **Tous les prix sont en HT** (hors taxes).

---

## 1. Schéma JSON d'une ZONE

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `zone` | string | **oui** | Code zone du catalogue (ex. `coeur_g`, `poitrine`, `dos_complet`, `manche_g`, `manche_d`, `casquette_front`). Voir catalogue §5. |
| `zone_label` | string | non | Libellé lisible (ex. « Cœur (gauche) »). Repris du catalogue sinon. |
| `type_contenu` | string | **oui** | `"logo"` (un fichier) **ou** `"texte"`. |
| `technique` | string | **oui** | `"dtf"` **ou** `"broderie"`. |
| `file_ref` | integer | conditionnel | Réf. d'un fichier **déjà uploadé** (voir §2). À utiliser pour **réutiliser le même visuel** sur plusieurs zones. |
| `file` | object | conditionnel | `{ "filename": string, "data_b64": string }` — upload inline du fichier. |
| `texte` | string | conditionnel | Texte à marquer, si `type_contenu = "texte"`. |
| `largeur_mm` | integer | non | Largeur du marquage en mm. |
| `hauteur_mm` | integer | non | Hauteur du marquage en mm. |
| `nb_couleurs` | integer | non | Nombre de couleurs de fil (pertinent en **broderie**). |
| `prix_unitaire_ht` | number | **oui** | Prix HT du marquage de cette zone, **par article**. C'est du CA. |
| `commentaire_atelier` | string | non | Consigne libre pour l'atelier. |

**Règles `type_contenu` :**
- `logo` → il FAUT `file_ref` **ou** `file`. (`file_ref` prioritaire.)
- `texte` → il FAUT `texte`. (`file`/`file_ref` ignorés.)

---

## 2. Endpoints Odoo

Les deux routes sont en **JSON-RPC** (`Content-Type: application/json`, corps
`{"jsonrpc":"2.0","method":"call","params":{...}}`), `auth=public`, CSRF désactivé.

### a) `POST /perso2/upload` — uploader un fichier réutilisable
Sert au cas « même visuel partout » : on uploade **une fois**, on récupère un
`file_ref`, on le réutilise dans plusieurs zones → **aucune duplication** du
fichier en base (dédoublonnage par empreinte).

**params**
```json
{ "filename": "logo-club.png", "data_b64": "<base64 du fichier>" }
```
**réponse**
```json
{ "file_ref": 12345, "filename": "logo-club.png" }
```

### b) `POST /perso2/add_to_cart` — ajouter l'article + ses zones au panier
**params**
```json
{ "product_id": 45940, "quantity": 10, "zones": [ <zone>, <zone>, ... ] }
```
**réponse**
```json
{ "order_line_id": 987, "zone_ids": [11,12,13], "errors": [], "line_total_ht": 162.50 }
```
- `line_total_ht` = prix HT de la ligne, **article + toutes les zones inclus**.
- `errors` = liste des zones rejetées (voir §6). Les zones valides sont créées
  quand même ; à toi d'informer l'utilisateur des zones en erreur.

---

## 3. Exemple complet — 3 zones / 3 fichiers DIFFÉRENTS

Article : t-shirt (product_id 45940), 10 pièces. Cœur = logo DTF, Dos = grand
logo DTF, Manche gauche = texte brodé.

```json
{
  "product_id": 45940,
  "quantity": 10,
  "zones": [
    {
      "zone": "coeur_g", "zone_label": "Cœur (gauche)",
      "type_contenu": "logo", "technique": "dtf",
      "largeur_mm": 90, "hauteur_mm": 90, "prix_unitaire_ht": 1.25,
      "file": { "filename": "logo_coeur.png", "data_b64": "<...>" }
    },
    {
      "zone": "dos_complet", "zone_label": "Dos complet",
      "type_contenu": "logo", "technique": "dtf",
      "largeur_mm": 300, "hauteur_mm": 400, "prix_unitaire_ht": 2.50,
      "file": { "filename": "visuel_dos.png", "data_b64": "<...>" }
    },
    {
      "zone": "manche_g", "zone_label": "Manche gauche",
      "type_contenu": "texte", "technique": "broderie",
      "texte": "CLUB X", "nb_couleurs": 2,
      "largeur_mm": 80, "hauteur_mm": 40, "prix_unitaire_ht": 3.50
    }
  ]
}
```
→ 3 `perso.zone` créées, 3 fichiers/contenus distincts. `line_total_ht` =
(prix article + 1.25 + 2.50 + 3.50) × 10.

---

## 4. Exemple complet — « MÊME VISUEL sur toutes les zones »

C'est un **raccourci**, pas le défaut. Le front :
1. uploade le fichier **une seule fois** via `/perso2/upload` → récupère `file_ref`.
2. envoie N zones qui **réutilisent le même `file_ref`**.

```json
// 1) upload unique
POST /perso2/upload
{ "filename": "logo_unique.png", "data_b64": "<...>" }
// -> { "file_ref": 55501 }

// 2) add_to_cart avec le meme file_ref sur 3 zones
{
  "product_id": 45940, "quantity": 10,
  "zones": [
    { "zone": "coeur_g",     "type_contenu": "logo", "technique": "dtf", "prix_unitaire_ht": 1.25, "file_ref": 55501 },
    { "zone": "dos_complet", "type_contenu": "logo", "technique": "dtf", "prix_unitaire_ht": 2.50, "file_ref": 55501 },
    { "zone": "manche_g",    "type_contenu": "logo", "technique": "dtf", "prix_unitaire_ht": 1.25, "file_ref": 55501 }
  ]
}
```
→ 3 zones, **1 seul fichier stocké** en base (les 3 `perso.zone` pointent le
même `ir.attachment`).

---

## 5. Catalogue des zones (source de vérité)

Stocké côté Odoo dans le paramètre `perso_multi_zones.zone_config` (repris de
l'ancien `x_ws_config`). Le front doit charger ce catalogue et n'envoyer que
des `zone` valides. Extrait :

| famille | code | libellé | w×h (mm) |
|---|---|---|---|
| haut | `coeur_g` | Cœur (gauche) | 100×100 |
| haut | `poitrine` | Poitrine centre | 280×200 |
| haut | `dos_complet` | Dos complet | 300×400 |
| haut | `haut_dos` | Haut de dos / nuque | 280×80 |
| haut | `manche_g` | Manche gauche | 80×200 |
| haut | `manche_d` | Manche droite | 80×200 |
| casquette | `casquette_front` | Face avant | 100×60 |

---

## 6. Comportement en cas d'erreur

`add_to_cart` **ne rejette jamais toute la requête** pour une zone fautive : il
crée les zones valides et retourne les autres dans `errors[]`. Codes :

| `error` | Cause | Ce que le front doit faire |
|---|---|---|
| `missing_product` | `product_id` absent | bloquer, rien créé |
| `no_zone` | `zones` vide | bloquer, rien créé |
| `zone_invalide` | `zone` vide/inconnue | signaler la zone à l'utilisateur |
| `type_ou_technique_invalide` | valeur hors `logo/texte` ou `dtf/broderie` | corriger avant renvoi |
| `fichier_manquant` | `logo` sans `file` ni `file_ref` | redemander le fichier |
| `file_ref_introuvable` | `file_ref` invalide/expiré | ré-uploader |
| `bad_file` | `data_b64` non décodable | ré-uploader |

**Fichier manquant** : la zone n'est PAS créée, elle remonte dans `errors[]`.
La commande reste cohérente (les autres zones sont créées). Le BAT n'affiche
que des zones avec un contenu réel.
