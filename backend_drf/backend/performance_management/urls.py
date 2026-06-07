from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ActivityViewSet, TrackViewSet, recap_view

router = DefaultRouter(trailing_slash=False)
router.register(r"users", UserViewSet)
router.register(r"activities", ActivityViewSet)
router.register(r"tracks", TrackViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("recap/<str:mode>/", recap_view, name="recap"),
]
