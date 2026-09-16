import pytest
from rest_framework.test import APIClient
from users.models import User
from projects.models import Project, Membership, Task


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(email='meera@taskboard.dev', name='Meera Iyer', password='password123')


@pytest.fixture
def auth_client(client, user):
    response = client.post('/api/auth/login', {
        'email': 'meera@taskboard.dev',
        'password': 'password123',
    }, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['token']}")
    return client


@pytest.mark.django_db
class TestProjects:
    def test_create_project(self, auth_client, user):
        response = auth_client.post('/api/projects', {'name': 'My Project'}, format='json')
        assert response.status_code == 201
        assert response.data['project']['name'] == 'My Project'

    def test_list_only_returns_member_projects(self, auth_client, user):
        p1 = Project.objects.create(name='Mine', owner=user)
        Membership.objects.create(user=user, project=p1, role='admin')
        other = User.objects.create_user(email='other@example.com', name='Other', password='password123')
        p2 = Project.objects.create(name='Not Mine', owner=other)
        Membership.objects.create(user=other, project=p2, role='admin')

        response = auth_client.get('/api/projects')
        assert response.status_code == 200
        names = [p['name'] for p in response.data['projects']]
        assert 'Mine' in names
        assert 'Not Mine' not in names

    def test_get_project_detail(self, auth_client, user):
        project = Project.objects.create(name='My Project', owner=user)
        Membership.objects.create(user=user, project=project, role='admin')

        response = auth_client.get(f'/api/projects/{project.id}')
        assert response.status_code == 200
        assert response.data['project']['name'] == 'My Project'

    def test_non_member_cannot_view_project(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        project = Project.objects.create(name='Private', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')

        resp = client.post('/api/auth/login', {'email': 'meera@taskboard.dev', 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

        response = client.get(f'/api/projects/{project.id}')
        assert response.status_code == 403


@pytest.mark.django_db
class TestTasks:
    def test_create_task(self, auth_client, user):
        project = Project.objects.create(name='P', owner=user)
        Membership.objects.create(user=user, project=project, role='admin')

        response = auth_client.post(f'/api/projects/{project.id}/tasks', {'title': 'Do a thing'}, format='json')
        assert response.status_code == 201
        assert response.data['task']['title'] == 'Do a thing'

    def test_viewers_cannot_create_tasks(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        Membership.objects.create(user=user, project=project, role='viewer')

        resp = client.post('/api/auth/login', {'email': 'meera@taskboard.dev', 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

        response = client.post(f'/api/projects/{project.id}/tasks', {'title': 'A task'}, format='json')
        assert response.status_code == 403

    def test_delete_task_requires_membership(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        task = Task.objects.create(project=project, title='A task', created_by=owner)

        resp = client.post('/api/auth/login', {'email': 'meera@taskboard.dev', 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

        response = client.delete(f'/api/tasks/{task.id}')
        assert response.status_code == 403


@pytest.mark.django_db
class TestTaskSearch:
    def _setup(self, user):
        project = Project.objects.create(name='P', owner=user)
        Membership.objects.create(user=user, project=project, role='admin')
        Task.objects.create(project=project, title='Draft press release', created_by=user)
        Task.objects.create(project=project, title='Record demo video', created_by=user)
        return project

    def test_search_filters_by_title_case_insensitive(self, auth_client, user):
        project = self._setup(user)
        response = auth_client.get(f'/api/projects/{project.id}/tasks?q=PRESS')
        assert response.status_code == 200
        titles = [t['title'] for t in response.data['tasks']]
        assert titles == ['Draft press release']

    def test_search_payload_cannot_inject_sql(self, auth_client, user):
        project = self._setup(user)
        payload = ("zzz') UNION SELECT id, id, email, password, 'x', NULL::uuid, "
                   "NULL::uuid, 0, created_at, updated_at FROM users --")
        response = auth_client.get(f'/api/projects/{project.id}/tasks', {'q': payload})
        assert response.status_code == 200
        # treated as a literal search term: matches nothing, leaks nothing
        assert response.data['tasks'] == []

    def test_search_never_leaks_password_hashes(self, auth_client, user):
        project = self._setup(user)
        payload = "' OR '1'='1"
        response = auth_client.get(f'/api/projects/{project.id}/tasks', {'q': payload})
        assert response.status_code == 200
        blob = str(response.data['tasks'])
        assert 'pbkdf2' not in blob


@pytest.mark.django_db
class TestTaskUpdateAuthorization:
    def _project_with_task(self, owner):
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        task = Task.objects.create(project=project, title='Original', created_by=owner)
        return project, task

    def _auth(self, client):
        resp = client.post('/api/auth/login', {'email': 'meera@taskboard.dev', 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

    def test_non_member_cannot_update_task(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        _, task = self._project_with_task(owner)
        self._auth(client)
        response = client.patch(f'/api/tasks/{task.id}', {'title': 'hijacked'}, format='json')
        assert response.status_code == 403
        task.refresh_from_db()
        assert task.title == 'Original'

    def test_viewer_cannot_update_task(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        project, task = self._project_with_task(owner)
        Membership.objects.create(user=user, project=project, role='viewer')
        self._auth(client)
        response = client.patch(f'/api/tasks/{task.id}', {'title': 'hijacked'}, format='json')
        assert response.status_code == 403
        task.refresh_from_db()
        assert task.title == 'Original'

    def test_member_can_update_task(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        project, task = self._project_with_task(owner)
        Membership.objects.create(user=user, project=project, role='member')
        self._auth(client)
        response = client.patch(f'/api/tasks/{task.id}', {'title': 'updated'}, format='json')
        assert response.status_code == 200
        task.refresh_from_db()
        assert task.title == 'updated'


@pytest.mark.django_db
class TestProjectListPerformance:
    def test_project_list_is_constant_query_count(self, auth_client, user, django_assert_max_num_queries):
        for i in range(5):
            p = Project.objects.create(name=f'P{i}', owner=user)
            Membership.objects.create(user=user, project=p, role='admin')
            for j in range(3):
                Task.objects.create(project=p, title=f't{i}-{j}', created_by=user)
        # no N+1: task counts are annotated, not counted per project
        with django_assert_max_num_queries(4):
            response = auth_client.get('/api/projects')
        assert response.status_code == 200
        assert len(response.data['projects']) == 5
        assert all(p['taskCount'] == 3 for p in response.data['projects'])


@pytest.mark.django_db
class TestApiShape:
    def test_task_response_uses_camelcase(self, auth_client, user):
        project = Project.objects.create(name='P', owner=user)
        Membership.objects.create(user=user, project=project, role='admin')
        assignee = User.objects.create_user(email='a@example.com', name='A', password='password123')
        Task.objects.create(project=project, title='T', assignee=assignee, created_by=user)
        response = auth_client.get(f'/api/projects/{project.id}')
        task = response.data['project']['tasks'][0]
        for key in ('projectId', 'assigneeId', 'createdById', 'createdAt', 'updatedAt'):
            assert key in task
        assert task['assigneeId'] == str(assignee.id)
