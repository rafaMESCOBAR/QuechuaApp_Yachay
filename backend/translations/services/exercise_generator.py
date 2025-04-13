# translations/services/exercise_generator.py
import openai
import json
import random
import logging
from django.conf import settings
from ..models import ObjectTranslation, Exercise

logger = logging.getLogger(__name__)

class ExerciseGeneratorService:
    def __init__(self):
        # Obtener clave API de OpenAI desde settings
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.client = None
        
        if self.api_key:
            try:
                # Usar la API de OpenAI correctamente según su versión
                try:
                    # Nueva versión de la API de OpenAI
                    self.client = openai.OpenAI(api_key=self.api_key)
                    print("Cliente OpenAI (nueva versión) inicializado correctamente")
                except:
                    # Versión anterior de la API de OpenAI
                    openai.api_key = self.api_key
                    self.client = openai
                    print("Cliente OpenAI (versión antigua) inicializado correctamente")
                
                logger.info("Cliente OpenAI inicializado")
            except Exception as e:
                logger.error(f"Error al inicializar cliente OpenAI: {str(e)}")
                print(f"Error OpenAI: {str(e)}")
        else:
            logger.warning("No se encontró API key para OpenAI")
            print("No se encontró API key para OpenAI")
        
    def generate_exercises(self, object_translation, user_level=1):
        """Genera diferentes tipos de ejercicios para un objeto traducido"""
        exercises = []
        
        # Verificar que tengamos un cliente OpenAI
        if not self.client or not self.api_key:
            logger.warning("API Key de OpenAI no configurada o cliente no inicializado")
            print(f"API Key: {'Configurada' if self.api_key else 'No configurada'}")
            print(f"Cliente: {'Inicializado' if self.client else 'No inicializado'}")
            return self._generate_fallback_exercises(object_translation, user_level)
        
        try:
            # Generar ejercicios usando ChatGPT
            multiple_choice = self._generate_multiple_choice(object_translation, user_level)
            if multiple_choice:
                exercises.append(multiple_choice)
                
            fill_blanks = self._generate_fill_blanks(object_translation, user_level)
            if fill_blanks:
                exercises.append(fill_blanks)
                
            matching = self._generate_matching(object_translation, user_level)
            if matching:
                exercises.append(matching)
                
            pronunciation = self._generate_pronunciation(object_translation, user_level)
            if pronunciation:
                exercises.append(pronunciation)
            
            if not exercises:
                logger.warning("No se generaron ejercicios con IA, usando respaldo")
                print("No se generaron ejercicios con IA, usando respaldo")
                return self._generate_fallback_exercises(object_translation, user_level)
                
            return exercises
        except Exception as e:
            logger.error(f"Error al generar ejercicios con ChatGPT: {str(e)}", exc_info=True)
            print(f"Error al generar ejercicios con ChatGPT: {str(e)}")
            # Si hay error, usar respaldo
            return self._generate_fallback_exercises(object_translation, user_level)
    
    def _generate_multiple_choice(self, object_translation, user_level):
        """Genera ejercicio de selección múltiple usando ChatGPT"""
        try:
            # Obtener otras palabras en quechua para usar como distractores
            other_translations = list(ObjectTranslation.objects.exclude(
                id=object_translation.id
            ).order_by('?')[:5])
            
            other_quechua_words = [t.quechua for t in other_translations]
            other_quechua_str = ", ".join(other_quechua_words)
            
            prompt = f"""
            Genera un ejercicio de selección múltiple para aprender la palabra '{object_translation.quechua}' 
            en Quechua que significa '{object_translation.spanish}' en español.
            
            El nivel del estudiante es {user_level} (donde 1 es principiante y 5 es avanzado).
            
            Considera las siguientes palabras en quechua para usar como distractores: {other_quechua_str}
            
            Crea un ejercicio divertido y educativo con la siguiente estructura:
            {{
                "question": "Una pregunta en español sobre la palabra",
                "correct_answer": "{object_translation.quechua}",
                "distractors": ["distractor1", "distractor2", "distractor3"]
            }}
            
            Solo responde con el JSON, sin texto adicional.
            """
            
            # Determinar qué versión de la API usar
            if hasattr(self.client, "chat") and hasattr(self.client.chat, "completions"):
                # Nueva versión de la API
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message.content
            else:
                # Versión antigua de la API
                response = self.client.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message["content"]
            
            # Limpiar la respuesta para asegurar que sea JSON válido
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            print(f"Respuesta de ChatGPT para ejercicio múltiple choice: {content}")
            exercise_data = json.loads(content)
            
            # Crear objeto Exercise
            exercise = Exercise(
                type='multiple_choice',
                object_translation=object_translation,
                difficulty=user_level,
                question=exercise_data['question'],
                answer=exercise_data['correct_answer'],
                distractors=exercise_data['distractors'],
                points=10 * user_level
            )
            
            return exercise
            
        except Exception as e:
            logger.error(f"Error generando ejercicio de selección múltiple: {str(e)}", exc_info=True)
            print(f"Error en múltiple choice: {str(e)}")
            return None
    
    def _generate_fill_blanks(self, object_translation, user_level):
        """Genera ejercicio de completar espacios usando ChatGPT"""
        try:
            prompt = f"""
            Crea un ejercicio de completar espacios para la palabra '{object_translation.quechua}' 
            en Quechua que significa '{object_translation.spanish}' en español.
            
            El nivel del estudiante es {user_level} (donde 1 es principiante y 5 es avanzado).
            
            Crea un ejercicio divertido y educativo con la siguiente estructura:
            {{
                "question": "Completa la palabra en quechua: _ _ _ _ (con algunas letras ya completadas)",
                "answer": "{object_translation.quechua}",
                "hint": "Una pista útil para el estudiante"
            }}
            
            Para el nivel {user_level}, muestra aproximadamente {6 - user_level} letras de la palabra (más letras para principiantes, menos para avanzados).
            
            Solo responde con el JSON, sin texto adicional.
            """
            
            # Determinar qué versión de la API usar
            if hasattr(self.client, "chat") and hasattr(self.client.chat, "completions"):
                # Nueva versión de la API
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message.content
            else:
                # Versión antigua de la API
                response = self.client.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message["content"]
            
            # Limpiar la respuesta para asegurar que sea JSON válido
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            print(f"Respuesta de ChatGPT para ejercicio fill blanks: {content}")
            exercise_data = json.loads(content)
            
            # Crear objeto Exercise
            exercise = Exercise(
                type='fill_blanks',
                object_translation=object_translation,
                difficulty=user_level,
                question=exercise_data['question'],
                answer=exercise_data['answer'],
                distractors={"hint": exercise_data['hint']},
                points=15 * user_level
            )
            
            return exercise
            
        except Exception as e:
            logger.error(f"Error generando ejercicio de completar espacios: {str(e)}", exc_info=True)
            print(f"Error en fill blanks: {str(e)}")
            return None
    
    def _generate_matching(self, object_translation, user_level):
        """Genera ejercicio de relacionar usando ChatGPT"""
        try:
            # Obtener otras traducciones para el ejercicio
            other_translations = list(ObjectTranslation.objects.exclude(
                id=object_translation.id
            ).order_by('?')[:3])
            
            pairs = [
                {"spanish": object_translation.spanish, "quechua": object_translation.quechua}
            ]
            
            for trans in other_translations:
                pairs.append({"spanish": trans.spanish, "quechua": trans.quechua})
            
            # Crear objeto Exercise
            exercise = Exercise(
                type='matching',
                object_translation=object_translation,
                difficulty=user_level,
                question=f"Relaciona las siguientes palabras en español con su traducción en quechua. Incluye '{object_translation.spanish}'.",
                answer=object_translation.quechua,
                distractors={"pairs": pairs},
                points=12 * user_level
            )
            
            return exercise
            
        except Exception as e:
            logger.error(f"Error generando ejercicio de relacionar: {str(e)}", exc_info=True)
            print(f"Error en matching: {str(e)}")
            return None
    
    def _generate_pronunciation(self, object_translation, user_level):
        """Genera ejercicio de pronunciación"""
        try:
            prompt = f"""
            Crea un ejercicio de pronunciación para la palabra '{object_translation.quechua}' 
            en Quechua que significa '{object_translation.spanish}' en español.
            
            El nivel del estudiante es {user_level} (donde 1 es principiante y 5 es avanzado).
            
            Crea instrucciones claras para pronunciar correctamente esta palabra, con la siguiente estructura:
            {{
                "instructions": "Instrucciones detalladas para pronunciar esta palabra",
                "phonetic_guide": "Una guía fonética simple"
            }}
            
            Solo responde con el JSON, sin texto adicional.
            """
            
            # Determinar qué versión de la API usar
            if hasattr(self.client, "chat") and hasattr(self.client.chat, "completions"):
                # Nueva versión de la API
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message.content
            else:
                # Versión antigua de la API
                response = self.client.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesor especializado en la enseñanza del idioma Quechua."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7
                )
                content = response.choices[0].message["content"]
            
            # Limpiar la respuesta para asegurar que sea JSON válido
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            print(f"Respuesta de ChatGPT para ejercicio de pronunciación: {content}")
            exercise_data = json.loads(content)
            
            # Crear objeto Exercise
            exercise = Exercise(
                type='pronunciation',
                object_translation=object_translation,
                difficulty=user_level,
                question=f"Practica la pronunciación de la palabra '{object_translation.quechua}'. {exercise_data['instructions']}",
                answer=object_translation.quechua,
                distractors={"phonetic_guide": exercise_data['phonetic_guide']},
                points=20 * user_level
            )
            
            return exercise
            
        except Exception as e:
            logger.error(f"Error generando ejercicio de pronunciación: {str(e)}", exc_info=True)
            print(f"Error en pronunciación: {str(e)}")
            return None
    
