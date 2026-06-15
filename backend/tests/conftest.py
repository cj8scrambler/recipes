import os
# Must be set before app.py is imported so load_dotenv() doesn't override it
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ.setdefault('SECRET_KEY', 'test-secret-key')

import pytest
from app import app as flask_app, db as _db
from auth import hash_password


# ---------------------------------------------------------------------------
# Minimal fixture data
# ---------------------------------------------------------------------------

UNITS = [
    dict(unit_id=1,  name='Gram',         abbreviation='g',      category='Weight',       system='Metric',        base_conversion_factor=1.0),
    dict(unit_id=4,  name='Ounce',        abbreviation='oz',     category='Weight',       system='US Customary',  base_conversion_factor=28.3495),
    dict(unit_id=5,  name='Pound',        abbreviation='lb',     category='Weight',       system='US Customary',  base_conversion_factor=453.592),
    dict(unit_id=8,  name='Teaspoon',     abbreviation='tsp',    category='Dry Volume',   system='US Customary',  base_conversion_factor=4.9289),
    dict(unit_id=9,  name='Tablespoon',   abbreviation='tbsp',   category='Dry Volume',   system='US Customary',  base_conversion_factor=14.7868),
    dict(unit_id=10, name='Cup',          abbreviation='c',      category='Dry Volume',   system='US Customary',  base_conversion_factor=236.588),
    dict(unit_id=11, name='Fluid Ounce',  abbreviation='fl oz',  category='Liquid Volume',system='US Customary',  base_conversion_factor=29.5735),
    dict(unit_id=12, name='Cup (liquid)', abbreviation='c',      category='Liquid Volume',system='US Customary',  base_conversion_factor=236.588),
    dict(unit_id=14, name='Each',         abbreviation='ea',     category='Item',         system='Other',         base_conversion_factor=None),
]

ADMIN_EMAIL = 'admin@test.com'
ADMIN_PASSWORD = 'adminpass'
USER_EMAIL = 'user@test.com'
USER_PASSWORD = 'userpass'


def seed(database):
    from app import Unit, Ingredient, Recipe, RecipeIngredient, IngredientPrice, VariantType

    for u in UNITS:
        database.session.add(Unit(**u))
    database.session.flush()

    database.session.add(VariantType(variant_type_id=1, name='Base', is_protected=True))
    database.session.flush()

    # One spice ingredient (tsp default, weight=3.5 g/tsp)
    spice = Ingredient(ingredient_id=1, name='Test Spice', default_unit_id=8, weight=3.5)
    database.session.add(spice)
    database.session.flush()

    # Price for spice: $0.02 per tsp
    database.session.add(IngredientPrice(ingredient_id=1, price=0.02, unit_id=8))
    database.session.flush()

    # One ingredient measured by weight (oz default, weight=28.35 g/oz)
    meat = Ingredient(ingredient_id=2, name='Test Meat', default_unit_id=4, weight=28.35)
    database.session.add(meat)
    database.session.flush()

    # One recipe with both ingredients
    recipe = Recipe(recipe_id=1, name='Test Recipe', base_servings=2)
    database.session.add(recipe)
    database.session.flush()

    database.session.add(RecipeIngredient(recipe_id=1, ingredient_id=1, quantity=1.0, unit_id=8))  # 1 tsp spice
    database.session.add(RecipeIngredient(recipe_id=1, ingredient_id=2, quantity=2.0, unit_id=4))  # 2 oz meat
    database.session.flush()

    # Users
    from auth import User
    database.session.add(User(
        id='admin-uuid-0001',
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role='admin',
    ))
    database.session.add(User(
        id='user-uuid-0001',
        email=USER_EMAIL,
        password_hash=hash_password(USER_PASSWORD),
        role='user',
    ))
    database.session.commit()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope='session')
def app():
    flask_app.config['TESTING'] = True
    with flask_app.app_context():
        _db.create_all()
        seed(_db)
    yield flask_app
    with flask_app.app_context():
        _db.drop_all()


@pytest.fixture(scope='session')
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clear_sessions(app):
    """Delete all sessions between tests so auth state doesn't bleed."""
    yield
    with app.app_context():
        from auth import Session
        _db.session.query(Session).delete()
        _db.session.commit()


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def login(client, email, password):
    return client.post('/api/login', json={'email': email, 'password': password})


def logout(client):
    return client.post('/api/logout')
