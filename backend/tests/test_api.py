"""API smoke tests: verify key endpoints return expected shapes."""
import pytest
from tests.conftest import login, ADMIN_EMAIL, ADMIN_PASSWORD


@pytest.fixture(autouse=True)
def logged_in(client):
    """Log in as admin before each test in this module."""
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD)


class TestRecipeEndpoints:
    def test_list_recipes_returns_200(self, client):
        r = client.get('/api/recipes')
        assert r.status_code == 200

    def test_list_recipes_returns_list(self, client):
        r = client.get('/api/recipes')
        assert isinstance(r.get_json(), list)

    def test_get_recipe_returns_200(self, client):
        r = client.get('/api/recipes/1')
        assert r.status_code == 200

    def test_get_recipe_has_expected_fields(self, client):
        data = client.get('/api/recipes/1').get_json()
        for field in ('recipe_id', 'name', 'ingredients', 'base_servings'):
            assert field in data

    def test_get_nonexistent_recipe_returns_404(self, client):
        r = client.get('/api/recipes/9999')
        assert r.status_code == 404

    def test_recipe_weight_returns_200(self, client):
        r = client.get('/api/recipes/1/weight')
        assert r.status_code == 200

    def test_recipe_weight_has_expected_fields(self, client):
        data = client.get('/api/recipes/1/weight').get_json()
        assert 'total_weight' in data
        assert 'ingredients_weight' in data


class TestIngredientEndpoints:
    def test_list_ingredients_returns_200(self, client):
        r = client.get('/api/ingredients')
        assert r.status_code == 200

    def test_list_ingredients_returns_list(self, client):
        assert isinstance(client.get('/api/ingredients').get_json(), list)

    def test_get_ingredient_returns_200(self, client):
        r = client.get('/api/ingredients/1')
        assert r.status_code == 200

    def test_ingredient_has_expected_fields(self, client):
        data = client.get('/api/ingredients/1').get_json()
        for field in ('ingredient_id', 'name', 'default_unit_id', 'weight', 'density'):
            assert field in data

    def test_get_nonexistent_ingredient_returns_404(self, client):
        r = client.get('/api/ingredients/9999')
        assert r.status_code == 404


class TestUnitEndpoints:
    def test_list_units_returns_200(self, client):
        r = client.get('/api/units')
        assert r.status_code == 200

    def test_list_units_returns_list(self, client):
        assert isinstance(client.get('/api/units').get_json(), list)

    def test_units_have_expected_fields(self, client):
        units = client.get('/api/units').get_json()
        assert len(units) > 0
        for field in ('unit_id', 'name', 'abbreviation', 'category'):
            assert field in units[0]


class TestConfigEndpoint:
    def test_is_test_database_returns_200(self, client):
        r = client.get('/api/is-test-database')
        assert r.status_code == 200

    def test_sqlite_is_flagged_as_test(self, client):
        data = client.get('/api/is-test-database').get_json()
        assert data['is_test'] is True