# Agrega estas funciones al archivo translations/services/exercise_generator.py
# Dentro de la clase ExerciseGeneratorService

# En la función _generate_fallback_exercises, añade o modifica esto para incluir los 5 tipos:

def _generate_fallback_exercises(self, object_translation, user_level):
    """Genera ejercicios gamificados sin usar ChatGPT"""
    exercises = []
    
    try:
        # Obtener otras traducciones para usar como distractores
        other_translations = list(ObjectTranslation.objects.exclude(
            id=object_translation.id
        ).order_by('?')[:10])
        
        # ---- EJERCICIO DE SELECCIÓN MÚLTIPLE ----
        # Plantillas más interesantes para preguntas
        story_templates = [
            f"¡Desafío quechua! Un viajero en Cusco te pregunta por '{object_translation.spanish}'. ¿Cómo le responderías en el idioma local?",
            f"¡Misión inca! Estás aprendiendo quechua con tu abuela. Ella señala un {object_translation.spanish} y te pide su nombre en quechua.",
            f"¡Relámpago quechua! ¿Cómo dirías '{object_translation.spanish}' en el idioma de los incas?",
            f"En el mercado de Pisac, necesitas comprar un {object_translation.spanish}. ¿Cómo lo pedirías en quechua?",
            f"¡Prueba tu conocimiento! ¿Cuál es la palabra quechua para '{object_translation.spanish}'?"
        ]
        
        # Configurar dificultad
        difficulty_modifier = min(user_level, 5)
        distractors = [t.quechua for t in other_translations[:3]]
        
        # Configurar puntos basados en dificultad
        base_points = 10 * difficulty_modifier
        time_bonus = 5 * difficulty_modifier  # Bonus por responder rápido
        
        exercises.append(Exercise(
            type='multiple_choice',
            object_translation=object_translation,
            difficulty=user_level,
            question=random.choice(story_templates),
            answer=object_translation.quechua,
            distractors=distractors,
            points=base_points,
            metadata={
                "time_limit": 30 - difficulty_modifier * 3,  # Menos tiempo en niveles más altos
                "time_bonus": time_bonus,
                "penalty": -5,  # Penalización por respuesta incorrecta
                "feedback_correct": [
                    "¡Increíble! Dominas el quechua como un verdadero inca.",
                    "¡Excelente! Los antiguos incas estarían orgullosos.",
                    "¡Sumaq! (¡Excelente en quechua!) Has acertado."
                ],
                "feedback_incorrect": [
                    f"No es correcto. La palabra correcta es '{object_translation.quechua}'.",
                    "Casi lo tienes. Sigue practicando el quechua.",
                    "Recuerda que el idioma quechua requiere práctica. ¡Inténtalo de nuevo!"
                ]
            }
        ))
        
        # ---- EJERCICIO DE COMPLETAR ESPACIOS ----
        word = object_translation.quechua
        blanks = ['_'] * len(word)
        
        # Mostrar algunas letras basadas en la dificultad
        visible_chars = max(1, len(word) - difficulty_modifier)
        positions = random.sample(range(len(word)), min(visible_chars, len(word)))
        for pos in positions:
            blanks[pos] = word[pos]
        blanked_word = ''.join(blanks)
        
        # Plantillas más interesantes
        fill_blank_templates = [
            f"Un antiguo manuscrito inca tiene la palabra: {blanked_word} ¿Puedes completarla? (Significa '{object_translation.spanish}')",
            f"En la escuela de Machu Picchu, los estudiantes aprenden a escribir: {blanked_word} ¿Cómo completarías esta palabra para '{object_translation.spanish}'?",
            f"Un sabio quechua escribe en un pergamino: {blanked_word}. Ayúdale a completar la palabra para '{object_translation.spanish}'",
            f"¡Desafío de escritura quechua! Completa: {blanked_word} ('{object_translation.spanish}' en español)"
        ]
        
        # Pistas más útiles e interesantes
        hints = [
            f"La palabra tiene {len(word)} letras y empieza con '{word[0]}'",
            f"Piensa en cómo suena '{object_translation.spanish}' pero con pronunciación quechua",
            f"En quechua, las palabras suelen tener un ritmo particular. Escucha el sonido en tu mente."
        ]
        
        exercises.append(Exercise(
            type='fill_blanks',
            object_translation=object_translation,
            difficulty=user_level,
            question=random.choice(fill_blank_templates),
            answer=object_translation.quechua,
            distractors={"hint": random.choice(hints)},
            points=15 * difficulty_modifier,
            metadata={
                "time_limit": 45 - difficulty_modifier * 3,
                "time_bonus": 8 * difficulty_modifier,
                "streak_bonus": 5,  # Bonus por racha de respuestas correctas
                "hint_penalty": -3,  # Penalización por usar pista
                "feedback_correct": [
                    "¡Perfecto! Escribes quechua como un experto.",
                    "¡Qué habilidad! Estás dominando la escritura quechua.",
                    "¡Asombroso! Has completado la palabra correctamente."
                ],
                "feedback_incorrect": [
                    f"Casi lo tienes. La palabra correcta es '{object_translation.quechua}'.",
                    "Es un poco diferente. Presta atención a cada letra en quechua.",
                    "Sigue practicando. El quechua tiene un patrón único de escritura."
                ]
            }
        ))
        
        # ---- EJERCICIO DE PRONUNCIACIÓN ----
        # Escenarios más interesantes
        pronunciation_templates = [
            f"Estás en un mercado tradicional en Cusco y quieres comprar {object_translation.spanish}. Los vendedores solo hablan quechua. ¡Practica tu pronunciación!",
            f"Eres guía turístico en las ruinas incas y necesitas explicar qué es '{object_translation.spanish}' en el idioma original. ¡Pronuncia como un local!",
            f"En una ceremonia inca, debes nombrar '{object_translation.spanish}' en quechua. Todos los ancianos te escuchan. ¡Hazlo correctamente!",
            f"¡Desafío de pronunciación quechua! Intenta decir '{object_translation.quechua}' con la mejor pronunciación posible."
        ]
        
        # Guías fonéticas mejoradas
        syllables = []
        for i in range(0, len(word), 2):
            if i + 2 <= len(word):
                syllables.append(word[i:i+2])
            else:
                syllables.append(word[i:])
                
        phonetic_guides = [
            f"Pronuncia cada sílaba lentamente: {' - '.join(syllables)}",
            f"En quechua, las vocales son claras y cortas. La 'q' suena desde la garganta. Intenta: {word}",
            f"Recuerda que en quechua, el acento suele caer en la penúltima sílaba: {word}",
            f"Las consonantes en quechua tienen un sonido distintivo. Escucha atentamente y repite: {word}"
        ]
        
        exercises.append(Exercise(
            type='pronunciation',
            object_translation=object_translation,
            difficulty=user_level,
            question=random.choice(pronunciation_templates),
            answer=object_translation.quechua,
            distractors={"phonetic_guide": random.choice(phonetic_guides)},
            points=20 * difficulty_modifier,
            metadata={
                "time_limit": 60,  # Más tiempo para practicar y grabar
                "accuracy_bonus": 10,  # Bonus por buena pronunciación
                "feedback_levels": ["Principiante", "Intermedio", "Avanzado", "Nativo"],
                "culture_note": f"La palabra '{object_translation.quechua}' es importante en la cultura quechua. Pronunciarla correctamente muestra respeto por sus tradiciones."
            }
        ))
        
        # ---- EJERCICIO DE MATCHING ----
        if len(other_translations) >= 3:
            # Crear pares de palabras español-quechua
            related_translations = [
                {"spanish": object_translation.spanish, "quechua": object_translation.quechua}
            ]
            
            # Seleccionar traducciones para hacer parejas
            for trans in other_translations[:3]:
                related_translations.append({"spanish": trans.spanish, "quechua": trans.quechua})
            
            # Contextos para el ejercicio
            matching_contexts = [
                f"¡Desafío del mercado inca! Relaciona estas palabras en español con su traducción en quechua. ¡Encuentra '{object_translation.spanish}'!",
                f"En la escuela de sabios quechuas, debes emparejar cada palabra española con su equivalente quechua. Incluye '{object_translation.spanish}'.",
                f"Para completar tu viaje por Machu Picchu, debes mostrar que conoces estas palabras en quechua. Relaciona cada par correctamente."
            ]
            
            exercises.append(Exercise(
                type='matching',
                object_translation=object_translation,
                difficulty=user_level,
                question=random.choice(matching_contexts),
                answer=object_translation.quechua,
                distractors={"pairs": related_translations},
                points=18 * difficulty_modifier,
                metadata={
                    "time_limit": 90 - difficulty_modifier * 5,
                    "time_bonus": 10,
                    "combo_bonus": 5,  # Bonus por cada par correcto consecutivo
                    "all_correct_bonus": 15,  # Bonus por completar todo correctamente
                    "game_mode": "drag_and_drop"  # Sugiere una interfaz de arrastrar y soltar
                }
            ))
        
        # ---- EJERCICIO DE ANAGRAMA ----
        # Plantillas para preguntas de anagramas
        anagram_templates = [
            f"Ordena las letras para formar la palabra en quechua para '{object_translation.spanish}'",
            f"Las letras están desordenadas. Forma la palabra quechua que significa '{object_translation.spanish}'",
            f"¡Desafío de letras! Reorganiza las letras para escribir '{object_translation.quechua}'",
            f"En el antiguo templo inca, debes ordenar estas letras para formar el nombre de '{object_translation.spanish}' en quechua"
        ]
        
        exercises.append(Exercise(
            type='anagram',
            object_translation=object_translation,
            difficulty=user_level,
            question=random.choice(anagram_templates),
            answer=object_translation.quechua,
            distractors={"hint": f"Esta palabra significa '{object_translation.spanish}' en español"},
            points=20 * difficulty_modifier,
            metadata={
                "time_limit": 60 - difficulty_modifier * 5,
                "time_bonus": 10 * difficulty_modifier,
                "spanish_translation": object_translation.spanish,
                "feedback_correct": [
                    "¡Perfecto! Has ordenado las letras correctamente.",
                    "¡Gran trabajo! Tu dominio del quechua crece día a día.",
                    "¡Impresionante! Los incas estarían orgullosos de tu habilidad."
                ],
                "feedback_incorrect": [
                    f"No es correcto. La palabra ordenada correctamente es '{object_translation.quechua}'.",
                    "Sigue intentando. El quechua requiere práctica y paciencia.",
                    "Inténtalo de nuevo. Recuerda que estás formando una palabra real en quechua."
                ]
            }
        ))
        
        return exercises
        
    except Exception as e:
        logger.error(f"Error generando ejercicios de respaldo: {str(e)}", exc_info=True)
        print(f"Error en ejercicios de respaldo: {str(e)}")
        # Si incluso el respaldo falla, crear un ejercicio simple
        return [Exercise(
            type='multiple_choice',
            object_translation=object_translation,
            difficulty=1,
            question=f"¿Cómo se dice '{object_translation.spanish}' en quechua?",
            answer=object_translation.quechua,
            distractors=["opción1", "opción2", "opción3"],
            points=10
        )]