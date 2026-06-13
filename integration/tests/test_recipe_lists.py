"""Integration tests: recipe list CRUD, items, user isolation, and shopping list."""
import pytest
from helpers import (
    make_list, make_recipe,
    SPICE_ID, SPICE_UNIT, MEAT_ID, MEAT_UNIT,
)


class TestRecipeListCRUD:
    def test_create_list_returns_201(self, user_client):
        r = user_client.post('/api/recipe-lists', json={'name': 'Weeknight Dinners'})
        assert r.status_code == 201

    def test_create_list_fields_returned(self, user_client):
        r = user_client.post('/api/recipe-lists', json={'name': 'Weeknight Dinners'})
        data = r.get_json()
        assert data['name'] == 'Weeknight Dinners'
        assert 'list_id' in data

    def test_create_list_appears_in_get(self, user_client):
        make_list(user_client, name='Weeknight Dinners')
        names = [l['name'] for l in user_client.get('/api/recipe-lists').get_json()]
        assert 'Weeknight Dinners' in names

    def test_create_list_requires_name(self, user_client):
        r = user_client.post('/api/recipe-lists', json={'name': ''})
        assert r.status_code == 400

    def test_rename_list(self, user_client):
        lst = make_list(user_client, name='Old Name')
        user_client.put(f'/api/recipe-lists/{lst["list_id"]}', json={'name': 'New Name'})
        updated = user_client.get(f'/api/recipe-lists/{lst["list_id"]}').get_json()
        assert updated['name'] == 'New Name'

    def test_rename_list_to_empty_returns_400(self, user_client):
        lst = make_list(user_client)
        r = user_client.put(f'/api/recipe-lists/{lst["list_id"]}', json={'name': ''})
        assert r.status_code == 400

    def test_delete_list_returns_200(self, user_client):
        lst = make_list(user_client)
        assert user_client.delete(f'/api/recipe-lists/{lst["list_id"]}').status_code == 200

    def test_delete_list_no_longer_returned(self, user_client):
        lst = make_list(user_client)
        user_client.delete(f'/api/recipe-lists/{lst["list_id"]}')
        ids = [l['list_id'] for l in user_client.get('/api/recipe-lists').get_json()]
        assert lst['list_id'] not in ids

    def test_get_nonexistent_list_returns_404(self, user_client):
        assert user_client.get('/api/recipe-lists/99999').status_code == 404


class TestRecipeListUserIsolation:
    def test_user_cannot_see_other_users_lists(self, admin_client, user_client):
        make_list(admin_client, name='Admin List')
        user_lists = user_client.get('/api/recipe-lists').get_json()
        names = [l['name'] for l in user_lists]
        assert 'Admin List' not in names

    def test_user_cannot_access_other_users_list_by_id(self, admin_client, user_client):
        lst = make_list(admin_client, name='Admin List')
        r = user_client.get(f'/api/recipe-lists/{lst["list_id"]}')
        assert r.status_code == 404

    def test_user_cannot_delete_other_users_list(self, admin_client, user_client):
        lst = make_list(admin_client, name='Admin List')
        r = user_client.delete(f'/api/recipe-lists/{lst["list_id"]}')
        assert r.status_code == 404


