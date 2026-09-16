import os
import time

# Records are matched on this field so re-running the export updates rows in
# place instead of creating duplicates.
MERGE_KEY = 'Task ID'
BATCH_SIZE = 10          # Airtable accepts at most 10 records per write
MAX_RETRIES = 3


class AirtableConfigError(RuntimeError):
    pass


def build_fields(task):
    return {
        'Task ID': str(task.id),
        'Title': task.title,
        'Description': task.description or '',
        'Status': task.status,
        'Assignee': task.assignee.name if task.assignee else '',
        'Position': task.position,
        'Created At': task.created_at.isoformat(),
    }


def get_table():
    """Build a real pyairtable Table from the environment."""
    api_key = os.environ.get('AIRTABLE_API_KEY')
    base_id = os.environ.get('AIRTABLE_BASE_ID')
    table_name = os.environ.get('AIRTABLE_TABLE_NAME', 'Tasks')
    if not api_key or not base_id:
        raise AirtableConfigError('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set')
    from pyairtable import Api
    return Api(api_key).table(base_id, table_name)


def _status_code(exc):
    return getattr(getattr(exc, 'response', None), 'status_code', None)


def _is_transient(exc):
    code = _status_code(exc)
    if code is None:
        return True  # connection/timeout error with no HTTP response
    return code == 429 or 500 <= code < 600


def _backoff(attempt):
    return min(2 ** attempt, 8)


def export_tasks(tasks, table, *, batch_size=BATCH_SIZE, max_retries=MAX_RETRIES, sleep=time.sleep):
    """Upsert tasks into an Airtable table. Idempotent on MERGE_KEY.

    Transient failures are retried with backoff; permanent failures are not; a
    failing batch is retried record-by-record so one bad record never aborts the
    whole export. Returns a summary dict.
    """
    records = [{'fields': build_fields(t)} for t in tasks]
    summary = {'total': len(records), 'created': 0, 'updated': 0, 'failed': 0, 'errors': []}
    for start in range(0, len(records), batch_size):
        _upsert_with_fallback(table, records[start:start + batch_size], summary, max_retries, sleep)
    return summary


def _try_upsert(table, chunk, summary, max_retries, sleep):
    """Return True on success, or the raised exception on final failure."""
    attempt = 0
    while True:
        try:
            result = table.batch_upsert(chunk, key_fields=[MERGE_KEY])
            summary['created'] += len(result.get('createdRecords', []))
            summary['updated'] += len(result.get('updatedRecords', []))
            return True
        except Exception as exc:  # noqa: BLE001 - re-classified by _is_transient
            if _is_transient(exc) and attempt < max_retries:
                attempt += 1
                sleep(_backoff(attempt))
                continue
            return exc


def _upsert_with_fallback(table, chunk, summary, max_retries, sleep):
    outcome = _try_upsert(table, chunk, summary, max_retries, sleep)
    if outcome is True:
        return
    if len(chunk) == 1:
        summary['failed'] += 1
        summary['errors'].append({
            'taskId': chunk[0]['fields'].get(MERGE_KEY),
            'error': str(outcome),
        })
        return
    # isolate the offending record(s) so the rest of the batch still exports
    for record in chunk:
        _upsert_with_fallback(table, [record], summary, max_retries, sleep)
