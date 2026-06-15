"""Auth flow tests: login, logout, session, role enforcement."""
import pytest
from tests.conftest import login, logout, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD


class TestLogin:
    def test_valid_admin_login_returns_200(self, client):
        r = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200

    def test_valid_admin_login_sets_session_cookie(self, client):
        r = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert 'session_id' in r.headers.get('Set-Cookie', '')

    def test_valid_user_login_returns_200(self, client):
        r = login(client, USER_EMAIL, USER_PASSWORD)
        assert r.status_code == 200

    def test_wrong_password_returns_401(self, client):
        r = login(client, ADMIN_EMAIL, 'wrongpassword')
        assert r.status_code == 401

    def test_unknown_email_returns_401(self, client):
        r = login(client, 'nobody@test.com', 'anything')
        assert r.status_code == 401

    def test_missing_fields_returns_error(self, client):
        r = client.post('/api/login', json={})
        assert r.status_code in (400, 401)


class TestProtectedRoutes:
    def test_me_without_session_returns_401(self, client):
        r = client.get('/api/me')
        assert r.status_code == 401

    def test_me_with_valid_session_returns_user(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.get('/api/me')
        assert r.status_code == 200
        data = r.get_json()
        assert data['email'] == USER_EMAIL

    def test_recipes_without_session_returns_401(self, client):
        r = client.get('/api/recipes')
        assert r.status_code == 401

    def test_recipes_with_session_returns_200(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.get('/api/recipes')
        assert r.status_code == 200


class TestAdminRoleEnforcement:
    def test_admin_users_endpoint_as_regular_user_returns_403(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.get('/api/admin/users')
        assert r.status_code == 403

    def test_admin_users_endpoint_as_admin_returns_200(self, client):
        login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        r = client.get('/api/admin/users')
        assert r.status_code == 200


class TestLogout:
    def test_logout_returns_200(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = logout(client)
        assert r.status_code == 200

    def test_after_logout_protected_route_returns_401(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        logout(client)
        r = client.get('/api/me')
        assert r.status_code == 401

    def test_logout_without_session_does_not_error(self, client):
        r = logout(client)
        assert r.status_code in (200, 401)


class TestThemeSettings:
    def test_login_response_includes_settings(self, client):
        r = login(client, USER_EMAIL, USER_PASSWORD)
        data = r.get_json()
        assert 'settings' in data

    def test_me_response_includes_settings(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.get('/api/me')
        assert 'settings' in r.get_json()

    def test_save_valid_theme(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        for theme in ('light', 'stone', 'walnut', 'carbon'):
            r = client.put('/api/settings', json={'theme': theme})
            assert r.status_code == 200
            assert r.get_json()['theme'] == theme

    def test_save_invalid_theme_returns_400(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        r = client.put('/api/settings', json={'theme': 'neon'})
        assert r.status_code == 400

    def test_theme_persists_across_requests(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        client.put('/api/settings', json={'theme': 'carbon'})
        r = client.get('/api/settings')
        assert r.get_json().get('theme') == 'carbon'

    def test_theme_does_not_clobber_unit_setting(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        client.put('/api/settings', json={'unit': 'metric'})
        client.put('/api/settings', json={'theme': 'walnut'})
        r = client.get('/api/settings')
        data = r.get_json()
        assert data.get('unit') == 'metric'
        assert data.get('theme') == 'walnut'

    def test_theme_included_in_login_response_after_save(self, client):
        login(client, USER_EMAIL, USER_PASSWORD)
        client.put('/api/settings', json={'theme': 'stone'})
        logout(client)
        r = login(client, USER_EMAIL, USER_PASSWORD)
        assert r.get_json().get('settings', {}).get('theme') == 'stone'
