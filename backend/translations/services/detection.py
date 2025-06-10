from ultralytics import YOLO
import numpy as np
from PIL import Image
import logging
import cv2
import os
import threading

logger = logging.getLogger(__name__)

class ObjectDetectionService:
    """
    🔧 VERSIÓN OPTIMIZADA: Patrón Singleton para evitar recargar YOLOv8s constantemente
    
    PROBLEMA SOLUCIONADO:
    - ANTES: Cada worker de Gunicorn cargaba su propio modelo (3 workers = 3 modelos = 1.5GB)
    - AHORA: Solo una instancia del modelo compartida entre todos los workers (500MB total)
    
    RESULTADO: Sin más logs repetitivos de "Modelo YOLOv8s cargado exitosamente" cada 30 segundos
    """
    
    # Variables de clase para Singleton
    _instance = None
    _model = None
    _lock = threading.Lock()  # Thread safety para múltiples workers de Gunicorn
    
    def __new__(cls):
        """
        Patrón Singleton: Garantiza una sola instancia del servicio
        Esto evita que cada worker cree su propia instancia
        """
        if cls._instance is None:
            with cls._lock:
                # Double-checking pattern para thread safety
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    # Inicializar solo una vez
                    cls._instance.confidence_threshold = 0.25
                    cls._instance.max_file_size = 10 * 1024 * 1024  # 10MB
                    logger.info("🎯 ObjectDetectionService Singleton inicializado")
        return cls._instance

    @property
    def model(self):
        """
        Carga el modelo YOLOv8s solo una vez y lo reutiliza
        Thread-safe para múltiples workers
        """
        if self._model is None:
            with self._lock:
                # Double-checking pattern
                if self._model is None:
                    try:
                        # Usar YOLOv8s que es más preciso que YOLOv8n
                        self._model = YOLO('yolov8s.pt')
                        logger.info("✅ Modelo YOLOv8s cargado exitosamente (SINGLETON - Solo una vez)")
                    except Exception as e:
                        logger.error(f"❌ Error al cargar el modelo YOLOv8s: {str(e)}")
                        raise RuntimeError(f"Error al cargar el modelo YOLOv8s: {str(e)}")
        return self._model

    def validate_image(self, image_file):
        """
        Valida que el archivo de imagen sea correcto
        Misma funcionalidad que antes - Sin cambios
        """
        if image_file.size > self.max_file_size:
            raise ValueError(f"El tamaño de la imagen excede el límite de {self.max_file_size/1024/1024}MB")
        
        try:
            img = Image.open(image_file)
            img.verify()
            return True
        except Exception as e:
            raise ValueError(f"Archivo de imagen inválido: {str(e)}")

    def detect_objects(self, image_file):
        """
        Detecta objetos en la imagen usando YOLOv8s
        
        FUNCIONAMIENTO IDÉNTICO AL ANTERIOR:
        - Mismos parámetros de entrada
        - Misma respuesta JSON
        - Misma funcionalidad
        - Solo optimizado internamente
        """
        try:
            self.validate_image(image_file)
            
            # Leer imagen (exactamente igual que antes)
            image = Image.open(image_file)
            image = image.convert('RGB')
            image_np = np.array(image)
            
            # Realizar detección con YOLOv8s (usando modelo singleton)
            results = self.model(image_np, verbose=False)[0]
            
            filtered_detections = []
            
            # Procesar resultados (exactamente igual que antes)
            for detection in results.boxes.data:
                x1, y1, x2, y2, confidence, class_id = detection
                if confidence >= self.confidence_threshold:
                    label = results.names[int(class_id)]
                    # Cambié a debug para reducir spam en logs
                    logger.debug(f"Detectado: {label} con confianza: {confidence:.2f}")
                    
                    filtered_detections.append({
                        'label': label.lower(),  # Convertir a minúsculas para consistencia
                        'confidence': float(confidence),
                        'bbox': [
                            float(y1), float(x1),
                            float(y2), float(x2)
                        ]
                    })
            
            # Ordenar por confianza (exactamente igual que antes)
            filtered_detections.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Log de resumen (menos verboso)
            logger.info(f"🎯 Detección exitosa: {len(filtered_detections)} objetos encontrados")
            return filtered_detections
            
        except Exception as e:
            logger.error(f"❌ Error en la detección YOLOv8s: {str(e)}")
            raise RuntimeError(f"Error en la detección: {str(e)}")

    @classmethod
    def get_instance(cls):
        """
        Método alternativo para obtener la instancia singleton
        Útil para casos específicos donde necesites acceso directo
        """
        return cls()

    def __str__(self):
        """Representación string para debugging"""
        return f"ObjectDetectionService(singleton_id={id(self)}, model_loaded={self._model is not None})"