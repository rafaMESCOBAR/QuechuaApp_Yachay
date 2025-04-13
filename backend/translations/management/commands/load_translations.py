#backend/translations/management/commands/load_translations.py

from django.core.management.base import BaseCommand
from translations.initial_data import load_initial_data

class Command(BaseCommand):
    help = 'Carga las traducciones iniciales'

    def handle(self, *args, **kwargs):
        load_initial_data()
        self.stdout.write(self.style.SUCCESS('Traducciones cargadas exitosamente'))