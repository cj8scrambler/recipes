"""Variant type endpoint tests."""
import pytest
from tests.conftest import login, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD

URL = '/api/variant-types'


@pytest.fixture(autouse=True)
def logged_in(client):
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD)


def _create(client, name):
    r = client.post(URL, json={'name': name})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def _delete(client, type_id):
    client.delete(f'{URL}/{type_id}')


class TestVariantTypeList:
    def test_list_returns_200(self, client):
        assert client.get(URL).status_code == 200

    def test_list_returns_list(self, client):
        assert isinstance(client.get(URL).get_json(), list)

    def test_list_includes_base(self, client):
        names = [t['name'] for t in client.get(URL).get_json()]
        assert 'Base' in names

    def test_list_items_have_expected_fields(self, client):
        items = client.get(URL).get_json()
        assert len(items) > 0
        for field in ('variant_type_id', 'name', 'is_protected'):
            assert field in items[0]

    def test_base_is_marked_protected(self, client):
        items = client.get(URL).get_json()
        base = next(t for t in items if t['name'] == 'Base')
        assert base['is_protected'] is True


class TestVariantTypeCreate:
    def test_create_returns_201(self, client):
        r = client.post(URL, json={'name': 'VT_Create1'})
        assert r.status_code == 201
        _delete(client, r.get_json()['variant_type_id'])

    def test_created_type_in_list(self, client):
        vt = _create(client, 'VT_Create2')
        names = [t['name'] for t in client.get(URL).get_json()]
        assert 'VT_Create2' in names
        _delete(client, vt['variant_type_id'])

    def test_created_type_not_protected(self, client):
        vt = _create(client, 'VT_Create3')
        assert vt['is_protected'] is False
        _delete(client, vt['variant_type_id'])

    def test_duplicate_name_returns_error(self, client):
        vt = _create(client, 'VT_Dupe')
        r = client.post(URL, json={'name': 'VT_Dupe'})
        assert r.status_code in (400, 409)
        _delete(client, vt['variant_type_id'])

    def test_missing_name_returns_400(self, client):
        assert client.post(URL, json={}).status_code == 400

    def test_user_cannot_create(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        assert client.post(URL, json={'name': 'VT_UserFail'}).status_code == 403


class TestVariantTypeUpdate:
    def test_rename_returns_200(self, client):
        vt = _create(client, 'VT_Rename1_Old')
        r = client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'VT_Rename1_New'})
        assert r.status_code == 200
        _delete(client, vt['variant_type_id'])

    def test_renamed_value_persisted(self, client):
        vt = _create(client, 'VT_Rename2_Old')
        client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'VT_Rename2_New'})
        names = [t['name'] for t in client.get(URL).get_json()]
        assert 'VT_Rename2_New' in names
        assert 'VT_Rename2_Old' not in names
        _delete(client, vt['variant_type_id'])

    def test_cannot_rename_protected_type(self, client):
        items = client.get(URL).get_json()
        base = next(t for t in items if t['is_protected'])
        r = client.put(f'{URL}/{base["variant_type_id"]}', json={'name': 'NotBase'})
        assert r.status_code == 400

    def test_nonexistent_type_returns_404(self, client):
        assert client.put(f'{URL}/99999', json={'name': 'X'}).status_code == 404

    def test_user_cannot_rename(self, client):
        vt = _create(client, 'VT_UserRename')
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.put(f'{URL}/{vt["variant_type_id"]}', json={'name': 'Hijacked'})
        assert r.status_code == 403
        login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        _delete(client, vt['variant_type_id'])


class TestVariantTypeDelete:
    def test_delete_returns_200(self, client):
        vt = _create(client, 'VT_Del1')
        assert client.delete(f'{URL}/{vt["variant_type_id"]}').status_code == 200

    def test_deleted_type_not_in_list(self, client):
        vt = _create(client, 'VT_Del2')
        client.delete(f'{URL}/{vt["variant_type_id"]}')
        names = [t['name'] for t in client.get(URL).get_json()]
        assert 'VT_Del2' not in names

    def test_cannot_delete_protected_type(self, client):
        items = client.get(URL).get_json()
        base = next(t for t in items if t['is_protected'])
        r = client.delete(f'{URL}/{base["variant_type_id"]}')
        assert r.status_code in (400, 403)

    def test_nonexistent_type_returns_404(self, client):
        assert client.delete(f'{URL}/99999').status_code == 404

    def test_user_cannot_delete(self, client):
        vt = _create(client, 'VT_UserDel')
        login(client, USER_EMAIL, USER_PASSWORD)
        assert client.delete(f'{URL}/{vt["variant_type_id"]}').status_code == 403
        login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        _delete(client, vt['variant_type_id'])
