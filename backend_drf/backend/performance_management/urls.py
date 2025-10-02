# NOTE: After creating viewsets, create URL routes for User, Activity, and Track viewsets
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .views import UserViewSet, ActivityViewSet, TrackViewSet, recap_view

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'tracks', TrackViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('recap/<str:mode>/', recap_view, name='recap'),
]

# NOTE: After creating this file, include these URLs in the main project's urls.py