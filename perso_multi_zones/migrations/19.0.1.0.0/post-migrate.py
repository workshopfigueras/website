"""Migration idempotente Studio -> perso.zone (rejouable sans casse).
Relance la reprise a chaque mise a jour du module ; les enregistrements deja
migres sont ignores (contrainte unique studio_source_ref)."""
from odoo import api, SUPERUSER_ID


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    env["perso.zone"]._migrate_studio_zones()
