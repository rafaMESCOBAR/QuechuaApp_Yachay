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
JAZZMIN_SETTINGS = {
    # Configuración básica
    "site_title": "Yachay Admin",
    "site_header": "Yachay",
    "site_brand": "Yachay - Aprende",
    "site_icon": "fas fa-language",
    "welcome_sign": "Bienvenido al Panel de Control de Yachay",
    "copyright": "Yachay - Aprendizaje de Quechua © 2025",
    
    # Búsqueda y UI
    "search_model": "translations.objecttranslation",
    "show_ui_builder": True,
    
    # Enlaces personalizados
    "usermenu_links": [
        {"name": "Guía de Administración", "url": "#", "new_window": True, "icon": "fas fa-book"},
    ],
    
    # Estilo de formularios
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "auth.user": "collapsible",
        "auth.group": "vertical_tabs",
    },
    
    # Iconos personalizados para cada modelo y sección
    "icons": {
        # Aplicaciones
        "auth": "fas fa-shield-alt",
        "translations": "fas fa-language",
        
        # Modelos principales
        "auth.user": "fas fa-user",
        "auth.group": "fas fa-users",
        
        # Dashboard
        "admin.logentry": "fas fa-file-alt",
        "translations.objecttranslation": "fas fa-book",
        "translations.userprofile": "fas fa-user-graduate",
        "translations.exercise": "fas fa-tasks",
        "translations.userprogress": "fas fa-chart-line",
        "translations.achievement": "fas fa-trophy",
        "translations.userachievement": "fas fa-medal",
        "translations.activitylog": "fas fa-history",
        "translations.pronunciationrecord": "fas fa-microphone",
    },
    
    # Organización del menú
    "order_with_respect_to": ["home", "auth", "translations"],
    "navigation_expanded": True,
    
    # Descripciones detalladas para cada modelo
    "model_meta_descriptions": {
        "auth.user": "Administra usuarios que pueden acceder al sistema. Aquí puedes crear nuevas cuentas, editar perfiles o desactivar usuarios existentes.",
        "auth.group": "Gestiona grupos de permisos. Útil para asignar varios permisos a la vez a múltiples usuarios.",
        
        "translations.objecttranslation": "Gestiona el vocabulario de la aplicación. Aquí puedes añadir nuevas palabras con sus traducciones en español y quechua.",
        "translations.userprofile": "Información detallada de cada usuario, incluyendo nivel actual, puntos de experiencia, y si es un hablante nativo.",
        "translations.exercise": "Configura los ejercicios que aparecen en la aplicación. Puedes crear diferentes tipos como selección múltiple, completar espacios, etc.",
        "translations.userprogress": "Seguimiento detallado del avance de los usuarios en cada ejercicio. Muestra intentos, aciertos y progreso general.",
        "translations.achievement": "Configura logros que los usuarios pueden desbloquear. Establece requisitos como completar cierto número de ejercicios o mantener rachas de práctica.",
        "translations.userachievement": "Registro de los logros desbloqueados por cada usuario y cuándo los obtuvieron.",
        "translations.activitylog": "Historial completo de todas las acciones realizadas por los usuarios en la plataforma.",
        "translations.pronunciationrecord": "Grabaciones de pronunciación enviadas por los usuarios para revisión. Puedes escucharlas y aprobarlas o rechazarlas.",
    },
    
    # Descripciones de secciones principales
    "app_descriptions": {
        "auth": "Control de acceso y seguridad: gestiona quién puede acceder al sistema y qué permisos tiene.",
        "translations": "Centro de gestión de contenido y seguimiento de usuarios para la plataforma Yachay de aprendizaje de Quechua.",
    },
    
    # Personalización de las etiquetas de aplicaciones y modelos
    "custom_links": {
        "translations": [{
            "name": "Estadísticas Generales", 
            "url": "admin:index", 
            "icon": "fas fa-chart-bar"
        }],
    },
    
    # Menú personalizado para mejor organización
    "menu": [
        {
            "name": "Dashboard",
            "url": "admin:index",
            "icon": "fas fa-tachometer-alt",
            "description": "Panel principal con estadísticas y acciones rápidas",
        },
        {
            "name": "Gestión de Cuentas",
            "icon": "fas fa-users-cog",
            "description": "Gestiona usuarios y permisos de acceso al sistema",
            "models": [
                {
                    "name": "Usuarios",
                    "url": "admin:auth_user_changelist",
                    "icon": "fas fa-user",
                    "description": "Administra las cuentas de usuario",
                },
                {
                    "name": "Grupos",
                    "url": "admin:auth_group_changelist",
                    "icon": "fas fa-users",
                    "description": "Gestiona grupos de permisos",
                },
                {
                    "name": "Perfiles de usuario",
                    "url": "admin:translations_userprofile_changelist",
                    "icon": "fas fa-id-card",
                    "description": "Información detallada de los perfiles",
                },
            ],
        },
        {
            "name": "Contenido Lingüístico",
            "icon": "fas fa-language",
            "description": "Gestiona el vocabulario y ejercicios de aprendizaje",
            "models": [
                {
                    "name": "Traducciones de Objetos",
                    "url": "admin:translations_objecttranslation_changelist",
                    "icon": "fas fa-book",
                    "description": "Vocabulario en español y quechua",
                },
                {
                    "name": "Ejercicios",
                    "url": "admin:translations_exercise_changelist",
                    "icon": "fas fa-tasks",
                    "description": "Ejercicios de práctica para usuarios",
                },
                {
                    "name": "Ceremonias",
                    "url": "admin:translations_ceremony_changelist",  # Ajusta si el nombre del modelo es diferente
                    "icon": "fas fa-crown",
                    "description": "Actividades especiales y desafíos",
                },
            ],
        },
        {
            "name": "Progreso de Aprendizaje",
            "icon": "fas fa-graduation-cap",
            "description": "Seguimiento del avance de los usuarios",
            "models": [
                {
                    "name": "Progresos del usuario",
                    "url": "admin:translations_userprogress_changelist",
                    "icon": "fas fa-chart-line",
                    "description": "Avance en ejercicios por usuario",
                },
                {
                    "name": "Logros",
                    "url": "admin:translations_achievement_changelist",
                    "icon": "fas fa-trophy",
                    "description": "Logros disponibles en la plataforma",
                },
                {
                    "name": "Logros del usuario",
                    "url": "admin:translations_userachievement_changelist",
                    "icon": "fas fa-medal",
                    "description": "Logros desbloqueados por usuario",
                },
                {
                    "name": "Estadísticas de Aprendizaje",
                    "url": "admin:index",  # Ajusta a la URL correcta si existe una vista específica
                    "icon": "fas fa-chart-bar",
                    "description": "Métricas y análisis de uso",
                },
            ],
        },
        {
            "name": "Actividad y Monitoreo",
            "icon": "fas fa-clipboard-list",
            "description": "Seguimiento de la actividad en la plataforma",
            "models": [
                {
                    "name": "Registros de actividad",
                    "url": "admin:translations_activitylog_changelist",
                    "icon": "fas fa-history",
                    "description": "Historial de acciones de usuarios",
                },
                {
                    "name": "Registros de pronunciación",
                    "url": "admin:translations_pronunciationrecord_changelist",
                    "icon": "fas fa-microphone",
                    "description": "Grabaciones pendientes de revisión",
                },
            ],
        },
        {
            "name": "Acciones Rápidas",
            "icon": "fas fa-bolt",
            "description": "Acciones frecuentes para administradores",
            "models": [
                {
                    "name": "Añadir Traducción",
                    "url": "admin:translations_objecttranslation_add",
                    "icon": "fas fa-plus-circle",
                },
                {
                    "name": "Revisar Pronunciaciones",
                    "url": "admin:translations_pronunciationrecord_changelist",
                    "icon": "fas fa-headphones",
                },
                {
                    "name": "Asignar Logro",
                    "url": "admin:translations_userachievement_add",
                    "icon": "fas fa-award",
                },
            ],
        },
    ],
}

# Configuración del tema visual
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
    "theme": "unido",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success"
    },
    # Configuraciones adicionales
    "actions_sticky_top": False,
    "use_google_fonts_cdn": True,
    "custom_css": "css/admin_custom.css",  # Referencia al CSS personalizado
    "custom_js": None
}