# MIGRATION.md — Reprise puis neutralisation Studio

Ordre **obligatoire** (comme exigé) : **1) recopier → 2) vérifier → 3) neutraliser.**
On ne neutralise JAMAIS avant d'avoir vérifié la reprise, sinon perte de données.

---

## 1. Reprise (automatique)
À l'installation **et** à chaque mise à jour du module, `perso.zone._migrate_studio_zones()`
est appelé (voir `hooks.py` et `migrations/19.0.1.0.0/post-migrate.py`).
- **Idempotent** : la contrainte unique `studio_source_ref` empêche tout doublon
  si on rejoue la migration.
- Règle : « 1 fichier + N zones » → « N zones pointant vers le **même** fichier ».

## 2. Vérification
Lancer `tests/rpc_test.py` (ou les tests Odoo) et contrôler :
- prix ligne = article + zones (HT),
- cas « même visuel » = 1 fichier stocké,
- 2e passage de migration = 0 création.

## 3. Neutralisation — liste NOMINATIVE des éléments Studio
> À faire **manuellement** après validation, dans cet ordre. Aucun de ces
> éléments n'a d'automatisation ni de vue Studio associée (vérifié à l'audit) →
> pas de traitement caché qui partirait deux fois.

### Champs Studio sur `sale.order`
| Champ | Action après reprise |
|---|---|
| `x_logo` (binary, « Logo client ») | **repris** → retirer des vues, puis supprimer le champ Studio |
| `x_logo_filename` (char) | idem |
| `x_perso_ref` (char, token) | idem (a servi de clé de migration) |
| `x_perso_comment` (text) | **repris** dans `perso.zone.commentaire_atelier` → supprimer |
| `x_bat_status` (selection) | **repris** dans `sale.order.perso_bat_status` → supprimer |
| `x_client_type` (selection) | **HORS PÉRIMÈTRE perso** → **laissé tel quel** (non touché) |

### Champ Studio sur `sale.order.line`
| `x_perso_config` (text, JSON) | **VIDE partout** (0 ligne) → suppression directe, rien à reprendre |

### Modèles Studio
| Modèle | Action |
|---|---|
| `x_zone_file` (11 enreg.) | **repris** dans `perso.zone` → archiver puis supprimer le modèle Studio |
| `x_ws_config` | reprendre **uniquement** les clés `zone_config` + `price_matrix` (faites : `data/perso_config_data.xml`). **NE PAS supprimer** le modèle : il porte aussi `google_reviews` / `gammes` (non-perso) |

### Point critique — le vrai « débranchement »
Le seul risque de **double envoi** vient du **front Vercel** qui écrirait encore
dans l'ancien chemin Studio ET dans le nouveau. C'est réglé côté front en
basculant sur les endpoints de `CONTRACT.md` (`/perso2/upload`, `/perso2/add_to_cart`).
**Tant que le front n'est pas basculé, ne supprime pas `x_logo`/`x_zone_file`.**

### Comment supprimer un champ/modèle Studio (UI Odoo)
Paramètres → Technique → Structure de la base → *Champs* (ou *Modèles*) →
sélectionner l'élément `x_...` → Supprimer. (Faire une sauvegarde avant.)
