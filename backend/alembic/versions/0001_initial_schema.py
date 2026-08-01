"""schema initial portable (Postgres et SQLite)

Revision ID: 0001
Revises:
Create Date: 2026-07-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Migration unique et portable (Postgres + SQLite).
    # Les colonnes enum sont des String (valeurs majuscules) et les champs
    # JSON utilisent sa.JSON : pas de CREATE TYPE / JSONB / ALTER hors SQLite.
    # server_default=sa.func.now() se compile en CURRENT_TIMESTAMP sur SQLite.
    op.create_table('agence',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('nom', sa.String(length=255), nullable=False),
    sa.Column('adresse', sa.String(length=255), nullable=False),
    sa.Column('ville', sa.String(length=100), nullable=False),
    sa.Column('telephone', sa.String(length=20), nullable=False),
    sa.Column('est_siege', sa.Boolean(), nullable=False),
    sa.Column('actif', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('user',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('agence_id', sa.Integer(), nullable=True),
    sa.Column('nom', sa.String(length=100), nullable=False),
    sa.Column('prenom', sa.String(length=100), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('actif', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['agence_id'], ['agence.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('client',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('type_client', sa.String(length=50), nullable=False),
    sa.Column('nom', sa.String(length=255), nullable=False),
    sa.Column('telephone', sa.String(length=20), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('nin', sa.String(length=50), nullable=True),
    sa.Column('rccm', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('type_affaire',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('libelle', sa.String(length=150), nullable=False),
    sa.Column('code', sa.String(length=30), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('libelle')
    )
    op.create_table('dossier',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('agence_receptrice_id', sa.Integer(), nullable=False),
    sa.Column('avocat_en_chef_id', sa.Integer(), nullable=False),
    sa.Column('agence_assigne_id', sa.Integer(), nullable=True),
    sa.Column('avocat_assigne_id', sa.Integer(), nullable=True),
    sa.Column('type_affaire_id', sa.Integer(), nullable=False),
    sa.Column('reference', sa.String(length=50), nullable=False),
    sa.Column('titre', sa.String(length=255), nullable=False),
    sa.Column('description_initiale', sa.Text(), nullable=True),
    sa.Column('statut', sa.String(length=50), nullable=False),
    sa.Column('priorite', sa.Integer(), nullable=False),
    sa.Column('date_reception', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column('date_affectation', sa.DateTime(timezone=True), nullable=True),
    sa.Column('date_cloture', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['agence_assigne_id'], ['agence.id'], ),
    sa.ForeignKeyConstraint(['agence_receptrice_id'], ['agence.id'], ),
    sa.ForeignKeyConstraint(['avocat_assigne_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['avocat_en_chef_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['client_id'], ['client.id'], ),
    sa.ForeignKeyConstraint(['type_affaire_id'], ['type_affaire.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('reference')
    )
    op.create_index('ix_dossier_statut', 'dossier', ['statut'], unique=False)
    op.create_index('ix_dossier_reference', 'dossier', ['reference'], unique=False)
    op.create_index('ix_dossier_client_id', 'dossier', ['client_id'], unique=False)
    op.create_index('ix_client_telephone', 'client', ['telephone'], unique=False)
    op.create_table('specialite',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('libelle', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('libelle')
    )
    op.create_table('user_specialite',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('specialite_id', sa.Integer(), nullable=False),
    sa.Column('niveau', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['specialite_id'], ['specialite.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('user_id', 'specialite_id')
    )
    op.create_table('analyse_ia',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('dossier_id', sa.Integer(), nullable=False),
    sa.Column('resume_genere', sa.Text(), nullable=False),
    sa.Column('type_detecte', sa.String(length=100), nullable=False),
    sa.Column('mots_cles', sa.JSON(), nullable=False),
    sa.Column('agence_suggeree_id', sa.Integer(), nullable=True),
    sa.Column('avocat_suggere_id', sa.Integer(), nullable=True),
    sa.Column('score_confiance', sa.Float(), nullable=False),
    sa.Column('modele_ia', sa.String(length=100), nullable=False),
    sa.Column('validee', sa.Boolean(), nullable=False),
    sa.Column('validee_par', sa.Integer(), nullable=True),
    sa.Column('validee_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['agence_suggeree_id'], ['agence.id'], ),
    sa.ForeignKeyConstraint(['avocat_suggere_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['dossier_id'], ['dossier.id'], ),
    sa.ForeignKeyConstraint(['validee_par'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('document',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('dossier_id', sa.Integer(), nullable=False),
    sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
    sa.Column('nom_fichier', sa.String(length=255), nullable=False),
    sa.Column('chemin_stockage', sa.String(length=500), nullable=False),
    sa.Column('type_mime', sa.String(length=100), nullable=True),
    sa.Column('taille_octets', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('confidentiel', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['dossier_id'], ['dossier.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('historique_action',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('dossier_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('ancienne_valeur', sa.JSON(), nullable=True),
    sa.Column('nouvelle_valeur', sa.JSON(), nullable=True),
    sa.Column('commentaire', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['dossier_id'], ['dossier.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('discussion',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('dossier_id', sa.Integer(), nullable=False),
    sa.Column('created_by_id', sa.Integer(), nullable=False),
    sa.Column('sujet', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['dossier_id'], ['dossier.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('notification',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('destinataire_id', sa.Integer(), nullable=False),
    sa.Column('dossier_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=100), nullable=False),
    sa.Column('contenu', sa.Text(), nullable=False),
    sa.Column('lue', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['destinataire_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['dossier_id'], ['dossier.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('message_discussion',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('discussion_id', sa.Integer(), nullable=False),
    sa.Column('auteur_id', sa.Integer(), nullable=False),
    sa.Column('contenu', sa.Text(), nullable=False),
    sa.Column('parent_message_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(['auteur_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['discussion_id'], ['discussion.id'], ),
    sa.ForeignKeyConstraint(['parent_message_id'], ['message_discussion.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('message_discussion')
    op.drop_table('notification')
    op.drop_table('discussion')
    op.drop_table('historique_action')
    op.drop_table('document')
    op.drop_table('analyse_ia')
    op.drop_table('user_specialite')
    op.drop_table('specialite')
    op.drop_index('ix_client_telephone', table_name='client')
    op.drop_index('ix_dossier_client_id', table_name='dossier')
    op.drop_index('ix_dossier_reference', table_name='dossier')
    op.drop_index('ix_dossier_statut', table_name='dossier')
    op.drop_table('dossier')
    op.drop_table('type_affaire')
    op.drop_table('client')
    op.drop_table('user')
    op.drop_table('agence')
    # ### end Alembic commands ###
