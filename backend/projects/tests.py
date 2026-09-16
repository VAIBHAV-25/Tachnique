import pytest
from rest_framework.test import APIClient
from users.models import User
from projects.models import Project, Membership, Task, Comment, Activity


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


@pytest.mark.django_db
class TestComments:
    def _make(self, owner, viewer=None, member=None):
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        if viewer:
            Membership.objects.create(user=viewer, project=project, role='viewer')
        if member:
            Membership.objects.create(user=member, project=project, role='member')
        task = Task.objects.create(project=project, title='T', created_by=owner)
        return project, task

    def _login(self, client, email):
        resp = client.post('/api/auth/login', {'email': email, 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

    def test_member_can_post_and_list_chronologically(self, auth_client, user):
        _, task = self._make(user)
        auth_client.post(f'/api/tasks/{task.id}/comments', {'body': 'first'}, format='json')
        auth_client.post(f'/api/tasks/{task.id}/comments', {'body': 'second'}, format='json')
        response = auth_client.get(f'/api/tasks/{task.id}/comments')
        assert response.status_code == 200
        bodies = [c['body'] for c in response.data['comments']]
        assert bodies == ['first', 'second']
        assert response.data['comments'][0]['author']['email'] == 'meera@taskboard.dev'

    def test_viewer_can_read_but_not_post(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        _, task = self._make(owner, viewer=user)
        Comment.objects.create(task=task, author=owner, body='hello')
        self._login(client, 'meera@taskboard.dev')
        read = client.get(f'/api/tasks/{task.id}/comments')
        assert read.status_code == 200
        assert len(read.data['comments']) == 1
        posted = client.post(f'/api/tasks/{task.id}/comments', {'body': 'nope'}, format='json')
        assert posted.status_code == 403

    def test_non_member_cannot_read_or_post(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        _, task = self._make(owner)
        self._login(client, 'meera@taskboard.dev')
        assert client.get(f'/api/tasks/{task.id}/comments').status_code == 403
        assert client.post(f'/api/tasks/{task.id}/comments', {'body': 'x'}, format='json').status_code == 403

    def test_empty_body_rejected(self, auth_client, user):
        _, task = self._make(user)
        response = auth_client.post(f'/api/tasks/{task.id}/comments', {'body': '   '}, format='json')
        assert response.status_code == 400

    def test_comments_are_append_only(self, auth_client, user):
        _, task = self._make(user)
        auth_client.post(f'/api/tasks/{task.id}/comments', {'body': 'permanent'}, format='json')
        comment = Comment.objects.get(task=task)
        # there is no comment detail route: edits/deletes are not routable
        assert auth_client.patch(f'/api/comments/{comment.id}', {'body': 'edited'}, format='json').status_code == 404
        assert auth_client.delete(f'/api/comments/{comment.id}').status_code == 404


@pytest.mark.django_db
class TestActivityFeed:
    def _project(self, owner, member=None):
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        if member:
            Membership.objects.create(user=member, project=project, role='member')
        return project

    def _login(self, client, email='meera@taskboard.dev'):
        resp = client.post('/api/auth/login', {'email': email, 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")

    def test_task_lifecycle_is_recorded_newest_first(self, auth_client, user):
        project = self._project(user)
        create = auth_client.post(f'/api/projects/{project.id}/tasks', {'title': 'Ship it'}, format='json')
        task_id = create.data['task']['id']
        auth_client.patch(f'/api/tasks/{task_id}', {'status': 'in_progress'}, format='json')
        auth_client.post(f'/api/tasks/{task_id}/comments', {'body': 'on it'}, format='json')

        response = auth_client.get(f'/api/projects/{project.id}/activity')
        assert response.status_code == 200
        actions = [a['action'] for a in response.data['activities']]
        assert actions == ['comment_added', 'task_status_changed', 'task_created']
        moved = response.data['activities'][1]
        assert moved['summary'] == 'moved "Ship it" from To do to In progress'
        assert moved['actor']['email'] == 'meera@taskboard.dev'

    def test_assignee_change_is_recorded(self, auth_client, user):
        project = self._project(user)
        assignee = User.objects.create_user(email='a@example.com', name='Aria', password='password123')
        Membership.objects.create(user=assignee, project=project, role='member')
        create = auth_client.post(f'/api/projects/{project.id}/tasks', {'title': 'T'}, format='json')
        auth_client.patch(f'/api/tasks/{create.data["task"]["id"]}', {'assigneeId': str(assignee.id)}, format='json')
        response = auth_client.get(f'/api/projects/{project.id}/activity')
        latest = response.data['activities'][0]
        assert latest['action'] == 'task_assignee_changed'
        assert latest['summary'] == 'assigned "T" to Aria'

    def test_feed_is_scoped_and_member_only(self, client, user):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        mine = self._project(owner, member=user)
        other = Project.objects.create(name='Other', owner=owner)
        Membership.objects.create(user=owner, project=other, role='admin')
        Activity.objects.create(project=other, actor=owner, action='task_created', metadata={'taskTitle': 'secret'})

        self._login(client)
        # member sees only their project's feed
        resp = client.get(f'/api/projects/{mine.id}/activity')
        assert resp.status_code == 200
        assert resp.data['activities'] == []
        # non-member is denied
        assert client.get(f'/api/projects/{other.id}/activity').status_code == 403

    def test_activity_write_failure_rolls_back_the_change(self, auth_client, user, monkeypatch):
        project = self._project(user)
        import projects.views as views

        def boom(*args, **kwargs):
            raise RuntimeError('audit sink down')

        monkeypatch.setattr(views, 'record_activity', boom)
        auth_client.raise_request_exception = False
        before = Task.objects.filter(project=project).count()
        resp = auth_client.post(f'/api/projects/{project.id}/tasks', {'title': 'X'}, format='json')
        assert resp.status_code == 500
        # the task creation is rolled back with the failed audit write
        assert Task.objects.filter(project=project).count() == before
