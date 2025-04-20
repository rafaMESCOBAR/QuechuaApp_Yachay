# translations/apps.py
from django.apps import AppConfig

class TranslationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'translations'

    def ready(self):
        from .initial_data import load_initial_data
        load_initial_data()