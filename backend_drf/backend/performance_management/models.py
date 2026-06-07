from django.db import models

# Field names mirror the frontend TypeScript interfaces so JSON payloads map
# directly between the two layers.


class User(models.Model):
    """User model to match frontend User interface"""

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class Activity(models.Model):
    """Activity model to match frontend Activity interface"""

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Activities"


class Track(models.Model):
    """Track model to match frontend Track interface"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tracks")
    activity = models.ForeignKey(
        Activity, on_delete=models.CASCADE, related_name="tracks"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name} - {self.activity.name} ({self.start_time})"

    class Meta:
        ordering = ["-start_time"]

    @property
    def duration(self):
        """Calculate duration in seconds"""
        return (self.end_time - self.start_time).total_seconds()
