from pathlib import Path
from dotenv import load_dotenv
import os
import json

# Cargar variables de entorno desde .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ===== VARIABLES DE ENTORNO CORREGIDAS PARA RENDER =====
# SECRET KEY - Render generará automáticamente DJANGO_SECRET_KEY
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-your-default-secret-key-here')

# DEBUG - Render configurará esto como 'false'
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# ALLOWED_HOSTS - Render configurará esto correctamente
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')
CSRF_TRUSTED_ORIGINS = [
    'https://yachay-backend-6nf9.onrender.com',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]

#  API Keys que deberás configurar en Render
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', 'your-google-client-id-here')
GOOGLE_CLOUD_API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY', '')

# Firebase credentials para Render (como string JSON, no archivo)
FIREBASE_CREDENTIALS_JSON = os.getenv('FIREBASE_CREDENTIALS_JSON', '{}')

#  Validación silenciosa para evitar prints en producción
if DEBUG:
    print(f"OpenAI API Key configurada: {'Sí' if OPENAI_API_KEY else 'No'}")
    print(f"Google Client ID configurado: {'Sí' if GOOGLE_CLIENT_ID else 'No'}")
    print(f"Firebase configurado: {'Sí' if FIREBASE_CREDENTIALS_JSON != '{}' else 'No'}")

# ===== CONFIGURACIÓN FIREBASE PARA RENDER =====
try:
    if FIREBASE_CREDENTIALS_JSON and FIREBASE_CREDENTIALS_JSON != '{}':
        # En Render, Firebase credentials vienen como JSON string
        FIREBASE_CREDENTIALS = json.loads(FIREBASE_CREDENTIALS_JSON)
    else:
        # Para desarrollo local con archivo
        FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', 
                                            os.path.join(BASE_DIR, 'firebase-credentials.json'))
        if os.path.exists(FIREBASE_CREDENTIALS_PATH):
            with open(FIREBASE_CREDENTIALS_PATH, 'r') as f:
                FIREBASE_CREDENTIALS = json.load(f)
        else:
            FIREBASE_CREDENTIALS = None
except (json.JSONDecodeError, FileNotFoundError):
    FIREBASE_CREDENTIALS = None
    if DEBUG:
        print("Firebase credentials no configuradas correctamente")

# ===== APLICACIONES INSTALADAS =====
INSTALLED_APPS = [
    'jazzmin',  # Admin theme
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'translations',      # App de traducciones
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Para archivos estáticos
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'quechua_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'translations/templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',  # ← CORREGIDO
        ],
        },
    },
]

WSGI_APPLICATION = 'quechua_backend.wsgi.application'

# ===== CONFIGURACIÓN DE BASE DE DATOS PARA RENDER =====
try:
    import dj_database_url
    HAS_DJ_DATABASE_URL = True
except ImportError:
    HAS_DJ_DATABASE_URL = False

