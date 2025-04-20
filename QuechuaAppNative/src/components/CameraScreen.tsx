// src/components/CameraScreen.tsx

import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Image, Alert, Modal, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { ApiService } from '../services/api';
import { DetectionResponse } from '../types/api';
import { DetectionResultModal } from './DetectionResultModal';

export function CameraScreen() {
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastPhotoPath, setLastPhotoPath] = useState('');

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(isFrontCamera ? 'front' : 'back');
  const camera = useRef<Camera>(null);

  useEffect(() => {
    if (isFrontCamera) {
      setFlashMode('off');
    }
  }, [isFrontCamera]);

  const processImage = async (path: string) => {
    setIsProcessing(true);
    setLastPhotoPath(path);
    try {
      const results = await ApiService.detectObjects(path);
      setDetectionResults(results);
      setShowResults(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder a la galería');
    }
  };

  const savePhoto = async (path: string) => {
    try {
      await MediaLibrary.requestPermissionsAsync();
      await MediaLibrary.saveToLibraryAsync(path);
      setSessionPhotos(prev => [...prev, `file://${path}`]);
      Alert.alert('Éxito', 'Foto guardada en la galería');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la foto');
    }
  };

  const takePhoto = async () => {
    try {
      if (camera.current) {
        const photo = await camera.current.takePhoto({
          flash: flashMode
        });
        await savePhoto(photo.path);
        await processImage(`file://${photo.path}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const Grid = () => (
    <View style={styles.gridContainer}>
      <View style={styles.gridLine} />
      <View style={[styles.gridLine, { top: '66.66%' }]} />
      <View style={[styles.gridLine, styles.vertical]} />
      <View style={[styles.gridLine, styles.vertical, { left: '66.66%' }]} />
    </View>
  );

  const SessionGallery = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showGallery}
      onRequestClose={() => setShowGallery(false)}
    >
      <View style={styles.galleryContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowGallery(false)}
        >
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.galleryGrid}>
          {sessionPhotos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.galleryImage}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);
  
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Se necesita permiso para usar la cámara</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Solicitar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No hay cámara disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mostrar la cámara solo cuando no se están mostrando resultados */}
      {!showResults && (
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={!showResults} // Desactivar cuando se muestra el modal
          photo={true}
          enableZoomGesture={true}
        />
      )}
      
      {isGridVisible && !showResults && <Grid />}
      
      {!showResults && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[
              styles.controlButton,
              flashMode === 'on' && styles.activeButton,
              isFrontCamera && styles.disabledButton
            ]}
            onPress={() => !isFrontCamera && setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
            disabled={isFrontCamera}
          >
            <Text style={[
              styles.buttonText,
              isFrontCamera && styles.disabledButtonText
            ]}>
              {flashMode === 'on' ? '⚡️ ON' : '⚡️ OFF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isGridVisible && styles.activeButton
            ]}
            onPress={() => setIsGridVisible(!isGridVisible)}
          >
            <Text style={styles.buttonText}>⊞</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterButton}
            onPress={takePhoto}
          >
            <View style={styles.shutterButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          >
            <Text style={styles.buttonText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={pickImage}
          >
            <Text style={styles.buttonText}>🖼️</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Procesando imagen...</Text>
        </View>
      )}
      
      <SessionGallery />
      
      <DetectionResultModal
        isVisible={showResults}
        onClose={() => setShowResults(false)}
        results={detectionResults}
        imagePath={lastPhotoPath}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 15,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(255,255,0,0.5)',
  },
  disabledButton: {
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  disabledButtonText: {
    color: 'rgba(255,255,255,0.5)',
  },
  shutterButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 3,
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.4)',
    top: '33.33%',
    width: '100%',
    height: 1,
  },
  vertical: {
    width: 1,
    height: '100%',
    left: '33.33%',
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: 'black',
    padding: 20,
  },
  closeButton: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    marginBottom: 20,
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryImage: {
    width: '32%',
    height: 120,
    marginBottom: 10,
    borderRadius: 5,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
  },
});