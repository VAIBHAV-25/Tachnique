import pytest
from rest_framework.test import APIClient
from users.models import User
from projects.models import Project, Membership, Task
from projects.airtable import export_tasks, AirtableConfigError
from projects.airtable_mock import MockAirtableTable

NO_SLEEP = lambda _s: None


@pytest.mark.django_db
class TestExportTasks:
    def _tasks(self, n):
        user = User.objects.create_user(email='e@example.com', name='E', password='password123')
        project = Project.objects.create(name='P', owner=user)
        return [Task.objects.create(project=project, title=f'T{i}', created_by=user, position=i) for i in range(n)]

    def test_exports_all_tasks_in_batches_of_ten(self):
        tasks = self._tasks(23)
        table = MockAirtableTable()
        summary = export_tasks(tasks, table, sleep=NO_SLEEP)
        assert summary == {'total': 23, 'created': 23, 'updated': 0, 'failed': 0, 'errors': []}
        assert len(table.rows) == 23
        assert table.calls == 3  # 10 + 10 + 3

    def test_second_run_updates_instead_of_duplicating(self):
        tasks = self._tasks(5)
        table = MockAirtableTable()
        export_tasks(tasks, table, sleep=NO_SLEEP)
        summary = export_tasks(tasks, table, sleep=NO_SLEEP)
        assert summary['created'] == 0
        assert summary['updated'] == 5
        assert len(table.rows) == 5

    def test_transient_failures_are_retried(self):
        tasks = self._tasks(3)
        table = MockAirtableTable(fail_times=2, fail_status=429)
        summary = export_tasks(tasks, table, sleep=NO_SLEEP)
        assert summary['created'] == 3
        assert summary['failed'] == 0

    def test_permanent_failure_is_isolated_to_one_record(self):
        tasks = self._tasks(4)
        bad_id = str(tasks[1].id)
        table = MockAirtableTable(fail_task_ids=[bad_id])
        summary = export_tasks(tasks, table, sleep=NO_SLEEP)
        assert summary['created'] == 3          # the other three still export
        assert summary['failed'] == 1
        assert summary['errors'][0]['taskId'] == bad_id
        assert bad_id not in table.rows


@pytest.mark.django_db
class TestExportEndpoint:
    def _login(self, email):
        client = APIClient()
        resp = client.post('/api/auth/login', {'email': email, 'password': 'password123'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['token']}")
        return client

    def _project(self, role):
        owner = User.objects.create_user(email='owner@example.com', name='Owner', password='password123')
        me = User.objects.create_user(email='meera@taskboard.dev', name='Meera', password='password123')
        project = Project.objects.create(name='P', owner=owner)
        Membership.objects.create(user=owner, project=project, role='admin')
        if role:
            Membership.objects.create(user=me, project=project, role=role)
        Task.objects.create(project=project, title='T', created_by=owner)
        return project

    def test_member_can_export(self, monkeypatch):
        import projects.views as views
        project = self._project('member')
        table = MockAirtableTable()
        monkeypatch.setattr(views, 'get_table', lambda: table)
        resp = self._login('meera@taskboard.dev').post(f'/api/projects/{project.id}/export')
        assert resp.status_code == 200
        assert resp.data['created'] == 1
        assert len(table.rows) == 1

    def test_viewer_cannot_export(self, monkeypatch):
        import projects.views as views
        project = self._project('viewer')
        monkeypatch.setattr(views, 'get_table', lambda: MockAirtableTable())
        resp = self._login('meera@taskboard.dev').post(f'/api/projects/{project.id}/export')
        assert resp.status_code == 403

    def test_non_member_cannot_export(self, monkeypatch):
        import projects.views as views
        project = self._project(None)
        monkeypatch.setattr(views, 'get_table', lambda: MockAirtableTable())
        resp = self._login('meera@taskboard.dev').post(f'/api/projects/{project.id}/export')
        assert resp.status_code == 403

    def test_missing_config_returns_503(self, monkeypatch):
        import projects.views as views
        project = self._project('admin')

        def raise_cfg():
            raise AirtableConfigError('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set')

        monkeypatch.setattr(views, 'get_table', raise_cfg)
        resp = self._login('meera@taskboard.dev').post(f'/api/projects/{project.id}/export')
        assert resp.status_code == 503
