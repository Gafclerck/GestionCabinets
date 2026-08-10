"""discussion decouples from dossier: nullable + unique dossier_id, add description

Revision ID: 0002
Revises: c2ff62a10d60
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = 'c2ff62a10d60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # batch_alter_table est le seul moyen portable d'ajouter une contrainte
    # unique sur SQLite (recreation de table) tout en restant valide sur
    # Postgres. Le unique sur dossier_id autorise plusieurs NULL : plusieurs
    # salles sans dossier (futurs echanges hors dossier), une seule par dossier.
    with op.batch_alter_table('discussion') as batch_op:
        batch_op.alter_column('dossier_id', existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        batch_op.create_unique_constraint('uq_discussion_dossier_id', ['dossier_id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('discussion') as batch_op:
        batch_op.drop_constraint('uq_discussion_dossier_id', type_='unique')
        batch_op.drop_column('description')
        batch_op.alter_column('dossier_id', existing_type=sa.Integer(), nullable=False)
