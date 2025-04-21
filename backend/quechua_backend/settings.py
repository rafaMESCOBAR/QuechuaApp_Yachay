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
        'DIRS': [],
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
# Configuración de Jazzmin
JAZZMIN_SETTINGS = {
    # título de la página
    "site_title": "Yachay Admin",
    
    # Título que aparece en la barra de navegación
    "site_header": "Yachay",
    
    # Título en la página de inicio del administrador
    "site_brand": "Yachay - Panel de Administración",
    
    # CSS que se muestra a la izquierda del nombre de la marca
    "site_icon": "fas fa-language",
    
    # URL vinculada al logo de la marca
    "site_url": "/",
    
    # Texto CSS de bienvenida en la página de inicio del administrador
    "welcome_sign": "Bienvenido al Portal de Administración de Yachay",
    
    # Copyright en el pie de página
    "copyright": "Yachay - Aprendizaje de Quechua",
    
    # El modelo administrador para buscar desde la barra de búsqueda
    "search_model": "translations.ObjectTranslation",
    
    # Icono de la aplicación
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    
    # Mostrar constructor de UI
    "show_ui_builder": True,
    
    # Enlaces personalizados
    "custom_links": {
        "translations": [{
            "name": "Dashboard", 
            "url": "admin:index", 
            "icon": "fas fa-tachometer-alt",
        }],
    },
    
    # Iconos para aplicaciones y modelos
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "translations.objecttranslation": "fas fa-language",
        "translations.userprofile": "fas fa-user-graduate",
        "translations.exercise": "fas fa-tasks",
        "translations.userprogress": "fas fa-chart-line",
        "translations.achievement": "fas fa-trophy",
        "translations.userachievement": "fas fa-medal",
        "translations.activitylog": "fas fa-history",
        "translations.pronunciationrecord": "fas fa-microphone",
    },
    
    # Orden de las aplicaciones en el sidebar
    "order_with_respect_to": ["auth", "translations"],
    
    # Enlaces personalizados en la sección de usuario
    "usermenu_links": [
        {"name": "Documentación", "url": "https://docs.djangoproject.com/", "new_window": True},
    ],
}

# Configuración de tema UI
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-danger",
    "accent": "accent-danger",
    "navbar": "navbar-danger navbar-dark",
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
    "theme": "default",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-danger",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}