class TestRecipeListItems:
    def test_add_recipe_to_list_returns_201(self, admin_client):
        recipe = make_recipe(admin_client)
        lst    = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                              json={'recipe_id': recipe['recipe_id'], 'servings': 4})
        assert r.status_code == 201

    def test_add_recipe_fields_returned(self, admin_client):
        recipe = make_recipe(admin_client, name='Pasta')
        lst    = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                              json={'recipe_id': recipe['recipe_id'], 'servings': 4})
        data = r.get_json()
        assert data['recipe_id'] == recipe['recipe_id']
        assert data['recipe_name'] == 'Pasta'
        assert data['servings'] == 4
        assert 'item_id' in data

    def test_list_item_count_updates(self, admin_client):
        recipe = make_recipe(admin_client)
        lst    = make_list(admin_client)
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                          json={'recipe_id': recipe['recipe_id'], 'servings': 2})
        updated = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}').get_json()
        assert updated['item_count'] == 1

    def test_update_servings(self, admin_client):
        recipe = make_recipe(admin_client)
        lst    = make_list(admin_client)
        item = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                                 json={'recipe_id': recipe['recipe_id'], 'servings': 2}).get_json()
        admin_client.put(f'/api/recipe-lists/{lst["list_id"]}/items/{item["item_id"]}',
                         json={'servings': 8})
        updated = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/items/{item["item_id"]}').get_json()
        assert updated['servings'] == 8

    def test_remove_recipe_from_list_returns_200(self, admin_client):
        recipe = make_recipe(admin_client)
        lst    = make_list(admin_client)
        item = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                                 json={'recipe_id': recipe['recipe_id'], 'servings': 2}).get_json()
        r = admin_client.delete(f'/api/recipe-lists/{lst["list_id"]}/items/{item["item_id"]}')
        assert r.status_code == 200

    def test_remove_recipe_reduces_item_count(self, admin_client):
        recipe = make_recipe(admin_client)
        lst    = make_list(admin_client)
        item = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                                 json={'recipe_id': recipe['recipe_id'], 'servings': 2}).get_json()
        admin_client.delete(f'/api/recipe-lists/{lst["list_id"]}/items/{item["item_id"]}')
        updated = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}').get_json()
        assert updated['item_count'] == 0

    def test_add_nonexistent_recipe_returns_404(self, admin_client):
        lst = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                              json={'recipe_id': 99999, 'servings': 2})
        assert r.status_code == 404

    def test_add_recipe_requires_recipe_id(self, admin_client):
        lst = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items', json={'servings': 2})
        assert r.status_code == 400

    def test_add_recipe_with_variant(self, admin_client):
        parent  = make_recipe(admin_client, name='Base')
        variant = make_recipe(admin_client, name='Variant')
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        lst = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items', json={
            'recipe_id': parent['recipe_id'],
            'variant_id': variant['recipe_id'],
            'servings': 4,
        })
        assert r.status_code == 201
        assert r.get_json()['variant_id'] == variant['recipe_id']

    def test_add_recipe_with_invalid_variant_returns_400(self, admin_client):
        recipe1 = make_recipe(admin_client, name='Recipe One')
        recipe2 = make_recipe(admin_client, name='Recipe Two')
        lst = make_list(admin_client)
        r = admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items', json={
            'recipe_id': recipe1['recipe_id'],
            'variant_id': recipe2['recipe_id'],  # not a variant of recipe1
            'servings': 4,
        })
        assert r.status_code == 400


class TestShoppingList:
    def test_empty_list_returns_empty_array(self, admin_client):
        lst = make_list(admin_client)
        r = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/shopping-list')
        assert r.status_code == 200
        assert r.get_json() == []

    def test_shopping_list_contains_recipe_ingredient(self, admin_client):
        recipe = make_recipe(admin_client, servings=4, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        lst = make_list(admin_client)
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                          json={'recipe_id': recipe['recipe_id'], 'servings': 4})
        items = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/shopping-list').get_json()
        assert any(i['ingredient_id'] == SPICE_ID for i in items)

    def test_shopping_list_scales_by_servings(self, admin_client):
        # 4-serving recipe with 1 tsp → list at 8 servings → 2 tsp
        recipe = make_recipe(admin_client, servings=4, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        lst = make_list(admin_client)
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                          json={'recipe_id': recipe['recipe_id'], 'servings': 8})
        items = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/shopping-list').get_json()
        spice = next(i for i in items if i['ingredient_id'] == SPICE_ID)
        assert spice['quantity'] == pytest.approx(2.0, rel=1e-3)

    def test_shopping_list_aggregates_same_ingredient_across_recipes(self, admin_client):
        # Two recipes each with 1 tsp spice → should produce a single entry with 2 tsp
        recipe1 = make_recipe(admin_client, name='Recipe One', servings=4, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        recipe2 = make_recipe(admin_client, name='Recipe Two', servings=4, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        lst = make_list(admin_client)
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                          json={'recipe_id': recipe1['recipe_id'], 'servings': 4})
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items',
                          json={'recipe_id': recipe2['recipe_id'], 'servings': 4})
        items = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/shopping-list').get_json()
        spice_items = [i for i in items if i['ingredient_id'] == SPICE_ID]
        assert len(spice_items) == 1
        assert spice_items[0]['quantity'] == pytest.approx(2.0, rel=1e-3)

    def test_shopping_list_uses_variant_ingredients(self, admin_client):
        # Parent has spice; variant has meat — list with variant should show meat, not spice
        parent = make_recipe(admin_client, name='Base', servings=4, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        variant = make_recipe(admin_client, name='Meat Variant', servings=4, ingredients=[
            {'ingredient_id': MEAT_ID, 'quantity': 100.0, 'unit_id': MEAT_UNIT}
        ])
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        lst = make_list(admin_client)
        admin_client.post(f'/api/recipe-lists/{lst["list_id"]}/items', json={
            'recipe_id': parent['recipe_id'],
            'variant_id': variant['recipe_id'],
            'servings': 4,
        })
        items = admin_client.get(f'/api/recipe-lists/{lst["list_id"]}/shopping-list').get_json()
        ingredient_ids = [i['ingredient_id'] for i in items]
        assert MEAT_ID in ingredient_ids
        assert SPICE_ID not in ingredient_ids
