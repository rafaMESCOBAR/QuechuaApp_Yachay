# translations/admin.py
from django.contrib import admin
from .models import ObjectTranslation

@admin.register(ObjectTranslation)
class ObjectTranslationAdmin(admin.ModelAdmin):
    list_display = ('english_label', 'spanish', 'quechua', 'created_at', 'updated_at')
    search_fields = ('english_label', 'spanish', 'quechua')
    list_filter = ('created_at', 'updated_at')
    ordering = ('english_label',)