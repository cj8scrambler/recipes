"""Tests for calculate_ingredient_cost()."""
from decimal import Decimal
from app import calculate_ingredient_cost


class MockUnit:
    def __init__(self, unit_id, category, factor, name='', abbreviation=''):
        self.unit_id = unit_id
        self.category = category
        self.base_conversion_factor = factor
        self.name = name
        self.abbreviation = abbreviation


class MockPrice:
    def __init__(self, price, unit_id):
        self.price = Decimal(str(price))
        self.unit_id = unit_id


class MockIngredient:
    def __init__(self, prices):
        self.prices = prices


class MockRI:
    def __init__(self, ingredient, unit, quantity):
        self.ingredient = ingredient
        self.unit = unit
        self.quantity = quantity


tsp  = MockUnit(8,  'Dry Volume', 4.9289,  'Teaspoon',   'tsp')
tbsp = MockUnit(9,  'Dry Volume', 14.7868, 'Tablespoon', 'tbsp')
oz   = MockUnit(4,  'Weight',     28.3495, 'Ounce',      'oz')
gram = MockUnit(1,  'Weight',     1.0,     'Gram',       'g')

units_dict = {u.unit_id: u for u in [tsp, tbsp, oz, gram]}


class TestCalculateIngredientCost:
    def test_same_unit_exact_cost(self):
        ing = MockIngredient(prices=[MockPrice(0.10, 8)])  # $0.10/tsp
        ri = MockRI(ing, tsp, 2.0)
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is True
        assert abs(cost - 0.20) < 0.001

    def test_cost_with_unit_conversion(self):
        # Price per tbsp, recipe uses tsp
        ing = MockIngredient(prices=[MockPrice(0.30, 9)])  # $0.30/tbsp
        ri = MockRI(ing, tsp, 3.0)   # 3 tsp = 1 tbsp
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is True
        assert abs(cost - 0.30) < 0.01

    def test_no_price_data(self):
        ing = MockIngredient(prices=[])
        ri = MockRI(ing, tsp, 1.0)
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is False
        assert cost is None

    def test_incompatible_price_unit(self):
        # Price in oz (weight), recipe in tsp (volume) — no conversion possible
        ing = MockIngredient(prices=[MockPrice(0.50, 4)])
        ri = MockRI(ing, tsp, 1.0)
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is False

    def test_missing_ingredient(self):
        ri = MockRI(None, tsp, 1.0)
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is False

    def test_zero_quantity(self):
        # Zero quantity short-circuits — treated as no cost data
        ing = MockIngredient(prices=[MockPrice(0.10, 8)])
        ri = MockRI(ing, tsp, 0.0)
        cost, has_price, _ = calculate_ingredient_cost(ri, units_dict)
        assert has_price is False