# Configuración de base de datos
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL and HAS_DJ_DATABASE_URL:
    # Render PostgreSQL
    try:
        DATABASES = {
            'default': dj_database_url.config(
                default=DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    except Exception as e:
        if DEBUG:
            print(f"Error configurando DATABASE_URL: {e}")
        # Fallback a SQLite
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
else:
    # Desarrollo local con SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ===== CONFIGURACIÓN CORS =====
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# ===== CONFIGURACIÓN REST FRAMEWORK =====
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20
}

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ===== CONFIGURACIÓN JAZZMIN =====
JAZZMIN_SETTINGS = {
    # Configuración básica
    "site_title": "Yachay Admin",
    "site_header": "Yachay",
    "site_brand": "Yachay",
    "site_icon": "fas fa-language",
    "welcome_sign": "Bienvenido al Panel de Control de Yachay",
    "copyright": "Yachay - Aprendizaje de Quechua © 2025",
    
    # Configuración crítica para el menú
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    
    # Desactivar constructor de UI para evitar cambios no deseados
    "show_ui_builder": False,
    
    # Iconos para cada modelo
    "icons": {
        # Aplicaciones
        "auth": "fas fa-shield-alt",
        "translations": "fas fa-language",
        "detection": "fas fa-eye",
        "exercises": "fas fa-tasks",
        "user_management": "fas fa-users-cog",
        
        # Modelos principales
        "auth.user": "fas fa-user",
        "auth.group": "fas fa-users",
        
        "translations.objecttranslation": "fas fa-language",
        "translations.exercise": "fas fa-tasks",
        "translations.userprofile": "fas fa-id-card",
        "translations.userprogress": "fas fa-chart-line", 
        "translations.progresscategory": "fas fa-folder",
        "translations.achievement": "fas fa-medal",
        "translations.activitylog": "fas fa-history",
        "translations.pronunciationrecord": "fas fa-microphone",
        "translations.streakreward": "fas fa-fire",
        "translations.practicesession": "fas fa-stopwatch",
        "translations.uservocabulary": "fas fa-book-open",
        "translations.dailygoal": "fas fa-calendar-check",
    },
    
    # Configuración de formato para formularios y vistas
    "changeform_format": "horizontal_tabs",
    "related_modal_active": True,
    
    # Búsqueda personalizada
    "search_model": "auth.user",
    
    "custom_css": "css/admin_custom.css",
    "custom_js": "js/custom_menu.js"
}

# Configuración visual de Jazzmin
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-danger",
    "accent": "accent-danger",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-danger",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success"
    },
    "actions_sticky_top": False,
    "use_google_fonts_cdn": True
}

# ===== CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS PARA RENDER =====
#  SOLUCIÓN: Sin compresión en NINGÚN entorno para evitar errores .map
STATICFILES_STORAGE = 'whitenoise.storage.StaticFilesStorage'

# Configuración de WhiteNoise para ignorar archivos problemáticos
WHITENOISE_MANIFEST_STRICT = False
WHITENOISE_SKIP_COMPRESS_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'gz', 'tgz', 
    'bz2', 'tbz', 'xz', 'br', 'map'
]

# Configuración adicional de Whitenoise
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = DEBUG

# ===== CONFIGURACIÓN DE REDIS PARA CACHÉ - OPTIMIZADA =====
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/1')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            # 🔧 OPTIMIZACIONES DE RENDIMIENTO CRÍTICAS
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'retry_on_timeout': True,
                'socket_keepalive': True,
                'socket_keepalive_options': {},
                'health_check_interval': 30,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'TIMEOUT': 300,  # 5 minutos
        'KEY_PREFIX': 'yachay',
        'VERSION': 1,
    }
}

# Usar Redis como backend de sesiones (opcional pero recomendado)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 24 horas
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# ===== CONFIGURACIÓN DE LOGGING OPTIMIZADA =====
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING' if not DEBUG else 'INFO',  # Menos logs en producción
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING' if not DEBUG else 'INFO',
            'propagate': False,
        },
        'translations': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'detection': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'exercises': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'user_management': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        # 🔧 REDUCIR LOGS DE ULTRALYTICS/YOLO
        'ultralytics': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'yolov8': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Crear directorio de logs si no existe (solo en desarrollo)
if DEBUG:
    LOGS_DIR = os.path.join(BASE_DIR, 'logs')
    os.makedirs(LOGS_DIR, exist_ok=True)
    
    # Agregar file handler solo en desarrollo
    LOGGING['handlers']['file'] = {
        'level': 'INFO',
        'class': 'logging.FileHandler',
        'filename': os.path.join(LOGS_DIR, 'django.log'),
        'formatter': 'verbose',
    }
    
    # Agregar file handler a los loggers
    for logger in LOGGING['loggers'].values():
        logger['handlers'].append('file')

# ===== CONFIGURACIÓN ESPECÍFICA PARA RENDER =====
RENDER = os.getenv('RENDER', False)

