"""Integration tests: variant type CRUD, access control, and recipe assignment."""
from helpers import make_recipe, make_variant_type, SPICE_ID, SPICE_UNIT

URL = '/api/variant-types'


class TestVariantTypeCRUD:
    def test_list_includes_base(self, admin_client):
        names = [t['name'] for t in admin_client.get(URL).get_json()]
        assert 'Base' in names

    def test_base_is_protected(self, admin_client):
        types = admin_client.get(URL).get_json()
        base = next(t for t in types if t['name'] == 'Base')
        assert base['is_protected'] is True

    def test_create_returns_201(self, admin_client):
        r = admin_client.post(URL, json={'name': 'Gluten Free'})
        assert r.status_code == 201

    def test_created_type_in_list(self, admin_client):
        make_variant_type(admin_client, 'Lightweight')
        names = [t['name'] for t in admin_client.get(URL).get_json()]
        assert 'Lightweight' in names

    def test_created_type_fields(self, admin_client):
        vt = make_variant_type(admin_client, 'Vegan')
        assert vt['name'] == 'Vegan'
        assert vt['is_protected'] is False
        assert 'variant_type_id' in vt

    def test_duplicate_name_rejected(self, admin_client):
        make_variant_type(admin_client, 'Spicy')
        r = admin_client.post(URL, json={'name': 'Spicy'})
        assert r.status_code in (400, 409)

    def test_missing_name_returns_400(self, admin_client):
        assert admin_client.post(URL, json={}).status_code == 400

    def test_rename_variant_type(self, admin_client):
        vt = make_variant_type(admin_client, 'OldName')
        admin_client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'NewName'})
        names = [t['name'] for t in admin_client.get(URL).get_json()]
        assert 'NewName' in names
        assert 'OldName' not in names

    def test_rename_returns_updated_object(self, admin_client):
        vt = make_variant_type(admin_client, 'Before')
        r = admin_client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'After'})
        assert r.status_code == 200
        assert r.get_json()['name'] == 'After'

    def test_delete_variant_type(self, admin_client):
        vt = make_variant_type(admin_client, 'Temporary')
        admin_client.delete(f'{URL}/{vt["variant_type_id"]}')
        names = [t['name'] for t in admin_client.get(URL).get_json()]
        assert 'Temporary' not in names

    def test_delete_returns_success(self, admin_client):
        vt = make_variant_type(admin_client, 'DeleteMe')
        r = admin_client.delete(f'{URL}/{vt["variant_type_id"]}')
        assert r.status_code == 200

    def test_cannot_delete_protected_base(self, admin_client):
        types = admin_client.get(URL).get_json()
        base = next(t for t in types if t['name'] == 'Base')
        r = admin_client.delete(f'{URL}/{base["variant_type_id"]}')
        assert r.status_code in (400, 403)

    def test_cannot_rename_protected_base(self, admin_client):
        types = admin_client.get(URL).get_json()
        base = next(t for t in types if t['name'] == 'Base')
        r = admin_client.put(f'{URL}/{base["variant_type_id"]}', json={'name': 'Renamed'})
        assert r.status_code == 400

    def test_cannot_delete_type_assigned_to_recipe(self, admin_client):
        vt = make_variant_type(admin_client, 'InUse')
        recipe = make_recipe(admin_client, name='Recipe With Type')
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}',
                         json={'variant_type_id': vt['variant_type_id']})
        r = admin_client.delete(f'{URL}/{vt["variant_type_id"]}')
        assert r.status_code in (400, 409)

    def test_nonexistent_type_put_returns_404(self, admin_client):
        assert admin_client.put(f'{URL}/99999', json={'name': 'X'}).status_code == 404

    def test_nonexistent_type_delete_returns_404(self, admin_client):
        assert admin_client.delete(f'{URL}/99999').status_code == 404


