# translations/management/commands/wait_for_db.py
import time
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError

class Command(BaseCommand):
    """Django command para esperar a que la base de datos esté disponible"""
    
    help = 'Espera a que la base de datos esté disponible'

    def handle(self, *args, **options):
        self.stdout.write('Esperando base de datos...')
        db_conn = None
        while not db_conn:
            try:
                db_conn = connections['default']
                # Intenta hacer una consulta simple
                with db_conn.cursor() as cursor:
                    cursor.execute('SELECT 1')
                self.stdout.write(
                    self.style.SUCCESS('Base de datos disponible!')
                )
            except OperationalError:
                self.stdout.write('Base de datos no disponible, esperando 1 segundo...')
                time.sleep(1)