if RENDER:
    if DEBUG:
        print("Configurando para Render...")
    
    #  OVERRIDE configuraciones para producción en Render
    DEBUG = False
    
    #  Hosts específicos para Render
    ALLOWED_HOSTS = [
        '.onrender.com',
        'yachay-backend.onrender.com',
        'yachay-backend-wdlr.onrender.com',  # Tu URL específica
        'localhost',
        '127.0.0.1'
    ] + ALLOWED_HOSTS
    
    #  Database override para Render PostgreSQL
    if os.getenv('DATABASE_URL'):
        DATABASES = {
            'default': dj_database_url.config(
                default=os.getenv('DATABASE_URL'),
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    
    # Redis override para Render
    RENDER_REDIS_URL = os.getenv('REDIS_URL')
    if RENDER_REDIS_URL:
        CACHES = {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': RENDER_REDIS_URL,
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'CONNECTION_POOL_KWARGS': {
                        'max_connections': 10,  # Menos conexiones en Render
                        'retry_on_timeout': True,
                        'socket_keepalive': True,
                        'health_check_interval': 30,
                    },
                    'IGNORE_EXCEPTIONS': True,
                }
            }
        }
        # Usar Redis para sesiones también
        SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
        SESSION_CACHE_ALIAS = 'default'
    
    #  Static files para Render -  CORREGIDO: Sin compresión
    STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
    # 🔧 MANTENER sin compresión para evitar errores con archivos .map
    # STATICFILES_STORAGE ya está configurado arriba como StaticFilesStorage
    
    #  Configuración de seguridad para producción
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # 🔧 CONFIGURACIONES ESPECÍFICAS PARA RENDER
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    
    if DEBUG:
        print(" Configuración de Render aplicada correctamente")

# 🔧 CONFIGURACIONES DE RENDIMIENTO ADICIONALES
if not DEBUG:
    # Optimizaciones para producción
    CONN_MAX_AGE = 60
    
    # Configuración de sesiones optimizada
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    
    # AGREGAR AL FINAL DE TU settings.py
# ===============================================
# 🚀 FIX INMEDIATO PARA PERFORMANCE LOCAL
# ===============================================

import socket
import sys

