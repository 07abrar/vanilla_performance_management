# NOTE: Create serializers for User, Activity, and Track models and update views.py
from rest_framework import serializers
from .models import User, Activity, Track


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity model"""
    class Meta:
        model = Activity
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TrackSerializer(serializers.ModelSerializer):
    """Serializer for Track model"""
    duration = serializers.ReadOnlyField()

    class Meta:
        model = Track
        fields = ['id', 'user', 'activity', 'start_time', 'end_time', 'comment', 'duration', 'created_at', 'updated_at']
        read_only_fields = ['id', 'duration', 'created_at', 'updated_at']


class TrackDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Track model with nested user and activity data"""
    user = UserSerializer(read_only=True)
    activity = ActivitySerializer(read_only=True)
    duration = serializers.ReadOnlyField()

    class Meta:
        model = Track
        fields = ['id', 'user', 'activity', 'start_time', 'end_time', 'comment', 'duration', 'created_at', 'updated_at']
        read_only_fields = ['id', 'duration', 'created_at', 'updated_at']