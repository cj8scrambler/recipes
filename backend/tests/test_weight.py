"""Tests for calculate_ingredient_weight() covering all three resolution paths."""
from app import calculate_ingredient_weight


class MockUnit:
    def __init__(self, unit_id, category, factor):
        self.unit_id = unit_id
        self.category = category
        self.base_conversion_factor = factor


class MockIngredient:
    def __init__(self, weight, default_unit_id, default_unit, density=None):
        self.weight = weight
        self.default_unit_id = default_unit_id
        self.default_unit = default_unit
        self.density = density


class MockRI:
    def __init__(self, ingredient, unit, quantity):
        self.ingredient = ingredient
        self.unit = unit
        self.quantity = quantity


gram    = MockUnit(1,  'Weight',        1.0)
oz      = MockUnit(4,  'Weight',        28.3495)
tsp     = MockUnit(8,  'Dry Volume',    4.9289)
tbsp    = MockUnit(9,  'Dry Volume',    14.7868)
cup_dry = MockUnit(10, 'Dry Volume',    236.588)
each    = MockUnit(14, 'Item',          None)

units_dict = {u.unit_id: u for u in [gram, oz, tsp, tbsp, cup_dry, each]}


class TestPath1RecipeUnitIsWeight:
    """Recipe unit is a Weight unit — compute directly, no ingredient.weight needed."""

    def test_oz_quantity_gives_grams(self):
        ing = MockIngredient(weight=None, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, oz, 2.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 56.699) < 0.01

    def test_gram_quantity_is_direct(self):
        ing = MockIngredient(weight=None, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, gram, 10.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 10.0) < 0.001


class TestPath2SameUnit:
    """Recipe unit == ingredient default unit — multiply directly."""

    def test_tsp_matches_default_tsp(self):
        ing = MockIngredient(weight=3.5, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, tsp, 2.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 7.0) < 0.001

    def test_each_matches_default_each(self):
        ing = MockIngredient(weight=55.0, default_unit_id=14, default_unit=each)
        ri = MockRI(ing, each, 3.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 165.0) < 0.001


class TestPath2bVolumeToVolume:
    """Recipe and default units are both volume — convert then multiply."""

    def test_tbsp_recipe_tsp_default(self):
        ing = MockIngredient(weight=3.5, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, tbsp, 1.0)  # 1 tbsp = 3 tsp
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 10.5) < 0.1

    def test_cup_recipe_tsp_default(self):
        ing = MockIngredient(weight=3.5, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, cup_dry, 1.0)  # 1 cup = 48 tsp
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        assert abs(result['scaled_weight'] - 168.0) < 1.0


class TestPath3Density:
    """Recipe unit is Volume, default unit is Weight — use density."""

    def test_tsp_with_density(self):
        # Salt: default=gram, density=1.217 g/mL, recipe uses tsp (4.9289 mL)
        ing = MockIngredient(weight=1.0, default_unit_id=1, default_unit=gram, density=1.217)
        ri = MockRI(ing, tsp, 0.5)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is True
        # 0.5 tsp × 4.9289 mL/tsp × 1.217 g/mL ≈ 3.0g
        assert abs(result['scaled_weight'] - 3.0) < 0.1

    def test_missing_density_returns_no_weight(self):
        ing = MockIngredient(weight=1.0, default_unit_id=1, default_unit=gram, density=None)
        ri = MockRI(ing, tsp, 0.5)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is False


class TestEdgeCases:
    def test_missing_ingredient_returns_no_weight(self):
        ri = MockRI(None, tsp, 1.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is False

    def test_none_quantity_returns_no_weight(self):
        ing = MockIngredient(weight=3.5, default_unit_id=8, default_unit=tsp)
        ri = MockRI(ing, tsp, None)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is False

    def test_no_weight_no_density_returns_no_weight(self):
        ing = MockIngredient(weight=None, default_unit_id=8, default_unit=tsp, density=None)
        ri = MockRI(ing, cup_dry, 1.0)
        result = calculate_ingredient_weight(ri, units_dict)
        assert result['has_weight'] is False
