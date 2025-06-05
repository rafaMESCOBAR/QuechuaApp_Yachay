#translations\models.py

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import random

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

# ACTUALIZADO - UserProfile para nuevo sistema
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # NUEVOS CAMPOS PARA SISTEMA DE PALABRAS
    total_words = models.IntegerField(default=0)
    mastered_words = models.IntegerField(default=0)
    current_level = models.IntegerField(default=1)  # 1-10
    
    # Mantener campos útiles
    streak_days = models.IntegerField(default=0)
    last_activity = models.DateField(null=True, blank=True)
    native_speaker = models.BooleanField(default=False)
    preferred_dialect = models.CharField(max_length=50, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def get_level_title(self):
        """Devuelve el título según el nivel"""
        titles = {
            1: "Principiante",
            2: "Aprendiz",
            3: "Explorador",
            4: "Aventurero",
            5: "Conocedor",
            6: "Practicante",
            7: "Avanzado",
            8: "Experto",
            9: "Maestro",
            10: "Guardián del Quechua"
        }
        return titles.get(self.current_level, "Principiante")
    
    def update_level(self):
        """Actualiza el nivel basado en palabras totales y calidad"""
        # Umbral de palabras reequilibrado para mejor progresión
        thresholds = [0, 15, 35, 60, 100, 150, 225, 325, 450, 600]
        
        # Calcular bonus por dominio de palabras
        mastery_bonus = 0
        if self.total_words > 0:
            mastery_percent = self.mastered_words / self.total_words
            if mastery_percent >= 0.7:  # 70% o más palabras dominadas
                mastery_bonus = 1  # Bonus de nivel por buen dominio
        
        # Determinar nivel base por cantidad
        base_level = 1
        for i, threshold in enumerate(thresholds):
            if self.total_words >= threshold:
                base_level = i + 1
            else:
                break
        
        # Aplicar bonus de maestría (limitado a nivel 10)
        final_level = min(10, base_level + mastery_bonus)
        
        # Solo actualizar si hay cambio
        if self.current_level != final_level:
            old_level = self.current_level
            self.current_level = final_level
            self.save()
            
            # Si subió de nivel, registrar evento
            if final_level > old_level:
                ActivityLog.objects.create(
                    user=self.user,
                    activity_type='level_up',
                    details={
                        'previous_level': old_level,
                        'new_level': final_level,
                        'with_mastery_bonus': mastery_bonus > 0
                    }
                )
            return True
        return False
    
    def add_word(self):
        """Incrementa el contador de palabras y actualiza nivel"""
        self.total_words += 1
        self.update_level()
        self.save()
    
    def add_mastered_word(self):
        """Incrementa el contador de palabras dominadas"""
        self.mastered_words += 1
        self.update_level()
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
        
        self.last_activity = today
        self.save()

# Señales para crear perfil automáticamente
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

# ACTUALIZADO - Exercise sin puntos
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
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='vocabulary')
    object_translation = models.ForeignKey(ObjectTranslation, on_delete=models.CASCADE)
    difficulty = models.IntegerField(default=1)
    question = models.TextField()
    answer = models.TextField()
    distractors = models.JSONField(null=True, blank=True)
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

# ACTUALIZADO - Achievement simplificado
class Achievement(models.Model):
    TYPES = (
        ('vocabulary', 'Vocabulario'),
        ('mastery', 'Dominio'),
        ('streak', 'Constancia'),
        ('exploration', 'Exploración')
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=TYPES)
    requirement_value = models.IntegerField()
    icon = models.CharField(max_length=50)
    
    def __str__(self):
        return self.name
    
    @staticmethod
    def check_achievements(user):
        """Verifica y asigna logros automáticamente"""
        profile = user.profile
        
        # Logros por vocabulario
        vocab_achievements = Achievement.objects.filter(type='vocabulary')
        for achievement in vocab_achievements:
            if profile.total_words >= achievement.requirement_value:
                UserAchievement.objects.get_or_create(
                    user=user,
                    achievement=achievement
                )
        
        # Logros por dominio
        mastery_achievements = Achievement.objects.filter(type='mastery')
        for achievement in mastery_achievements:
            if profile.mastered_words >= achievement.requirement_value:
                UserAchievement.objects.get_or_create(
                    user=user,
                    achievement=achievement
                )
        
        # Logros por racha
        streak_achievements = Achievement.objects.filter(type='streak')
        for achievement in streak_achievements:
            if profile.streak_days >= achievement.requirement_value:
                UserAchievement.objects.get_or_create(
                    user=user,
                    achievement=achievement
                )

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'achievement')
        
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"

