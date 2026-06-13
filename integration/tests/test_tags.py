"""Integration tests: tag CRUD, admin-only enforcement, and recipe interaction."""
from helpers import make_tag, make_recipe


class TestTagCRUD:
    def test_create_tag_returns_201(self, admin_client):
        r = admin_client.post('/api/tags', json={'name': 'Vegetarian'})
        assert r.status_code == 201

    def test_create_tag_fields_returned(self, admin_client):
        r = admin_client.post('/api/tags', json={'name': 'Vegetarian', 'description': 'No meat'})
        data = r.get_json()
        assert data['name'] == 'Vegetarian'
        assert data['description'] == 'No meat'
        assert 'tag_id' in data

    def test_create_tag_appears_in_list(self, admin_client):
        make_tag(admin_client, name='Vegetarian')
        names = [t['name'] for t in admin_client.get('/api/tags').get_json()]
        assert 'Vegetarian' in names

    def test_rename_tag(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        admin_client.put(f'/api/tags/{tag["tag_id"]}', json={'name': 'Plant-Based'})
        updated = admin_client.get(f'/api/tags/{tag["tag_id"]}').get_json()
        assert updated['name'] == 'Plant-Based'

    def test_update_tag_description(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        admin_client.put(f'/api/tags/{tag["tag_id"]}', json={'description': 'Updated'})
        updated = admin_client.get(f'/api/tags/{tag["tag_id"]}').get_json()
        assert updated['description'] == 'Updated'

    def test_delete_tag_not_in_use_returns_200(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        assert admin_client.delete(f'/api/tags/{tag["tag_id"]}').status_code == 200

    def test_delete_tag_not_in_use_removes_from_list(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        admin_client.delete(f'/api/tags/{tag["tag_id"]}')
        ids = [t['tag_id'] for t in admin_client.get('/api/tags').get_json()]
        assert tag['tag_id'] not in ids

    def test_delete_tag_in_use_returns_400(self, admin_client):
        tag    = make_tag(admin_client, name='Vegetarian')
        make_recipe(admin_client, tags=[{'tag_id': tag['tag_id']}])
        assert admin_client.delete(f'/api/tags/{tag["tag_id"]}').status_code == 400

    def test_delete_tag_in_use_error_mentions_recipe_count(self, admin_client):
        tag = make_tag(admin_client, name='Vegetarian')
        make_recipe(admin_client, tags=[{'tag_id': tag['tag_id']}])
        r = admin_client.delete(f'/api/tags/{tag["tag_id"]}')
        assert '1' in r.get_json()['error']

    def test_get_nonexistent_tag_returns_404(self, admin_client):
        assert admin_client.get('/api/tags/99999').status_code == 404


class TestTagAdminEnforcement:
    def test_regular_user_cannot_create_tag(self, user_client):
        r = user_client.post('/api/tags', json={'name': 'Vegetarian'})
        assert r.status_code == 403

    def test_regular_user_cannot_rename_tag(self, admin_client, user_client):
        tag = make_tag(admin_client, name='Vegetarian')
        r = user_client.put(f'/api/tags/{tag["tag_id"]}', json={'name': 'New Name'})
        assert r.status_code == 403

    def test_regular_user_cannot_delete_tag(self, admin_client, user_client):
        tag = make_tag(admin_client, name='Vegetarian')
        r = user_client.delete(f'/api/tags/{tag["tag_id"]}')
        assert r.status_code == 403

    def test_regular_user_can_read_tags(self, user_client):
        assert user_client.get('/api/tags').status_code == 200
