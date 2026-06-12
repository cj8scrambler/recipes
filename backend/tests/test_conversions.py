"""Pure function tests for unit conversion math. No DB required."""
from app import convert_unit_quantity, can_convert_units


class MockUnit:
    def __init__(self, unit_id, category, factor):
        self.unit_id = unit_id
        self.category = category
        self.base_conversion_factor = factor


gram    = MockUnit(1,  'Weight',        1.0)
oz      = MockUnit(4,  'Weight',        28.3495)
lb      = MockUnit(5,  'Weight',        453.592)
tsp     = MockUnit(8,  'Dry Volume',    4.9289)
tbsp    = MockUnit(9,  'Dry Volume',    14.7868)
cup_dry = MockUnit(10, 'Dry Volume',    236.588)
floz    = MockUnit(11, 'Liquid Volume', 29.5735)
cup_liq = MockUnit(12, 'Liquid Volume', 236.588)
each    = MockUnit(14, 'Item',          None)


class TestCanConvertUnits:
    def test_same_category(self):
        assert can_convert_units(gram, oz) is True

    def test_weight_to_weight(self):
        assert can_convert_units(oz, lb) is True

    def test_dry_volume_to_dry_volume(self):
        assert can_convert_units(tsp, cup_dry) is True

    def test_liquid_to_dry_volume(self):
        # Both are volume sub-types — should convert
        assert can_convert_units(floz, tsp) is True

    def test_dry_volume_to_liquid_volume(self):
        assert can_convert_units(cup_dry, cup_liq) is True

    def test_weight_to_volume(self):
        assert can_convert_units(gram, tsp) is False

    def test_volume_to_weight(self):
        assert can_convert_units(tsp, oz) is False

    def test_item_to_weight(self):
        assert can_convert_units(each, oz) is False

    def test_none_unit(self):
        assert can_convert_units(None, oz) is False
        assert can_convert_units(gram, None) is False


class TestConvertUnitQuantity:
    def test_same_unit_is_identity(self):
        assert convert_unit_quantity(5.0, gram, gram) == 5.0

    def test_oz_to_grams(self):
        result = convert_unit_quantity(1.0, oz, gram)
        assert abs(result - 28.3495) < 0.001

    def test_grams_to_oz(self):
        result = convert_unit_quantity(28.3495, gram, oz)
        assert abs(result - 1.0) < 0.001

    def test_tsp_to_tbsp(self):
        result = convert_unit_quantity(3.0, tsp, tbsp)
        assert abs(result - 1.0) < 0.01

    def test_tbsp_to_tsp(self):
        result = convert_unit_quantity(1.0, tbsp, tsp)
        assert abs(result - 3.0) < 0.01

    def test_cup_to_tsp(self):
        result = convert_unit_quantity(1.0, cup_dry, tsp)
        assert abs(result - 48.0) < 0.1

    def test_liquid_cup_to_floz(self):
        result = convert_unit_quantity(1.0, cup_liq, floz)
        assert abs(result - 8.0) < 0.01

    def test_incompatible_returns_none(self):
        assert convert_unit_quantity(1.0, gram, tsp) is None

    def test_none_factor_different_units_returns_none(self):
        # Two item units with different ids and None factors — can't convert
        each2 = MockUnit(15, 'Item', None)
        assert convert_unit_quantity(1.0, each, each2) is None

    def test_zero_quantity(self):
        assert convert_unit_quantity(0.0, oz, gram) == 0.0
