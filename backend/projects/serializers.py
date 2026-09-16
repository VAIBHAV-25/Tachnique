from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Project, Membership, Task, Comment, Activity


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    projectId = serializers.CharField(source='project_id', read_only=True)
    assigneeId = serializers.CharField(source='assignee_id', read_only=True, allow_null=True)
    createdById = serializers.CharField(source='created_by_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'projectId', 'title', 'description', 'status',
            'assigneeId', 'createdById', 'position', 'createdAt', 'updatedAt', 'assignee',
        ]


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'role', 'user']


class ProjectDetailSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    ownerId = serializers.CharField(source='owner_id', read_only=True)
    memberships = MembershipSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'ownerId', 'owner', 'memberships', 'tasks', 'createdAt', 'updatedAt']


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    taskId = serializers.CharField(source='task_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'taskId', 'body', 'author', 'createdAt']


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    projectId = serializers.CharField(source='project_id', read_only=True)
    taskId = serializers.CharField(source='task_id', read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ['id', 'projectId', 'taskId', 'actor', 'action', 'metadata', 'summary', 'createdAt']

    def get_summary(self, obj):
        m = obj.metadata or {}
        title = m.get('taskTitle', 'a task')
        if obj.action == 'task_created':
            return f'created task "{title}"'
        if obj.action == 'task_status_changed':
            return f'moved "{title}" from {m.get("from")} to {m.get("to")}'
        if obj.action == 'task_assignee_changed':
            to = m.get('to')
            return f'assigned "{title}" to {to}' if to else f'unassigned "{title}"'
        if obj.action == 'comment_added':
            return f'commented on "{title}"'
        return obj.action