def redis_available():
    """Verifica si Redis está disponible localmente"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', 6379))
        sock.close()
        return result == 0
    except:
        return False

def is_local_dev():
    """Detecta si estamos en desarrollo local"""
    return not os.getenv('RENDER') and 'runserver' in sys.argv

# APLICAR OPTIMIZACIONES LOCALES
if is_local_dev():
    print("🔧 Aplicando optimizaciones de performance local...")
    
    # 1. CACHE OPTIMIZADO - La causa principal de lentitud
    if not redis_available():
        print("   ⚠️ Redis no disponible, usando cache en memoria optimizado")
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'yachay-local-cache',
                'OPTIONS': {
                    'MAX_ENTRIES': 10000,  # Más entradas que el default
                    'CULL_FREQUENCY': 2,   # Menos aggressive cleanup
                }
            }
        }
        
        # Override session para usar cache optimizado
        SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
        SESSION_CACHE_ALIAS = 'default'
    else:
        print("   ✅ Redis disponible localmente")
    
    # 2. LOGGING MINIMALISTA - Reduce I/O
    LOGGING['handlers']['console']['level'] = 'ERROR'
    LOGGING['root']['level'] = 'ERROR'
    
    # Deshabilitar logging a archivo en desarrollo
    if 'file' in LOGGING['handlers']:
        del LOGGING['handlers']['file']
        for logger in LOGGING['loggers'].values():
            if 'file' in logger.get('handlers', []):
                logger['handlers'] = [h for h in logger['handlers'] if h != 'file']
    
    # 3. JAZZMIN OPTIMIZADO LOCALMENTE
    JAZZMIN_SETTINGS.update({
        "navigation_expanded": False,  # Menos carga inicial
        "related_modal_active": False,  # Sin modales pesados
        "use_google_fonts_cdn": False,  # Sin requests externos
        "custom_css": None,  # Sin CSS custom
        "custom_js": None,   # Sin JS custom
    })
    
    # 4. ADMIN OPTIMIZATIONS
    # Estas se aplicarán en admin.py mediante esta variable
    ADMIN_PERFORMANCE_MODE = True
    
    # 5. SQLITE OPTIMIZADO (si es lo que usas)
    if 'sqlite3' in DATABASES['default']['ENGINE']:
        print("   🔧 Optimizando SQLite para admin...")
        DATABASES['default']['OPTIONS'] = {
            'timeout': 20,
            'isolation_level': None,  # Autocommit mode
        }
        # Sin persistent connections en SQLite (causa problemas)
        DATABASES['default']['CONN_MAX_AGE'] = 0
    
    # 6. STATIC FILES SIN COMPRESIÓN
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
    
    # 7. MIDDLEWARE OPTIMIZADO
    # Remover middlewares innecesarios en desarrollo
    if 'whitenoise.middleware.WhiteNoiseMiddleware' in MIDDLEWARE:
        # WhiteNoise no es necesario en desarrollo con runserver
        MIDDLEWARE = [mw for mw in MIDDLEWARE if 'whitenoise' not in mw.lower()]
    
    print("   ✅ Optimizaciones locales aplicadas!")
    print(f"   Cache backend: {CACHES['default']['BACKEND']}")
    print(f"   Database: {DATABASES['default']['ENGINE']}")

# ===============================================
# 🎯 OPTIMIZACIÓN ESPECÍFICA PARA ADMIN
# ===============================================

# Detectar cuando se accede al admin y aplicar optimizaciones extra
if is_local_dev() and any('/admin' in arg for arg in sys.argv):
    print("🎯 Modo admin detectado - aplicando optimizaciones extra...")
    
    # Cache más agresivo para admin
    if CACHES['default']['BACKEND'] == 'django.core.cache.backends.locmem.LocMemCache':
        CACHES['default']['OPTIONS']['MAX_ENTRIES'] = 50000
        CACHES['default']['TIMEOUT'] = 1800  # 30 minutos
    
    # Deshabilitar completamente ciertos logs pesados
    LOGGING['loggers']['django.db.backends'] = {
        'handlers': [],
        'level': 'ERROR',
        'propagate': False,
    }

# ===============================================
# 🚨 MENSAJE DE DIAGNÓSTICO
# ===============================================

if is_local_dev() and DEBUG:
    def print_performance_info():
        print("\n" + "="*60)
        print("🐛 DIAGNÓSTICO DE PERFORMANCE LOCAL")
        print("="*60)
        print(f"DEBUG: {DEBUG}")
        print(f"Cache Backend: {CACHES['default']['BACKEND']}")
        print(f"Database: {DATABASES['default']['ENGINE']}")
        print(f"Redis Available: {redis_available()}")
        
        if not redis_available():
            print("\n⚠️  PROBLEMA DETECTADO:")
            print("   Redis no está disponible localmente")
            print("   Esto hace que el cache falle y el admin sea lento")
            print("\n💡 SOLUCIONES:")
            print("   1. Instalar Redis: brew install redis (macOS)")
            print("   2. O usar: DEBUG=False python manage.py runserver")
            print("   3. Las optimizaciones actuales deberían mejorar la velocidad")
        
        print("="*60 + "\n")
    
    # Ejecutar diagnóstico después de que Django esté completamente cargado
    import threading
    threading.Timer(2.0, print_performance_info).start()
    # VER LOGS TEMPORALMENTE
if os.getenv('VERBOSE_LOGS'):
    LOGGING['handlers']['console']['level'] = 'INFO'
    LOGGING['root']['level'] = 'INFO'
    print("🔍 Modo verbose logs activado")