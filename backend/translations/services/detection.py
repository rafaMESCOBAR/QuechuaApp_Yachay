#services/detection.py

from ultralytics import YOLO
import numpy as np
from PIL import Image
import logging
import cv2
import os

logger = logging.getLogger(__name__)

class ObjectDetectionService:
    def __init__(self):
        self._model = None
        self.confidence_threshold = 0.25
        self.max_file_size = 10 * 1024 * 1024  # 10MB

    @property
    def model(self):
        if self._model is None:
            try:
                self._model = YOLO('yolov8n.pt')
                logger.info("Modelo YOLO cargado exitosamente")
            except Exception as e:
                logger.error(f"Error al cargar el modelo YOLO: {str(e)}")
                raise RuntimeError(f"Error al cargar el modelo YOLO: {str(e)}")
        return self._model

    def validate_image(self, image_file):
        if image_file.size > self.max_file_size:
            raise ValueError(f"El tamaño de la imagen excede el límite de {self.max_file_size/1024/1024}MB")
        
        try:
            img = Image.open(image_file)
            img.verify()
            return True
        except Exception as e:
            raise ValueError(f"Archivo de imagen inválido: {str(e)}")

    def detect_objects(self, image_file):
        try:
            self.validate_image(image_file)
            
            # Leer imagen
            image = Image.open(image_file)
            image = image.convert('RGB')
            image_np = np.array(image)
            
            # Realizar detección
            results = self.model(image_np)[0]
            
            filtered_detections = []
            
            # Procesar resultados
            for detection in results.boxes.data:
                x1, y1, x2, y2, confidence, class_id = detection
                if confidence >= self.confidence_threshold:
                    label = results.names[int(class_id)]
                    logger.info(f"Detectado: {label} con confianza: {confidence}")
                    
                    filtered_detections.append({
                        'label': label.lower(),  # Convertir a minúsculas para consistencia
                        'confidence': float(confidence * 100),
                        'bbox': [
                            float(y1), float(x1),
                            float(y2), float(x2)
                        ]
                    })
            
            # Ordenar por confianza
            filtered_detections.sort(key=lambda x: x['confidence'], reverse=True)
            
            logger.info(f"YOLO Detección exitosa: {len(filtered_detections)} objetos encontrados")
            return filtered_detections
            
        except Exception as e:
            logger.error(f"Error en la detección YOLO: {str(e)}")
            raise RuntimeError(f"Error en la detección: {str(e)}")