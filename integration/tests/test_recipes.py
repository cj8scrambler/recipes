"""Integration tests: recipe CRUD, ingredient management, tags, variants."""
import pytest
from helpers import (
    make_recipe, make_tag, make_group,
    SPICE_ID, SPICE_UNIT, MEAT_ID, MEAT_UNIT,
)


class TestRecipeCRUD:
    def test_create_recipe_returns_201(self, admin_client):
        r = admin_client.post('/api/recipes', json={
            'name': 'Pasta', 'base_servings': 4,
            'instructions': 'Boil water.', 'description': '',
        })
        assert r.status_code == 201

    def test_create_recipe_fields_returned(self, admin_client):
        r = admin_client.post('/api/recipes', json={
            'name': 'Pasta', 'base_servings': 4,
            'instructions': 'Boil water.', 'description': 'Simple pasta',
        })
        data = r.get_json()
        assert data['name'] == 'Pasta'
        assert data['base_servings'] == 4
        assert data['description'] == 'Simple pasta'
        assert 'recipe_id' in data

    def test_created_recipe_appears_in_list(self, admin_client):
        make_recipe(admin_client, name='Pasta')
        names = [r['name'] for r in admin_client.get('/api/recipes').get_json()]
        assert 'Pasta' in names

    def test_get_recipe_by_id(self, admin_client):
        recipe = make_recipe(admin_client, name='Pasta')
        r = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}')
        assert r.status_code == 200
        assert r.get_json()['name'] == 'Pasta'

    def test_get_nonexistent_recipe_returns_404(self, admin_client):
        assert admin_client.get('/api/recipes/99999').status_code == 404

    def test_update_recipe_name(self, admin_client):
        recipe = make_recipe(admin_client, name='Old Name')
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={'name': 'New Name'})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['name'] == 'New Name'

    def test_update_recipe_servings(self, admin_client):
        recipe = make_recipe(admin_client, servings=4)
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={'base_servings': 8})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['base_servings'] == 8

    def test_update_recipe_description(self, admin_client):
        recipe = make_recipe(admin_client)
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={'description': 'Updated desc'})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['description'] == 'Updated desc'

    def test_delete_recipe_returns_200(self, admin_client):
        recipe = make_recipe(admin_client)
        assert admin_client.delete(f'/api/recipes/{recipe["recipe_id"]}').status_code == 200

    def test_delete_recipe_no_longer_in_list(self, admin_client):
        recipe = make_recipe(admin_client, name='Pasta')
        admin_client.delete(f'/api/recipes/{recipe["recipe_id"]}')
        names = [r['name'] for r in admin_client.get('/api/recipes').get_json()]
        assert 'Pasta' not in names

    def test_delete_nonexistent_recipe_returns_404(self, admin_client):
        assert admin_client.delete('/api/recipes/99999').status_code == 404

    def test_put_full_get_response_succeeds(self, admin_client):
        """PUT the full GET response back unchanged — simulates the frontend spread pattern."""
        recipe = make_recipe(admin_client, name='Round Trip')
        full = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        r = admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json=full)
        assert r.status_code == 200, r.get_json()

    def test_put_full_get_response_with_change_succeeds(self, admin_client):
        """Mutate one field on the full GET response and PUT it — catches allowlist gaps."""
        recipe = make_recipe(admin_client, name='Mutate Test')
        full = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        full['description'] = 'Updated via round-trip'
        r = admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json=full)
        assert r.status_code == 200, r.get_json()
        assert r.get_json()['description'] == 'Updated via round-trip'


