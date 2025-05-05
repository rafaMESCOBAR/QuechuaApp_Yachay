# translations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'translations', views.ObjectTranslationViewSet)
router.register(r'detection', views.ObjectDetectionViewSet, basename='detection')
router.register(r'users', views.UserViewSet)
router.register(r'exercises', views.ExerciseViewSet)
router.register(r'exercise-progress', views.UserProgressViewSet)
router.register(r'pronunciation', views.PronunciationViewSet)
router.register(r'practice', views.PracticeViewSet, basename='practice')
router.register(r'progress', views.ProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='auth_login'),
    path('auth/register/', views.register_view, name='auth_register'),
    path('auth/firebase-login/', views.firebase_login_view, name='firebase_login'),
    path('auth/google-login/', views.google_login_view, name='google_login'),
    path('speech/analyze/', views.analyze_pronunciation, name='analyze_pronunciation'),
    path('dashboard/', views.user_dashboard, name='user_dashboard'),
]