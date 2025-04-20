# translations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'translations', views.ObjectTranslationViewSet)
router.register(r'detection', views.ObjectDetectionViewSet, basename='detection')
router.register(r'users', views.UserViewSet)
router.register(r'exercises', views.ExerciseViewSet)
router.register(r'progress', views.UserProgressViewSet)
router.register(r'pronunciation', views.PronunciationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='auth_login'),
    path('auth/register/', views.register_view, name='auth_register'),
    path('auth/firebase-login/', views.firebase_login_view, name='firebase_login'),
    path('auth/google-login/', views.google_login_view, name='google_login'),  # Nuevo endpoint para login directo con Google
    path('speech/analyze/', views.analyze_pronunciation, name='analyze_pronunciation'),
]