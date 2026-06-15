"""
Fixtures for integration tests against a real MySQL database.

Credentials are read from environment variables (set by CI secrets) or from
an integration/.env file for local development. Copy integration/.env.example
to integration/.env and fill in your values to run locally.

Run from the repo root: python -m pytest integration/tests --tb=short
"""
import os
import sys

# Add backend/ to sys.path so app.py and auth.py are importable
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
sys.path.insert(0, _BACKEND)

import pytest
from dotenv import load_dotenv

# Load integration/.env when running locally; CI sets vars directly via secrets
_ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(_ENV_FILE)


def _build_url():
    from urllib.parse import quote_plus
    host     = os.environ.get('CI_DB_HOST')
    port     = os.environ.get('CI_DB_PORT', '3306')
    user     = os.environ.get('CI_DB_USER')
    password = os.environ.get('CI_DB_PASSWORD')
    name     = os.environ.get('CI_DB_NAME')
    if all([host, user, password, name]):
        return f'mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{name}'
    return None


_DB_URL = _build_url()


def pytest_configure(config):
    if not _DB_URL:
        pytest.exit(
            'Integration tests skipped: CI_DB_* environment variables not set',
            returncode=0,
        )


# Everything below only executes when DB vars are present. pytest_configure above
# exits pytest before any fixture or test runs when _DB_URL is None.
if _DB_URL:
    os.environ['DATABASE_URL'] = _DB_URL
    os.environ.setdefault('SECRET_KEY', 'test-secret-key')

    from app import app as flask_app, db as _db  # noqa: E402
    from auth import hash_password               # noqa: E402

    from helpers import (                        # noqa: E402
        SPICE_ID, SPICE_UNIT, MEAT_ID, MEAT_UNIT,
        ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ID,
        USER_EMAIL, USER_PASSWORD, USER_ID,
    )

    _UNITS = [
        dict(unit_id=1,  name='Gram',        abbreviation='g',    category='Weight',      system='Metric',        base_conversion_factor=1.0),
        dict(unit_id=4,  name='Ounce',       abbreviation='oz',   category='Weight',      system='US Customary',  base_conversion_factor=28.3495),
        dict(unit_id=5,  name='Pound',       abbreviation='lb',   category='Weight',      system='US Customary',  base_conversion_factor=453.592),
        dict(unit_id=8,  name='Teaspoon',    abbreviation='tsp',  category='Dry Volume',  system='US Customary',  base_conversion_factor=4.9289),
        dict(unit_id=9,  name='Tablespoon',  abbreviation='tbsp', category='Dry Volume',  system='US Customary',  base_conversion_factor=14.7868),
        dict(unit_id=10, name='Cup',         abbreviation='c',    category='Dry Volume',  system='US Customary',  base_conversion_factor=236.588),
        dict(unit_id=14, name='Each',        abbreviation='ea',   category='Item',        system='Other',         base_conversion_factor=None),
    ]

    def _reset(database):
        from app import Ingredient, IngredientPrice
        from auth import User

        database.session.execute(database.text('SET FOREIGN_KEY_CHECKS = 0'))
        for table in [
            'sessions', 'Recipe_List_Items', 'Recipe_Lists',
            'Recipe_Tags', 'Recipe_Ingredients', 'Recipes',
            'Tags', 'Ingredient_Groups', 'Ingredient_Prices',
            'Ingredients', 'Ingredient_Types', 'users',
        ]:
            database.session.execute(database.text(f'DELETE FROM `{table}`'))
        # Remove test-created variant types but keep the protected Base entry
        database.session.execute(database.text('DELETE FROM Variant_Types WHERE is_protected = 0'))
        database.session.execute(database.text('SET FOREIGN_KEY_CHECKS = 1'))

        database.session.add(Ingredient(ingredient_id=SPICE_ID, name='Test Spice', default_unit_id=SPICE_UNIT, weight=3.5))
        database.session.add(Ingredient(ingredient_id=MEAT_ID,  name='Test Meat',  default_unit_id=MEAT_UNIT,  weight=28.35))
        database.session.flush()
        database.session.add(IngredientPrice(ingredient_id=SPICE_ID, price=0.02, unit_id=SPICE_UNIT))

        admin_hash = hash_password(ADMIN_PASSWORD)
        user_hash  = hash_password(USER_PASSWORD)
        database.session.execute(database.text(
            "INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :ph, :role)"
        ), {'id': ADMIN_ID, 'email': ADMIN_EMAIL, 'ph': admin_hash, 'role': 'admin'})
        database.session.execute(database.text(
            "INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :ph, :role)"
        ), {'id': USER_ID, 'email': USER_EMAIL, 'ph': user_hash, 'role': 'user'})
        database.session.commit()


    @pytest.fixture(scope='session')
    def app():
        flask_app.config['TESTING'] = True
        with flask_app.app_context():
            _db.create_all()
            from app import Unit, VariantType
            for u in _UNITS:
                _db.session.merge(Unit(**u))
            # Seed the protected Base variant type if not present
            if not _db.session.execute(_db.select(VariantType).filter_by(name='Base')).scalar_one_or_none():
                _db.session.add(VariantType(name='Base', is_protected=True))
            _db.session.commit()
        yield flask_app
        with flask_app.app_context():
            _db.drop_all()

    @pytest.fixture(autouse=True)
    def reset_db(app):
        """Reset to clean seed state before every test."""
        with app.app_context():
            _reset(_db)
            _db.engine.dispose()  # discard pooled connections so requests start fresh
        yield
        with app.app_context():
            _db.session.remove()

    @pytest.fixture
    def admin_client(app, reset_db):
        """HTTP test client pre-authenticated as admin."""
        c = app.test_client()
        c.post('/api/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
        yield c

    @pytest.fixture
    def user_client(app, reset_db):
        """HTTP test client pre-authenticated as regular user."""
        c = app.test_client()
        c.post('/api/login', json={'email': USER_EMAIL, 'password': USER_PASSWORD})
        yield c
