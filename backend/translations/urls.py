# translations/urls.py
# urls.py completo
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
    path('speech/analyze/', views.analyze_pronunciation, name='analyze_pronunciation'),
]