# ACTUALIZADO - ActivityLog simplificado
class ActivityLog(models.Model):
    MODE_CHOICES = (
        ('detection', 'Detección'),
        ('practice', 'Práctica'),
        ('system', 'Sistema'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='detection')
    category = models.CharField(max_length=20, null=True, blank=True)
    word_learned = models.CharField(max_length=100, null=True, blank=True)  # Palabra aprendida
    details = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type} - {self.timestamp}"

# Modelo para pronunciación (sin cambios)
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

# ACTUALIZADO - UserVocabulary con sistema diferenciado por modo y penalización por abandono
class UserVocabulary(models.Model):
    """
    Modelo para almacenar el vocabulario personal del usuario basado en objetos detectados
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vocabulary')
    object_label = models.CharField(max_length=100)
    spanish_word = models.CharField(max_length=100)
    quechua_word = models.CharField(max_length=100)
    
    # Sistema de estrellas (1-5)
    mastery_level = models.IntegerField(default=1)  # 1-5 estrellas
    previous_mastery_level = models.IntegerField(null=True, blank=True)  # NUEVO: almacenar nivel anterior
    exercises_completed = models.IntegerField(default=0)
    exercises_correct = models.IntegerField(default=0)
    consecutive_failures = models.IntegerField(default=0)  # Contador de fallos consecutivos
    abandoned_exercises = models.IntegerField(default=0)  # NUEVO: contador de ejercicios abandonados
    
    times_detected = models.IntegerField(default=1)
    first_detected = models.DateTimeField(auto_now_add=True)
    last_detected = models.DateTimeField(auto_now=True)
    last_practiced = models.DateTimeField(null=True, blank=True)
    mastered_date = models.DateTimeField(null=True, blank=True)  # Cuando alcanza 5 estrellas
    
    class Meta:
        verbose_name = "User Vocabulary"
        verbose_name_plural = "User Vocabularies"
        unique_together = ['user', 'quechua_word']
        
    def __str__(self):
        return f"{self.user.username} - {self.quechua_word} ({self.mastery_level}★)"
    
    # ✅ NUEVO: Método save() para normalización automática
    def save(self, *args, **kwargs):
        """Normalizar palabras antes de guardar para evitar duplicados"""
        # Normalizar palabras
        if self.quechua_word:
            self.quechua_word = self.quechua_word.strip().lower()
        if self.spanish_word:
            self.spanish_word = self.spanish_word.strip()
        
        super().save(*args, **kwargs)
    
    def update_mastery(self, correct_answer, mode='practice'):
        """
        Actualiza el nivel de dominio diferenciando entre modos
        ✅ CORREGIDO: Agrega protecciones según el modo (detección vs práctica)
        """
        self.exercises_completed += 1
        today = timezone.now().date()
        
        # Almacenar el nivel anterior para referencia
        self.previous_mastery_level = self.mastery_level
        was_degraded = False
        
        # Verificar condiciones de protección
        is_recent_word = False
        if self.first_detected:
            days_since_added = (today - self.first_detected.date()).days
            is_recent_word = days_since_added <= (3 if mode == 'detection' else 1)
            
        is_minimally_practiced = self.exercises_completed >= 5
        
        if correct_answer:
            # NO resetear fallos aquí, lo haremos al final
            self.exercises_correct += 1
            
            # Definir umbrales específicos por modo
            if mode == 'detection':
                # Umbrales más fáciles para el modo principal
                thresholds = {
                    2: 2,  # 2 aciertos para 2 estrellas
                    3: 5,  # 5 aciertos para 3 estrellas
                    4: 8,  # 8 aciertos para 4 estrellas
                    5: 12  # 12 aciertos para 5 estrellas (con 75% de precisión)
                }
                success_rate_threshold = 0.75  # 75% para detección
            else:  # 'practice'
                # Umbrales más difíciles para el modo secundario
                thresholds = {
                    2: 3,   # 3 aciertos para 2 estrellas (antes 2)
                    3: 7,   # 7 aciertos para 3 estrellas (antes 5)
                    4: 12,  # 12 aciertos para 4 estrellas (antes 8)
                    5: 18   # 18 aciertos para 5 estrellas (antes 12)
                }
                success_rate_threshold = 0.85  # 85% para práctica
            
            # Sistema de progresión con umbrales específicos por modo
            if self.exercises_correct >= thresholds[5] and self.mastery_level < 5:
                # Verificar tasa de éxito
                success_rate = self.exercises_correct / max(1, self.exercises_completed)
                
                if success_rate >= success_rate_threshold:
                    self.mastery_level = 5
                    self.mastered_date = timezone.now()
                    self.user.profile.add_mastered_word()
            elif self.exercises_correct >= thresholds[4] and self.mastery_level < 4:
                self.mastery_level = 4
            elif self.exercises_correct >= thresholds[3] and self.mastery_level < 3:
                self.mastery_level = 3
            elif self.exercises_correct >= thresholds[2] and self.mastery_level < 2:
                self.mastery_level = 2
        else:
            # Incrementar contador de fallos consecutivos
            self.consecutive_failures += 1
            
            # Definir umbrales según el modo
            if mode == 'detection':
                # Más permisivo en modo detección
                consecutive_failures_limit = 3
                mastery_protected_days = 3  # Protección para palabras nuevas
            else:  # 'practice'
                # Más estricto en modo práctica
                consecutive_failures_limit = 2
                mastery_protected_days = 1  # Menor protección
            
            # Verificar condiciones antes de degradar
            degraded_today = ActivityLog.objects.filter(
                user=self.user,
                activity_type='mastery_decreased',
                word_learned=self.quechua_word,
                timestamp__date=today
            ).exists()
            
            if (self.consecutive_failures >= consecutive_failures_limit and  # Límite de fallos
                self.mastery_level > 1 and                                  # Nivel superior a 1
                is_minimally_practiced and                                  # Mínimo de intentos
                not is_recent_word and                                      # No es palabra reciente
                not degraded_today):                                        # No degradada hoy
                
                # Aplicar pérdida de nivel
                self.mastery_level -= 1
                was_degraded = True
                
                # Registrar el evento
                ActivityLog.objects.create(
                    user=self.user,
                    activity_type='mastery_decreased',
                    mode=mode,
                    word_learned=self.quechua_word,
                    details={
                        'previous_level': self.previous_mastery_level,
                        'new_level': self.mastery_level,
                        'reason': 'consecutive_failures'
                    }
                )
        
        # CORREGIDO: Solo resetear el contador si hubo degradación o respuesta correcta
        if was_degraded or correct_answer:
            self.consecutive_failures = 0
        
        # ✅ CORRECCIÓN CRÍTICA: Aplicar límites según el modo
        if mode == 'detection':
            # Modo detección: mínimo 1⭐ (proteger descubrimiento), máximo 5⭐
            self.mastery_level = max(min(self.mastery_level, 5), 1)
        else:
            # Modo práctica: mínimo 0⭐, máximo 5⭐
            self.mastery_level = max(min(self.mastery_level, 5), 0)
        
        self.last_practiced = timezone.now()
        self.save()
        
        # Retornar información sobre cambios en nivel para el frontend
        return {
            'previous_level': self.previous_mastery_level,
            'current_level': self.mastery_level,
            'was_degraded': was_degraded,
            'is_recent_word': is_recent_word,
            'is_minimally_practiced': is_minimally_practiced,
            'consecutive_failures': self.consecutive_failures,
            'consecutive_failures_limit': consecutive_failures_limit if 'consecutive_failures_limit' in locals() else (3 if mode == 'detection' else 2)
        }
    
    def register_abandonment(self, mode='practice'):
        """
        Registra y penaliza el abandono de ejercicios
        """
        self.abandoned_exercises += 1
        today = timezone.now().date()
        
        # Guardar nivel anterior para referencia
        self.previous_mastery_level = self.mastery_level
        was_degraded = False
        
        # Evitar penalizar múltiples veces en el mismo día
        abandoned_today = ActivityLog.objects.filter(
            user=self.user,
            activity_type='exercise_abandoned',
            word_learned=self.quechua_word,
            timestamp__date=today
        ).exists()
        
        if abandoned_today:
            return False
        
        # Determinar penalización según el modo
        if mode == 'detection':
            # En modo detección, contar como un fallo
            self.consecutive_failures += 1
        else:  # 'practice'
            # En modo práctica, contar como dos fallos
            self.consecutive_failures += 2
        
        # Verificar si acumuló suficientes fallos para degradar
        is_recent_word = False
        if self.first_detected:
            days_since_added = (today - self.first_detected.date()).days
            is_recent_word = days_since_added <= (3 if mode == 'detection' else 1)
        
        is_minimally_practiced = self.exercises_completed >= 5
        
        # Definir límite según modo
        consecutive_failures_limit = 3 if mode == 'detection' else 2
        
        degraded_today = ActivityLog.objects.filter(
            user=self.user,
            activity_type='mastery_decreased',
            word_learned=self.quechua_word,
            timestamp__date=today
        ).exists()
        
        if (self.consecutive_failures >= consecutive_failures_limit and
            self.mastery_level > 1 and
            is_minimally_practiced and
            not is_recent_word and
            not degraded_today):
            
            # Aplicar pérdida de nivel
            self.mastery_level -= 1
            was_degraded = True
            
            # Registrar evento de degradación
            ActivityLog.objects.create(
                user=self.user,
                activity_type='mastery_decreased',
                mode=mode,
                word_learned=self.quechua_word,
                details={
                    'previous_level': self.previous_mastery_level,
                    'new_level': self.mastery_level,
                    'reason': 'abandonment'
                }
            )
            
            # CORREGIDO: Solo resetear contador si hubo degradación
            self.consecutive_failures = 0
        
        # ✅ APLICAR LÍMITES TAMBIÉN EN ABANDONO
        if mode == 'detection':
            # Modo detección: mínimo 1⭐ (proteger descubrimiento), máximo 5⭐
            self.mastery_level = max(min(self.mastery_level, 5), 1)
        else:
            # Modo práctica: mínimo 0⭐, máximo 5⭐
            self.mastery_level = max(min(self.mastery_level, 5), 0)
        
        # Registrar evento de abandono
        ActivityLog.objects.create(
            user=self.user,
            activity_type='exercise_abandoned',
            mode=mode,
            word_learned=self.quechua_word,
            details={
                'consecutive_failures': self.consecutive_failures,
                'mastery_level': self.mastery_level,
                'was_degraded': was_degraded
            }
        )
        
        self.save()
        return was_degraded

# NUEVO - Modelo para registro de sesiones de ejercicio
class ExerciseSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    is_abandoned = models.BooleanField(default=False)
    mode = models.CharField(max_length=20, choices=ActivityLog.MODE_CHOICES, default='detection')
    exercises_total = models.IntegerField(default=0)
    exercises_completed = models.IntegerField(default=0)
    
    def __str__(self):
        status = "en progreso"
        if self.is_completed:
            status = "completada"
        elif self.is_abandoned:
            status = "abandonada"
        return f"{self.user.username} - Sesión {status} - {self.start_time}"
    
    def mark_completed(self):
        """Marca la sesión como completada"""
        self.is_completed = True
        self.end_time = timezone.now()
        self.save()
    
    def mark_abandoned(self):
        """Marca la sesión como abandonada y penaliza"""
        self.is_abandoned = True
        self.end_time = timezone.now()
        self.save()
        
        # Penalizar palabras involucradas
        for exercise_log in self.exercise_logs.all():
            word = exercise_log.exercise.object_translation.quechua
            try:
                vocab = UserVocabulary.objects.get(
                    user=self.user,
                    quechua_word=word
                )
                vocab.register_abandonment(self.mode)
            except UserVocabulary.DoesNotExist:
                pass

# NUEVO - Modelo para registro detallado de ejercicios en sesión
class ExerciseSessionLog(models.Model):
    session = models.ForeignKey(ExerciseSession, on_delete=models.CASCADE, related_name='exercise_logs')
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    is_correct = models.BooleanField(null=True, blank=True)
    
    def __str__(self):
        status = "completado" if self.is_completed else "en progreso"
        return f"Ejercicio {status} - {self.exercise}"

# NUEVO - Modelo para metas diarias
class DailyGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    words_detected = models.IntegerField(default=0)
    words_practiced = models.IntegerField(default=0)
    words_mastered = models.IntegerField(default=0)
    
    # Metas
    detection_goal = models.IntegerField(default=3)  # Detectar 3 objetos
    practice_goal = models.IntegerField(default=5)   # Practicar 5 palabras
    mastery_goal = models.IntegerField(default=1)    # Dominar 1 palabra
    
    class Meta:
        unique_together = ('user', 'date')
        
    def __str__(self):
        return f"{self.user.username} - {self.date}"
    
    def is_complete(self):
        """Verifica si se completaron todas las metas"""
        return (self.words_detected >= self.detection_goal and
                self.words_practiced >= self.practice_goal and
                self.words_mastered >= self.mastery_goal)