# NOTE: DRF serializers translate Django model instances into JSON responses (and back again).
#       Keep the fields list in sync with the frontend types so data flows smoothly between layers.
from rest_framework import serializers
from .models import User, Activity, Track


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    class Meta:
        model = User
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity model"""

    class Meta:
        model = Activity
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TrackSerializer(serializers.ModelSerializer):
    """Serializer for Track model"""

    # Accept foreign keys via their primary keys when creating a track
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True
    )
    activity = serializers.PrimaryKeyRelatedField(
        queryset=Activity.objects.all(), write_only=True
    )

    # Expose the related objects and IDs in the response
    user_detail = UserSerializer(source="user", read_only=True)
    activity_detail = ActivitySerializer(source="activity", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    activity_id = serializers.IntegerField(source="activity.id", read_only=True)
    duration = serializers.ReadOnlyField()

    class Meta:
        model = Track
        fields = [
            "id",
            "user",
            "user_id",
            "user_detail",
            "activity",
            "activity_id",
            "activity_detail",
            "start_time",
            "end_time",
            "comment",
            "duration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "user_detail",
            "activity_id",
            "activity_detail",
            "duration",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # Fall back to the existing instance values so partial updates that omit
        # start_time or end_time still validate against the stored times.
        start = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return attrs


class TrackDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Track model with nested user and activity data"""

    user = UserSerializer(read_only=True)
    activity = ActivitySerializer(read_only=True)
    duration = serializers.ReadOnlyField()

    class Meta:
        model = Track
        fields = [
            "id",
            "user",
            "activity",
            "start_time",
            "end_time",
            "comment",
            "duration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "duration", "created_at", "updated_at"]
