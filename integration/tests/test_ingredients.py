"""Integration tests: ingredient CRUD and price management."""
import pytest
from helpers import make_ingredient, SPICE_ID, SPICE_UNIT, MEAT_UNIT


class TestIngredientCRUD:
    def test_create_ingredient_returns_201(self, admin_client):
        r = admin_client.post('/api/ingredients', json={'name': 'Salt', 'default_unit_id': SPICE_UNIT})
        assert r.status_code == 201

    def test_create_ingredient_appears_in_list(self, admin_client):
        make_ingredient(admin_client, name='Salt')
        names = [i['name'] for i in admin_client.get('/api/ingredients').get_json()]
        assert 'Salt' in names

    def test_create_ingredient_fields_returned(self, admin_client):
        r = admin_client.post('/api/ingredients', json={
            'name': 'Salt', 'default_unit_id': SPICE_UNIT,
            'density': 1.2, 'gluten_status': 'Gluten-Free',
        })
        data = r.get_json()
        assert data['name'] == 'Salt'
        assert data['default_unit_id'] == SPICE_UNIT
        assert data['density'] == pytest.approx(1.2, rel=1e-3)
        assert data['gluten_status'] == 'Gluten-Free'

    def test_create_duplicate_name_returns_409(self, admin_client):
        make_ingredient(admin_client, name='Salt')
        r = admin_client.post('/api/ingredients', json={'name': 'Salt', 'default_unit_id': SPICE_UNIT})
        assert r.status_code == 409

    def test_duplicate_error_message_is_readable(self, admin_client):
        make_ingredient(admin_client, name='Salt')
        r = admin_client.post('/api/ingredients', json={'name': 'Salt', 'default_unit_id': SPICE_UNIT})
        assert 'already exists' in r.get_json()['error'].lower()

    def test_get_ingredient_by_id(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        r = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}')
        assert r.status_code == 200
        assert r.get_json()['name'] == 'Salt'

    def test_get_nonexistent_ingredient_returns_404(self, admin_client):
        assert admin_client.get('/api/ingredients/99999').status_code == 404

    def test_update_ingredient_name(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        admin_client.put(f'/api/ingredients/{ingredient["ingredient_id"]}', json={'name': 'Sea Salt'})
        updated = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}').get_json()
        assert updated['name'] == 'Sea Salt'

    def test_update_ingredient_density(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Flour')
        admin_client.put(f'/api/ingredients/{ingredient["ingredient_id"]}', json={'density': 0.593})
        updated = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}').get_json()
        assert updated['density'] == pytest.approx(0.593, rel=1e-3)

    def test_update_gluten_status(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Soy Sauce')
        admin_client.put(f'/api/ingredients/{ingredient["ingredient_id"]}',
                         json={'gluten_status': 'Contains'})
        updated = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}').get_json()
        assert updated['gluten_status'] == 'Contains'

    def test_delete_ingredient_returns_200(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        assert admin_client.delete(f'/api/ingredients/{ingredient["ingredient_id"]}').status_code == 200

    def test_delete_ingredient_returns_404_on_subsequent_get(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        admin_client.delete(f'/api/ingredients/{ingredient["ingredient_id"]}')
        assert admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}').status_code == 404

    def test_seed_ingredients_present(self, admin_client):
        names = [i['name'] for i in admin_client.get('/api/ingredients').get_json()]
        assert 'Test Spice' in names
        assert 'Test Meat' in names


class TestIngredientPrices:
    def test_add_price_returns_201(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        r = admin_client.post(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices',
            json={'price': 0.05, 'unit_id': SPICE_UNIT}
        )
        assert r.status_code == 201

    def test_price_fields_returned(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        r = admin_client.post(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices',
            json={'price': 0.05, 'unit_id': SPICE_UNIT}
        )
        data = r.get_json()
        assert data['price'] == pytest.approx(0.05)
        assert data['unit_id'] == SPICE_UNIT
        assert 'price_id' in data

    def test_add_price_appears_in_list(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        admin_client.post(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices',
            json={'price': 0.05, 'unit_id': SPICE_UNIT}
        )
        prices = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}/prices').get_json()
        assert len(prices) == 1
        assert prices[0]['price'] == pytest.approx(0.05)

    def test_update_price(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        price_id = admin_client.post(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices',
            json={'price': 0.05, 'unit_id': SPICE_UNIT}
        ).get_json()['price_id']
        admin_client.put(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices/{price_id}',
            json={'price': 0.10}
        )
        prices = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}/prices').get_json()
        assert prices[0]['price'] == pytest.approx(0.10)

    def test_delete_price(self, admin_client):
        ingredient = make_ingredient(admin_client, name='Salt')
        price_id = admin_client.post(
            f'/api/ingredients/{ingredient["ingredient_id"]}/prices',
            json={'price': 0.05, 'unit_id': SPICE_UNIT}
        ).get_json()['price_id']
        admin_client.delete(f'/api/ingredients/{ingredient["ingredient_id"]}/prices/{price_id}')
        prices = admin_client.get(f'/api/ingredients/{ingredient["ingredient_id"]}/prices').get_json()
        assert prices == []

    def test_seed_spice_has_price(self, admin_client):
        prices = admin_client.get(f'/api/ingredients/{SPICE_ID}/prices').get_json()
        assert len(prices) == 1
        assert prices[0]['price'] == pytest.approx(0.02)
