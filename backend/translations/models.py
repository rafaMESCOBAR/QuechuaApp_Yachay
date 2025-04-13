#translations/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

# Modelo existente
class ObjectTranslation(models.Model):
    english_label = models.CharField(max_length=100, unique=True, db_index=True)
    spanish = models.CharField(max_length=100)
    quechua = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['english_label']
        indexes = [
            models.Index(fields=['spanish']),
            models.Index(fields=['quechua'])
        ]
        verbose_name = 'Traducción de Objeto'
        verbose_name_plural = 'Traducciones de Objetos'

    def __str__(self):
        return f"{self.english_label} - {self.spanish} - {self.quechua}"

# Nuevo modelo para perfil de usuario
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    level = models.IntegerField(default=1)
    experience_points = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_activity = models.DateField(null=True, blank=True)
    native_speaker = models.BooleanField(default=False)
    preferred_dialect = models.CharField(max_length=50, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def add_experience(self, points):
        """Añade puntos de experiencia y actualiza nivel si corresponde"""
        self.experience_points += points
        level_threshold = self.level * 100
        if self.experience_points >= level_threshold:
            self.level += 1
            self.experience_points -= level_threshold
            return True
        return False
    
    def update_streak(self):
        today = timezone.now().date()
        if self.last_activity:
            days_diff = (today - self.last_activity).days
            if days_diff == 1:
                self.streak_days += 1
            elif days_diff > 1:
                self.streak_days = 1
        else:
            self.streak_days = 1
        self.last_activity = today
        self.save()

# Señales para crear perfil automáticamente
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

# Modelos para ejercicios
class Exercise(models.Model):
    TYPE_CHOICES = (
        ('multiple_choice', 'Selección múltiple'),
        ('fill_blanks', 'Completar espacios'),
        ('matching', 'Relacionar'),
        ('pronunciation', 'Pronunciación'),
        ('anagram', 'Ordenar letras'),  # Nuevo tipo
    )
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    object_translation = models.ForeignKey(ObjectTranslation, on_delete=models.CASCADE)
    difficulty = models.IntegerField(default=1)
    question = models.TextField()
    answer = models.TextField()
    distractors = models.JSONField(null=True, blank=True)
    points = models.IntegerField(default=10)
    metadata = models.JSONField(null=True, blank=True)  # Campo para información de gamificación
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.object_translation.spanish}"

class UserProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    correct = models.BooleanField(default=False)
    last_attempt = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'exercise')
        
    def __str__(self):
        status = "correcto" if self.correct else "incorrecto"
        return f"{self.user.username} - {self.exercise} - {status}"

class Achievement(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    required_value = models.IntegerField()
    achievement_type = models.CharField(max_length=50)
    
    def __str__(self):
        return self.name

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'achievement')
        
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50)
    points = models.IntegerField(default=0)
    details = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type} - {self.timestamp}"

# Modelo para pronunciación
class PronunciationRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    object_translation = models.ForeignKey(ObjectTranslation, on_delete=models.CASCADE)
    audio_file = models.FileField(upload_to='pronunciation_records/')
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(null=True)
    approved_by = models.ForeignKey(
        User, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name='approved_pronunciations'
    )
    approval_date = models.DateTimeField(null=True, blank=True)
    approval_comment = models.TextField(blank=True, null=True)
    
    def __str__(self):
        status = "pendiente"
        if self.is_approved is not None:
            status = "aprobado" if self.is_approved else "rechazado"
        return f"{self.user.username} - {self.object_translation.spanish} - {status}"