class TestRecipeIngredients:
    def test_create_recipe_with_ingredients(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 2.0, 'unit_id': SPICE_UNIT},
        ])
        assert len(recipe['ingredients']) == 1

    def test_ingredient_fields_in_recipe(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 2.0, 'unit_id': SPICE_UNIT},
        ])
        ing = recipe['ingredients'][0]
        assert ing['ingredient_id'] == SPICE_ID
        assert ing['quantity'] == 2.0
        assert ing['unit_id'] == SPICE_UNIT
        assert 'id' in ing  # row id for edits

    def test_add_ingredient_to_existing_recipe(self, admin_client):
        recipe = make_recipe(admin_client)
        row_id = None  # adding new — no id
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={
            'ingredients': [{'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}]
        })
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert len(updated['ingredients']) == 1

    def test_edit_ingredient_quantity(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
        ])
        row_id = recipe['ingredients'][0]['id']
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={
            'ingredients': [{'id': row_id, 'ingredient_id': SPICE_ID,
                             'quantity': 3.0, 'unit_id': SPICE_UNIT}]
        })
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['ingredients'][0]['quantity'] == 3.0

    def test_delete_ingredient_by_omission(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
            {'ingredient_id': MEAT_ID,  'quantity': 2.0, 'unit_id': MEAT_UNIT},
        ])
        row_id = next(i['id'] for i in recipe['ingredients'] if i['ingredient_id'] == SPICE_ID)
        # Keep only spice — meat is omitted so it should be removed
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={
            'ingredients': [{'id': row_id, 'ingredient_id': SPICE_ID,
                             'quantity': 1.0, 'unit_id': SPICE_UNIT}]
        })
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert len(updated['ingredients']) == 1
        assert updated['ingredients'][0]['ingredient_id'] == SPICE_ID

    def test_clear_all_ingredients(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
        ])
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={'ingredients': []})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['ingredients'] == []

    def test_ingredient_notes_saved_on_create(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT, 'notes': 'freshly ground'},
        ])
        assert recipe['ingredients'][0]['notes'] == 'freshly ground'

    def test_ingredient_notes_saved_on_update(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
        ])
        row_id = recipe['ingredients'][0]['id']
        full = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        full['ingredients'][0]['notes'] = 'toasted first'
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json=full)
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['ingredients'][0]['notes'] == 'toasted first'

    def test_ingredient_notes_cleared_on_update(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT, 'notes': 'freshly ground'},
        ])
        full = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        full['ingredients'][0]['notes'] = None
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json=full)
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['ingredients'][0]['notes'] is None

    def test_delete_recipe_cascades_ingredients(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
        ])
        admin_client.delete(f'/api/recipes/{recipe["recipe_id"]}')
        assert admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').status_code == 404


class TestRecipeTags:
    def test_create_recipe_with_tag(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        recipe = make_recipe(admin_client, tags=[{'tag_id': tag['tag_id']}])
        tag_ids = [t['tag_id'] for t in recipe['tags']]
        assert tag['tag_id'] in tag_ids

    def test_remove_tag_from_recipe(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        recipe = make_recipe(admin_client, tags=[{'tag_id': tag['tag_id']}])
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={'tags': []})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['tags'] == []

    def test_recipe_can_have_multiple_tags(self, admin_client):
        tag1 = make_tag(admin_client, name='Vegetarian')
        tag2 = make_tag(admin_client, name='Quick')
        recipe = make_recipe(admin_client,
                             tags=[{'tag_id': tag1['tag_id']}, {'tag_id': tag2['tag_id']}])
        tag_ids = {t['tag_id'] for t in recipe['tags']}
        assert tag1['tag_id'] in tag_ids
        assert tag2['tag_id'] in tag_ids

    def test_replace_tag_on_recipe(self, admin_client):
        tag1 = make_tag(admin_client, name='Vegetarian')
        tag2 = make_tag(admin_client, name='Quick')
        recipe = make_recipe(admin_client, tags=[{'tag_id': tag1['tag_id']}])
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}',
                         json={'tags': [{'tag_id': tag2['tag_id']}]})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        tag_ids = [t['tag_id'] for t in updated['tags']]
        assert tag1['tag_id'] not in tag_ids
        assert tag2['tag_id'] in tag_ids


class TestRecipeVariants:
    def test_create_variant_with_parent(self, admin_client):
        parent  = make_recipe(admin_client, name='Base Recipe')
        variant = make_recipe(admin_client, name='Spicy Variant')
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        updated = admin_client.get(f'/api/recipes/{variant["recipe_id"]}').get_json()
        assert updated['parent_recipe_id'] == parent['recipe_id']

    def test_variant_appears_in_parent_variants_list(self, admin_client):
        parent  = make_recipe(admin_client, name='Base Recipe')
        variant = make_recipe(admin_client, name='Spicy Variant')
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        parent_data = admin_client.get(f'/api/recipes/{parent["recipe_id"]}').get_json()
        variant_ids = [v['recipe_id'] for v in parent_data.get('variants', [])]
        assert variant['recipe_id'] in variant_ids

    def test_variant_can_have_own_ingredients(self, admin_client):
        parent  = make_recipe(admin_client, name='Base Recipe', ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT},
        ])
        variant = make_recipe(admin_client, name='Meat Variant', ingredients=[
            {'ingredient_id': MEAT_ID, 'quantity': 100.0, 'unit_id': MEAT_UNIT},
        ])
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        variant_data = admin_client.get(f'/api/recipes/{variant["recipe_id"]}').get_json()
        ids = [i['ingredient_id'] for i in variant_data['ingredients']]
        assert MEAT_ID in ids
        assert SPICE_ID not in ids
