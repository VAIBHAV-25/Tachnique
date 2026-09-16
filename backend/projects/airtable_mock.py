"""In-memory stand-in for a pyairtable Table, used only in unit tests.

It mirrors the one method the exporter depends on - ``batch_upsert`` - including
its upsert-on-key semantics and its create/update payload shape, and can be told
to simulate transient and permanent API failures.
"""


class _Response:
    def __init__(self, status_code):
        self.status_code = status_code


class MockHttpError(Exception):
    def __init__(self, status_code):
        super().__init__(f'Airtable HTTP {status_code}')
        self.response = _Response(status_code)


class MockAirtableTable:
    def __init__(self, fail_times=0, fail_status=429, fail_task_ids=None):
        self.rows = {}                 # merge key -> stored fields
        self.calls = 0
        self._fail_times = fail_times  # first N calls raise a transient error
        self._fail_status = fail_status
        self._fail_task_ids = set(fail_task_ids or [])  # always raise a permanent error

    def batch_upsert(self, records, key_fields, typecast=False):
        self.calls += 1
        if self._fail_times > 0:
            self._fail_times -= 1
            raise MockHttpError(self._fail_status)

        key = key_fields[0]
        for record in records:
            if record['fields'].get(key) in self._fail_task_ids:
                raise MockHttpError(422)  # permanent: unprocessable record

        created, updated = [], []
        for record in records:
            k = record['fields'][key]
            if k in self.rows:
                self.rows[k].update(record['fields'])
                updated.append({'id': f'rec_{k}', 'fields': dict(self.rows[k])})
            else:
                self.rows[k] = dict(record['fields'])
                created.append({'id': f'rec_{k}', 'fields': dict(self.rows[k])})
        return {'createdRecords': created, 'updatedRecords': updated, 'records': created + updated}
