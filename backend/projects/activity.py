from .models import Activity

STATUS_LABELS = {
    'todo': 'To do',
    'in_progress': 'In progress',
    'review': 'In review',
    'done': 'Done',
}


def record_activity(project_id, actor, action, task=None, **metadata):
    """Write one audit record. Called inside the same transaction as the change
    it describes, so the feed can never miss a meaningful change."""
    return Activity.objects.create(
        project_id=project_id,
        actor=actor,
        action=action,
        task=task,
        metadata=metadata,
    )