class TestVariantTypeAccessControl:
    def test_user_can_list(self, user_client):
        assert user_client.get(URL).status_code == 200

    def test_unauthenticated_cannot_list(self, app):
        c = app.test_client()
        assert c.get(URL).status_code == 401

    def test_user_cannot_create(self, user_client):
        assert user_client.post(URL, json={'name': 'Unauthorized'}).status_code == 403

    def test_user_cannot_rename(self, admin_client, user_client):
        vt = make_variant_type(admin_client, 'AdminOnly')
        r = user_client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'Hijacked'})
        assert r.status_code == 403

    def test_user_cannot_delete(self, admin_client, user_client):
        vt = make_variant_type(admin_client, 'AdminOnlyDel')
        r = user_client.delete(f'{URL}/{vt["variant_type_id"]}')
        assert r.status_code == 403


class TestVariantTypeOnRecipe:
    def test_new_recipe_has_variant_type_fields(self, admin_client):
        recipe = make_recipe(admin_client, name='Typed Recipe')
        assert 'variant_type_id' in recipe
        assert 'variant_type_name' in recipe

    def test_recipe_variant_type_name_defaults_to_base(self, admin_client):
        recipe = make_recipe(admin_client, name='Default Type')
        assert recipe['variant_type_name'] == 'Base'

    def test_assign_variant_type_to_recipe(self, admin_client):
        vt = make_variant_type(admin_client, 'Gluten Free')
        recipe = make_recipe(admin_client, name='GF Pasta')
        admin_client.put(f'/api/recipes/{recipe["recipe_id"]}',
                         json={'variant_type_id': vt['variant_type_id']})
        updated = admin_client.get(f'/api/recipes/{recipe["recipe_id"]}').get_json()
        assert updated['variant_type_id'] == vt['variant_type_id']
        assert updated['variant_type_name'] == 'Gluten Free'

    def test_variants_list_includes_variant_type_name(self, admin_client):
        vt = make_variant_type(admin_client, 'Spicy')
        parent = make_recipe(admin_client, name='Base Curry')
        variant = make_recipe(admin_client, name='Spicy Curry')
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}', json={
            'parent_recipe_id': parent['recipe_id'],
            'variant_type_id': vt['variant_type_id'],
        })
        parent_data = admin_client.get(f'/api/recipes/{parent["recipe_id"]}').get_json()
        assert len(parent_data['variants']) == 1
        assert parent_data['variants'][0]['variant_type_name'] == 'Spicy'

    def test_parent_with_multiple_variants(self, admin_client):
        vt1 = make_variant_type(admin_client, 'Low Carb')
        vt2 = make_variant_type(admin_client, 'Dairy Free')
        parent = make_recipe(admin_client, name='Versatile Dish')
        v1 = make_recipe(admin_client, name='Versatile Dish (Low Carb)')
        v2 = make_recipe(admin_client, name='Versatile Dish (Dairy Free)')
        admin_client.put(f'/api/recipes/{v1["recipe_id"]}', json={
            'parent_recipe_id': parent['recipe_id'],
            'variant_type_id': vt1['variant_type_id'],
        })
        admin_client.put(f'/api/recipes/{v2["recipe_id"]}', json={
            'parent_recipe_id': parent['recipe_id'],
            'variant_type_id': vt2['variant_type_id'],
        })
        parent_data = admin_client.get(f'/api/recipes/{parent["recipe_id"]}').get_json()
        variant_type_names = {v['variant_type_name'] for v in parent_data['variants']}
        assert 'Low Carb' in variant_type_names
        assert 'Dairy Free' in variant_type_names

    def test_deleting_parent_removes_variant_reference(self, admin_client):
        parent = make_recipe(admin_client, name='Parent To Delete')
        variant = make_recipe(admin_client, name='Orphan Variant')
        admin_client.put(f'/api/recipes/{variant["recipe_id"]}',
                         json={'parent_recipe_id': parent['recipe_id']})
        admin_client.delete(f'/api/recipes/{parent["recipe_id"]}')
        # Variant should still exist but parent is gone
        r = admin_client.get(f'/api/recipes/{variant["recipe_id"]}')
        assert r.status_code == 200
