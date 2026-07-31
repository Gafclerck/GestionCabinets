from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.base import Base
from app.core.config import settings
from app.models import *

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# On lit l'URL depuis notre .env
if settings.TESTING_MODE:
    URL = settings.DATABASE_URL_TEST
elif settings.DEVEL_MODE:
    URL = settings.DATABASE_URL_DEV
else:
    URL = settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", URL)

target_metadata = Base.metadata

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

run_migrations_online()