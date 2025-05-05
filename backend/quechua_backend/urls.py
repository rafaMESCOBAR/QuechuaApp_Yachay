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
# urls.py - Monkey patch mejorado para el admin index

# urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from translations.models import ObjectTranslation, Exercise, Achievement, ActivityLog
from django.core.cache import cache
from rest_framework.authtoken.models import Token

# Intentar desregistrar modelos redundantes de nuevo (por si falló en admin.py)
from django.apps import apps
models_to_hide = [
    ('authtoken', 'token'),
    ('translations', 'userachievement'),
    ('translations', 'analyticsevent'),
]

# Desregistrar modelos nuevamente (redundancia intencional)
for app_label, model_name in models_to_hide:
    try:
        model = apps.get_model(app_label, model_name)
        if model in admin.site._registry:
            admin.site.unregister(model)
    except Exception as e:
        print(f"Error desregistrando {app_label}.{model_name}: {e}")

# Monkey patch para el admin index
original_index = admin.site.index

def custom_index(request, extra_context=None):
    if extra_context is None:
        extra_context = {}
    
    # Verificar si hay que refrescar el caché
    refresh_cache = 'refresh_stats' in request.GET
    
    # Cache individual para cada estadística (5 minutos)
    cache_timeout = 300
    
    # Traducciones
    translations_count = cache.get('admin_translations_count')
    if translations_count is None or refresh_cache:
        translations_count = ObjectTranslation.objects.count()
        cache.set('admin_translations_count', translations_count, cache_timeout)
    
    # Ejercicios
    exercises_count = cache.get('admin_exercises_count')
    if exercises_count is None or refresh_cache:
        exercises_count = Exercise.objects.count()
        cache.set('admin_exercises_count', exercises_count, cache_timeout)
    
    # Usuarios
    users_count = cache.get('admin_users_count')
    if users_count is None or refresh_cache:
        from django.contrib.auth.models import User
        users_count = User.objects.count()
        cache.set('admin_users_count', users_count, cache_timeout)
    
    # Logros
    achievements_count = cache.get('admin_achievements_count')
    if achievements_count is None or refresh_cache:
        achievements_count = Achievement.objects.count()
        cache.set('admin_achievements_count', achievements_count, cache_timeout)
    
    # Actualizar contexto con valores cacheados
    extra_context.update({
        'translations_count': translations_count,
        'exercises_count': exercises_count,
        'users_count': users_count,
        'achievements_count': achievements_count,
        # La actividad reciente siempre se obtiene fresca
        'recent_activity': ActivityLog.objects.select_related('user').order_by('-timestamp')[:10],
    })
    
    return original_index(request, extra_context)

# Aplicar el monkey patch
admin.site.index = custom_index

# Personalizar título del admin
admin.site.site_header = "Yachay"
admin.site.site_title = "Yachay Admin"
admin.site.index_title = "Panel de Administración"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('translations.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)