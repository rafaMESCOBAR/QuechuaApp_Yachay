from pathlib import Path
from dotenv import load_dotenv
import os

# Cargar variables de entorno desde .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-your-default-secret-key-here')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Leer ALLOWED_HOSTS desde el archivo .env
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# OpenAI API Key (para ejercicios generados por IA)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
print(f"OpenAI API Key configurada: {'Sí' if OPENAI_API_KEY else 'No'}")

# Google Client ID para verificación de tokens
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', 'your-google-client-id-here')

# Google Cloud API Key para servicios de Google
GOOGLE_CLOUD_API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY', '')

# Firebase credentials path
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', os.path.join(BASE_DIR, 'firebase-credentials.json'))

# Application definition
INSTALLED_APPS = [
    'jazzmin',  # Añade esta línea al principio
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'translations',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Movido aquí para mejor orden
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
            os.path.join(BASE_DIR, 'translations/templates'),  # Aquí defines la ruta a tus plantillas
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'quechua_backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

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

LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuración CORS
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

# settings.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Configuración de autenticación REST Framework
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

# Configuración de archivos media (para uploads de audio, imágenes, etc.)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Configuración completa de Jazzmin
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
    
    # No usamos un menú estático personalizado porque lo haremos con JavaScript
    # para mayor flexibilidad y control
    "custom_css": "css/admin_custom.css",
    "custom_js": "js/custom_menu.js"
}

# Mantener la configuración visual de Jazzmin
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

# ===== CONFIGURACIÓN ADICIONAL PARA DOCKER =====
try:
    import dj_database_url
    HAS_DJ_DATABASE_URL = True
except ImportError:
    HAS_DJ_DATABASE_URL = False

# Database configuration para Docker
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL and HAS_DJ_DATABASE_URL:
    # Usar PostgreSQL en Docker
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
# Si no hay DATABASE_URL, mantiene tu configuración SQLite actual

# Configuración mejorada de archivos estáticos para Docker
if DEBUG:
    # Para desarrollo - sin compresión para evitar errores con archivos .map
    STATICFILES_STORAGE = 'whitenoise.storage.StaticFilesStorage'
else:
    # Para producción - con compresión pero ignorando archivos problemáticos
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ===== SOLUCIÓN DEFINITIVA PARA PROBLEMA WHITENOISE =====
# Configuración de WhiteNoise para ignorar archivos problemáticos
WHITENOISE_MANIFEST_STRICT = False  # 🔧 LÍNEA CRÍTICA AGREGADA
WHITENOISE_SKIP_COMPRESS_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'gz', 'tgz', 
    'bz2', 'tbz', 'xz', 'br', 'map'  # Ignorar archivos .map problemáticos
]

# Configuración adicional de Whitenoise
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = DEBUG

# ===== CONFIGURACIÓN DE REDIS PARA CACHÉ =====
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/1')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Usar Redis como backend de sesiones (opcional pero recomendado)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ===== CONFIGURACIÓN DE LOGGING MEJORADA =====
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
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'translations': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Crear directorio de logs si no existe
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

# Configuración adicional para producción
if not DEBUG:
    # Configuraciones de seguridad para producción
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = False  # Cambiar a True cuando tengas HTTPS
    SESSION_COOKIE_SECURE = False  # Cambiar a True cuando tengas HTTPS
    CSRF_COOKIE_SECURE = False  # Cambiar a True cuando tengas HTTPS
    
    # Logging más detallado en producción
    LOGGING['handlers']['file']['level'] = 'ERROR'
    LOGGING['loggers']['django']['level'] = 'ERROR'