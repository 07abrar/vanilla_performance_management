"""View logic for the performance management API."""

# NOTE: Each viewset below handles CRUD for a model. DRF wires them to URLs via routers,
#       which keeps our code concise while still exposing REST-style endpoints.
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone
from datetime import datetime, timedelta
from .models import User, Activity, Track
from .serializers import (
    UserSerializer,
    ActivitySerializer,
    TrackSerializer,
    TrackDetailSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User model - supports list, create, retrieve, update, delete"""

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def list(self, request):
        """List all users"""
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create a new user"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Delete a user"""
        try:
            user = self.get_object()
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class ActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for Activity model - supports list, create, retrieve, update, delete"""

    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer

    def list(self, request):
        """List all activities"""
        activities = self.get_queryset()
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create a new activity"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Delete an activity"""
        try:
            activity = self.get_object()
            activity.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Activity.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class TrackViewSet(viewsets.ModelViewSet):
    """ViewSet for Track model - supports list, create, retrieve, update, delete"""

    queryset = Track.objects.all()

    def get_serializer_class(self):
        """Return detailed serializer for list/retrieve, simple for create/update"""
        if self.action in ["list", "retrieve"]:
            return TrackDetailSerializer
        return TrackSerializer

    def list(self, request):
        """List all tracks with user and activity details"""
        tracks = self.get_queryset()
        serializer = self.get_serializer(tracks, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create a new track"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Delete a track"""
        try:
            track = self.get_object()
            track.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Track.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def recap_view(request, mode):
    """Aggregate Track data for recap charts consumed by the frontend dashboard."""
    # NOTE: This function-based view walks through date range parsing, querying, and
    #       aggregation step-by-step so you can trace how raw Track rows become a
    #       summarized payload for the UI.
    try:
        # Get query parameters
        date_param = request.GET.get("date")
        week_start_param = request.GET.get("week_start")
        year_param = request.GET.get("year")
        month_param = request.GET.get("month")

        # Determine date range based on mode and parameters
        now = timezone.now()

        if mode == "daily":
            if date_param:
                # Parse date parameter (YYYY-MM-DD format)
                target_date = datetime.fromisoformat(date_param.replace("Z", "+00:00"))
                start_date = target_date.replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            else:
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)

        elif mode == "weekly":
            if week_start_param:
                # Parse week_start parameter (YYYY-MM-DD format)
                start_date = datetime.fromisoformat(
                    week_start_param.replace("Z", "+00:00")
                )
                start_date = start_date.replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            else:
                # Default to current week starting Monday
                days_since_monday = now.weekday()
                start_date = (now - timedelta(days=days_since_monday)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            end_date = start_date + timedelta(days=7)

        elif mode == "monthly":
            if year_param and month_param:
                # Use provided year and month
                year = int(year_param)
                month = int(month_param)
                start_date = timezone.make_aware(datetime(year, month, 1))
            else:
                # Default to current month
                start_date = now.replace(
                    day=1, hour=0, minute=0, second=0, microsecond=0
                )

            # Calculate end of month
            if start_date.month == 12:
                end_date = start_date.replace(year=start_date.year + 1, month=1)
            else:
                end_date = start_date.replace(month=start_date.month + 1)

        else:
            return Response(
                {"error": "Invalid mode. Use daily, weekly, or monthly"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # NOTE: Querying with select_related keeps the number of database hits low when
        #       we later access track.user or track.activity in the aggregation loop.
        # Get tracks in the specified date range
        tracks = Track.objects.filter(
            start_time__gte=start_date, start_time__lt=end_date
        ).select_related("user", "activity")

        # Calculate activity statistics
        activity_stats = {}
        total_minutes = 0

        for track in tracks:
            activity_name = track.activity.name
            # Calculate duration in minutes
            duration_seconds = (track.end_time - track.start_time).total_seconds()
            duration_minutes = duration_seconds / 60

            if activity_name not in activity_stats:
                activity_stats[activity_name] = {
                    "activity": activity_name,
                    "minutes": 0,
                    "percentage": 0,
                }

            activity_stats[activity_name]["minutes"] += duration_minutes
            total_minutes += duration_minutes

        # Calculate percentages
        activities_list = []
        for activity_data in activity_stats.values():
            if total_minutes > 0:
                percentage = (activity_data["minutes"] / total_minutes) * 100
            else:
                percentage = 0

            activities_list.append(
                {
                    "activity": activity_data["activity"],
                    "minutes": round(activity_data["minutes"], 2),
                    "percentage": round(percentage, 2),
                }
            )

        # Sort by minutes descending
        activities_list.sort(key=lambda x: x["minutes"], reverse=True)

        # Format response as RecapOut structure
        response_data = {
            "mode": mode,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "total_minutes": round(total_minutes, 2),
            "activities": activities_list,
            "tracks_count": tracks.count(),
        }

        return Response(response_data)

    except ValueError as e:
        return Response(
            {"error": f"Invalid date parameter: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
