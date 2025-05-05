#C:\QuechuaApp_Yachay\backend\quechua_backend\settings.py
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

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Esta es la nueva línea que debes agregar

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
# Configuración mejorada de Jazzmin con descripciones detalladas
# settings.py - Configuración optimizada de Jazzmin
# settings.py - Configuración simplificada de Jazzmin para evitar interferencias
# REEMPLAZA SOLO LA SECCIÓN JAZZMIN_SETTINGS

# Configuración completa de Jazzmin para estructura jerárquica

# Configuración completa de Jazzmin

JAZZMIN_SETTINGS = {
    # Configuración básica
    "site_title": "Yachay Admin",
    "site_header": "Yachay",
    "site_brand": "Yachay - Aprende",
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
        "translations.practicesession": "fas fa-stopwatch"
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