"""Shared constants and object-creation helpers for integration tests."""

SPICE_ID   = 1   # Test Spice, default unit: tsp
SPICE_UNIT = 8   # tsp  (Dry Volume, US Customary, 4.9289 mL)
MEAT_ID    = 2   # Test Meat, default unit: oz
MEAT_UNIT  = 4   # oz   (Weight, US Customary, 28.3495 g)

ADMIN_EMAIL    = 'admin@test.com'
ADMIN_PASSWORD = 'adminpass'
USER_EMAIL     = 'user@test.com'
USER_PASSWORD  = 'userpass'
ADMIN_ID = '00000000-0000-0000-0000-000000000001'
USER_ID  = '00000000-0000-0000-0000-000000000002'


def make_recipe(client, name='Test Recipe', servings=4, ingredients=None, tags=None):
    payload = {'name': name, 'base_servings': servings, 'instructions': '', 'description': ''}
    if ingredients is not None:
        payload['ingredients'] = ingredients
    if tags is not None:
        payload['tags'] = tags
    r = client.post('/api/recipes', json=payload)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_ingredient(client, name='New Ingredient', default_unit_id=SPICE_UNIT):
    r = client.post('/api/ingredients', json={'name': name, 'default_unit_id': default_unit_id})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_tag(client, name='Test Tag'):
    r = client.post('/api/tags', json={'name': name})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_group(client, name='Test Group'):
    r = client.post('/api/ingredient-groups', json={'name': name})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_variant_type(client, name):
    r = client.post('/api/variant-types', json={'name': name})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_list(client, name='Test List'):
    r = client.post('/api/recipe-lists', json={'name': name})
    assert r.status_code == 201, r.get_json()
    return r.get_json()
