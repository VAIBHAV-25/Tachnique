from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Project, Membership, Task


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
