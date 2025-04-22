"""
URL configuration for quechua_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
#backend/quechua_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.models import User
from translations.models import ObjectTranslation, Exercise, Achievement, ActivityLog

# Monkey patch para el admin index
original_index = admin.site.index
def custom_index(request, extra_context=None):
    if extra_context is None:
        extra_context = {}
    
    # Estadísticas para el dashboard
    extra_context.update({
        'translations_count': ObjectTranslation.objects.count(),
        'exercises_count': Exercise.objects.count(),
        'users_count': User.objects.count(),
        'achievements_count': Achievement.objects.count(),
        'recent_activity': ActivityLog.objects.select_related('user').order_by('-timestamp')[:10],
    })
    
    return original_index(request, extra_context)

admin.site.index = custom_index

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('translations.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)