# translations/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

# Modelo principal
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

# Actualizar UserProfile para incluir más datos de progreso
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    level = models.IntegerField(default=1)
    experience_points = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_activity = models.DateField(null=True, blank=True)
    native_speaker = models.BooleanField(default=False)
    preferred_dialect = models.CharField(max_length=50, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    
    # Nuevos campos para tracking completo
    total_points = models.IntegerField(default=0)  # Puntos totales (detección + práctica)
    max_streak = models.IntegerField(default=0)  # Racha máxima alcanzada
    total_practice_time = models.IntegerField(default=0)  # Tiempo total de práctica en minutos
    
    # NUEVOS CAMPOS PARA PUNTOS POR MODO
    detection_points = models.IntegerField(default=0)
    practice_points = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def add_experience(self, points):
        """Añade puntos de experiencia y actualiza nivel si corresponde"""
        self.experience_points += points
        self.total_points += points  # Actualizar puntos totales también
        
        level_threshold = self.level * 100
        if self.experience_points >= level_threshold:
            self.level += 1
            self.experience_points -= level_threshold
            return True
        return False
    
    def add_experience_by_mode(self, points, mode='detection'):
        """Añade puntos y actualiza el total según el modo"""
        if mode == 'detection':
            self.detection_points += points
        elif mode == 'practice':
            self.practice_points += points
        
        # Usar el método existente para actualizar experiencia
        self.add_experience(points)
        self.save()
    
    def update_streak(self):
        """Actualiza la racha de días consecutivos"""
        today = timezone.now().date()
        if self.last_activity:
            days_diff = (today - self.last_activity).days
            if days_diff == 1:
                self.streak_days += 1
            elif days_diff > 1:
                self.streak_days = 1
        else:
            self.streak_days = 1
        
        # Actualizar racha máxima si es necesario
        if self.streak_days > self.max_streak:
            self.max_streak = self.streak_days
        
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

# Actualizar el modelo Exercise para incluir categoría
class Exercise(models.Model):
    TYPE_CHOICES = (
        ('multiple_choice', 'Selección múltiple'),
        ('fill_blanks', 'Completar espacios'),
        ('matching', 'Relacionar'),
        ('pronunciation', 'Pronunciación'),
        ('anagram', 'Ordenar letras'),
    )
    
    CATEGORY_CHOICES = (
        ('vocabulary', 'Vocabulario'),
        ('pronunciation', 'Pronunciación'),
        ('grammar', 'Gramática'),
        ('detection', 'Detección'),
        ('phrases', 'Frases'),
        ('memory', 'Memoria'),
    )
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='vocabulary')  # Nuevo campo
    object_translation = models.ForeignKey(ObjectTranslation, on_delete=models.CASCADE)
    difficulty = models.IntegerField(default=1)
    question = models.TextField()
    answer = models.TextField()
    distractors = models.JSONField(null=True, blank=True)
    points = models.IntegerField(default=10)
    metadata = models.JSONField(null=True, blank=True)
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

# Actualizar ActivityLog para incluir modo y categoría
class ActivityLog(models.Model):
    MODE_CHOICES = (
        ('detection', 'Detección'),
        ('practice', 'Práctica'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='detection')  # Nuevo campo
    category = models.CharField(max_length=20, null=True, blank=True)  # Nuevo campo
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

# Nuevo modelo para categorías de progreso
class ProgressCategory(models.Model):
    CATEGORY_CHOICES = (
        ('vocabulary', 'Vocabulario'),
        ('pronunciation', 'Pronunciación'),
        ('grammar', 'Gramática'),
        ('detection', 'Detección'),
        ('phrases', 'Frases'),
        ('memory', 'Memoria'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    points = models.IntegerField(default=0)
    exercises_completed = models.IntegerField(default=0)
    accuracy_rate = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'category')
        verbose_name = 'Progreso por Categoría'
        verbose_name_plural = 'Progresos por Categoría'
    
    def __str__(self):
        return f"{self.user.username} - {self.get_category_display()}"

# Nuevo modelo para rachas y recompensas
class StreakReward(models.Model):
    streak_days = models.IntegerField(unique=True)
    reward_name = models.CharField(max_length=100)
    reward_description = models.TextField()
    bonus_points = models.IntegerField(default=0)
    icon = models.CharField(max_length=50, default='star')
    
    class Meta:
        ordering = ['streak_days']
        verbose_name = 'Recompensa por Racha'
        verbose_name_plural = 'Recompensas por Racha'
    
    def __str__(self):
        return f"{self.streak_days} días - {self.reward_name}"

# Modelo para sesiones de práctica
class PracticeSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=20)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    exercises_completed = models.IntegerField(default=0)
    points_earned = models.IntegerField(default=0)
    accuracy_rate = models.FloatField(default=0.0)
    
    class Meta:
        verbose_name = 'Sesión de Práctica'
        verbose_name_plural = 'Sesiones de Práctica'
    
    def __str__(self):
        return f"{self.user.username} - {self.category} - {self.start_time.date()}"
    
    def calculate_duration(self):
        """Calcula la duración de la sesión"""
        if self.end_time:
            duration = self.end_time - self.start_time
            self.duration_minutes = duration.total_seconds() // 60
            self.save()

# NUEVO MODELO PARA ANALYTICS
class AnalyticsEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    event_type = models.CharField(max_length=50)
    duration = models.IntegerField(default=0)
    score = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Evento de Analytics'
        verbose_name_plural = 'Eventos de Analytics'