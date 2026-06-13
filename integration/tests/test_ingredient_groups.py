"""Integration tests: ingredient group CRUD and recipe interaction."""
from helpers import make_group, make_recipe, SPICE_ID, SPICE_UNIT, MEAT_ID, MEAT_UNIT


class TestIngredientGroupCRUD:
    def test_create_group_returns_201(self, admin_client):
        r = admin_client.post('/api/ingredient-groups', json={'name': 'Produce'})
        assert r.status_code == 201

    def test_create_group_fields_returned(self, admin_client):
        r = admin_client.post('/api/ingredient-groups', json={
            'name': 'Produce', 'description': 'Fresh vegetables and fruit'
        })
        data = r.get_json()
        assert data['name'] == 'Produce'
        assert data['description'] == 'Fresh vegetables and fruit'
        assert 'group_id' in data

    def test_create_group_appears_in_list(self, admin_client):
        make_group(admin_client, name='Produce')
        names = [g['name'] for g in admin_client.get('/api/ingredient-groups').get_json()]
        assert 'Produce' in names

    def test_rename_group(self, admin_client):
        group = make_group(admin_client, name='Produce')
        admin_client.put(f'/api/ingredient-groups/{group["group_id"]}', json={'name': 'Vegetables'})
        updated = admin_client.get(f'/api/ingredient-groups/{group["group_id"]}').get_json()
        assert updated['name'] == 'Vegetables'

    def test_update_group_description(self, admin_client):
        group = make_group(admin_client, name='Produce')
        admin_client.put(f'/api/ingredient-groups/{group["group_id"]}',
                         json={'description': 'Updated description'})
        updated = admin_client.get(f'/api/ingredient-groups/{group["group_id"]}').get_json()
        assert updated['description'] == 'Updated description'

    def test_delete_empty_group_returns_200(self, admin_client):
        group = make_group(admin_client, name='Produce')
        assert admin_client.delete(f'/api/ingredient-groups/{group["group_id"]}').status_code == 200

    def test_delete_empty_group_no_longer_in_list(self, admin_client):
        group = make_group(admin_client, name='Produce')
        admin_client.delete(f'/api/ingredient-groups/{group["group_id"]}')
        ids = [g['group_id'] for g in admin_client.get('/api/ingredient-groups').get_json()]
        assert group['group_id'] not in ids

    def test_delete_group_in_use_returns_400(self, admin_client):
        group = make_group(admin_client, name='Spices')
        make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT,
             'group_id': group['group_id']}
        ])
        assert admin_client.delete(f'/api/ingredient-groups/{group["group_id"]}').status_code == 400

    def test_delete_group_in_use_error_mentions_recipe_count(self, admin_client):
        group = make_group(admin_client, name='Spices')
        make_recipe(admin_client, name='Recipe One', ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT,
             'group_id': group['group_id']}
        ])
        r = admin_client.delete(f'/api/ingredient-groups/{group["group_id"]}')
        assert '1' in r.get_json()['error']

    def test_get_nonexistent_group_returns_404(self, admin_client):
        assert admin_client.get('/api/ingredient-groups/99999').status_code == 404


class TestGroupInRecipes:
    def test_group_id_stored_on_recipe_ingredient(self, admin_client):
        group  = make_group(admin_client, name='Spices')
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT,
             'group_id': group['group_id']}
        ])
        fetched = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert fetched['ingredients'][0]['group_id'] == group['group_id']

    def test_group_name_included_in_recipe_ingredient(self, admin_client):
        group  = make_group(admin_client, name='Spices')
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT,
             'group_id': group['group_id']}
        ])
        fetched = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert fetched['ingredients'][0]['group_name'] == 'Spices'

    def test_recipe_with_multiple_groups(self, admin_client):
        group1 = make_group(admin_client, name='Spices')
        group2 = make_group(admin_client, name='Proteins')
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0,   'unit_id': SPICE_UNIT,
             'group_id': group1['group_id']},
            {'ingredient_id': MEAT_ID,  'quantity': 100.0, 'unit_id': MEAT_UNIT,
             'group_id': group2['group_id']},
        ])
        fetched = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        group_ids = {ing['group_id'] for ing in fetched['ingredients']}
        assert group1['group_id'] in group_ids
        assert group2['group_id'] in group_ids

    def test_ungrouped_ingredient_has_null_group_id(self, admin_client):
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT}
        ])
        fetched = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert fetched['ingredients'][0]['group_id'] is None

    def test_move_ingredient_to_different_group(self, admin_client):
        group1 = make_group(admin_client, name='Spices')
        group2 = make_group(admin_client, name='Other')
        recipe = make_recipe(admin_client, ingredients=[
            {'ingredient_id': SPICE_ID, 'quantity': 1.0, 'unit_id': SPICE_UNIT,
             'group_id': group1['group_id']}
        ])
        row_id = recipe['ingredients'][0]['id']
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}', json={
            'ingredients': [{'id': row_id, 'ingredient_id': SPICE_ID, 'quantity': 1.0,
                             'unit_id': SPICE_UNIT, 'group_id': group2['group_id']}]
        })
        fetched = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert fetched['ingredients'][0]['group_id'] == group2['group_id']
