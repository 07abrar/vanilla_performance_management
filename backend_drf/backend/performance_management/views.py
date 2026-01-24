"""View logic for the performance management API."""

# NOTE: Each viewset below handles CRUD for a model. DRF wires them to URLs via routers,
#       which keeps our code concise while still exposing REST-style endpoints.
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone
from datetime import datetime, timedelta, timezone as dt_timezone
from .models import User, Activity, Track
from .serializers import (
    UserSerializer,
    ActivitySerializer,
    TrackSerializer,
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

    queryset = Track.objects.select_related("user", "activity")
    # Use the same serializer for every action so the frontend receives the
    # user_id/activity_id fields regardless of whether the data comes from a
    # list or create response.
    serializer_class = TrackSerializer

    def list(self, request):
        """List all tracks with user and activity details"""
        tracks = self.get_queryset()
        date_param = request.query_params.get("date")
        start_param = request.query_params.get("start")
        end_param = request.query_params.get("end")

        def parse_iso_datetime(value: str) -> datetime:
            normalized = value.replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(normalized)
            except ValueError as exc:
                raise ValueError("Invalid date format. Use ISO 8601.") from exc
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            return parsed

        try:
            if date_param:
                start_range = parse_iso_datetime(date_param).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                end_range = start_range + timedelta(days=1)
                tracks = tracks.filter(
                    start_time__gte=start_range,
                    start_time__lt=end_range,
                )
            else:
                start_range = parse_iso_datetime(start_param) if start_param else None
                end_range = parse_iso_datetime(end_param) if end_param else None
                if start_range and end_range and start_range >= end_range:
                    return Response(
                        {"error": "start must be before end."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if start_range:
                    tracks = tracks.filter(start_time__gte=start_range)
                if end_range:
                    tracks = tracks.filter(start_time__lt=end_range)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        tracks = tracks.order_by("-start_time")
        page = self.paginate_queryset(tracks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

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
        tz_offset_param = request.GET.get("tz_offset")

        # Determine the timezone of the requesting client. The frontend supplies the
        # browser's offset in minutes from UTC (as returned by
        # Date.getTimezoneOffset). Positive offsets mean the client is behind UTC, so we
        # negate the value when building a Django tzinfo, which expects minutes east of
        # UTC.
        if tz_offset_param is not None:
            try:
                tz_offset_minutes = int(tz_offset_param)
            except ValueError as exc:
                raise ValueError("Invalid tz_offset parameter") from exc
            client_timezone = timezone.get_fixed_timezone(-tz_offset_minutes)
        else:
            client_timezone = timezone.get_current_timezone()

        now_client = timezone.now().astimezone(client_timezone)

        def parse_client_midnight(value: str) -> datetime:
            """Return the client's midnight for the supplied ISO date string."""

            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, client_timezone)
            else:
                parsed = parsed.astimezone(client_timezone)
            return parsed.replace(hour=0, minute=0, second=0, microsecond=0)

        if mode == "daily":
            if date_param:
                start_local = parse_client_midnight(date_param)
            else:
                start_local = now_client.replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            end_local = start_local + timedelta(days=1)

        elif mode == "weekly":
            if week_start_param:
                start_local = parse_client_midnight(week_start_param)
            else:
                # Default to current week starting Monday in the client's timezone
                days_since_monday = now_client.weekday()
                start_local = (now_client - timedelta(days=days_since_monday)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            end_local = start_local + timedelta(days=7)

        elif mode == "monthly":
            if year_param and month_param:
                year = int(year_param)
                month = int(month_param)
                start_local = timezone.make_aware(
                    datetime(year, month, 1, hour=0, minute=0, second=0, microsecond=0),
                    client_timezone,
                )
            else:
                start_local = now_client.replace(
                    day=1, hour=0, minute=0, second=0, microsecond=0
                )

            if start_local.month == 12:
                end_local = start_local.replace(year=start_local.year + 1, month=1)
            else:
                end_local = start_local.replace(month=start_local.month + 1)

        else:
            return Response(
                {"error": "Invalid mode. Use daily, weekly, or monthly"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Convert the local range back to UTC for querying.
        start_range = start_local.astimezone(dt_timezone.utc)
        end_range = end_local.astimezone(dt_timezone.utc)

        # NOTE: Querying with select_related keeps the number of database hits low when
        #       we later access track.user or track.activity in the aggregation loop.
        tracks = Track.objects.filter(
            start_time__gte=start_range, start_time__lt=end_range
        ).select_related("user", "activity")

        # Calculate activity statistics keyed by activity id
        activity_stats = {}
        total_minutes = 0.0

        for track in tracks:
            activity_id = track.activity.id
            activity_name = track.activity.name
            # Calculate duration in minutes
            duration_minutes = (
                track.end_time - track.start_time
            ).total_seconds() / 60.0

            if activity_id not in activity_stats:
                activity_stats[activity_id] = {
                    "activity_id": activity_id,
                    "activity_name": activity_name,
                    "minutes": 0.0,
                }

            activity_stats[activity_id]["minutes"] += duration_minutes
            total_minutes += duration_minutes

        # Prepare entries sorted by the time spent per activity
        entries = []
        for data in activity_stats.values():
            if total_minutes > 0:
                percentage = (data["minutes"] / total_minutes) * 100
            else:
                percentage = 0.0

            entries.append(
                {
                    "activity_id": data["activity_id"],
                    "activity_name": data["activity_name"],
                    "minutes": round(data["minutes"], 2),
                    "percentage": round(percentage, 2),
                }
            )

        entries.sort(key=lambda value: value["minutes"], reverse=True)

        # Build a descriptive label for the selected period
        if mode == "daily":
            label = start_local.strftime("%Y-%m-%d")
        elif mode == "weekly":
            end_display = (end_local - timedelta(days=1)).strftime("%Y-%m-%d")
            label = f"{start_local.strftime('%Y-%m-%d')} → {end_display}"
        else:  # monthly
            label = start_local.strftime("%B %Y")

        response_data = {
            "mode": mode,
            "label": label,
            "start": start_local.isoformat(),
            "end": end_local.isoformat(),
            "total_minutes": round(total_minutes, 2),
            "entries": entries,
        }

        return Response(response_data)

    except ValueError as e:
        return Response(
            {"error": f"Invalid date parameter: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
