// src/components/AbandonSessionAlert.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AffectedWord {
 word: string;
 spanish: string;
 current_level: number;
 would_degrade: boolean;
 potential_new_level: number;
}

interface AbandonmentConsequence {
 mode: 'detection' | 'practice';
 failure_penalty: number;
 total_words_affected: number;
}

interface AbandonSessionAlertProps {
 visible: boolean;
 onCancel: () => void;
 onConfirm: () => void;
 warningMessage: string;
 affectedWords: AffectedWord[];
 abandonmentConsequence: AbandonmentConsequence;
}

export const AbandonSessionAlert: React.FC<AbandonSessionAlertProps> = ({
  visible,
  onCancel,
  onConfirm,
  warningMessage,
  affectedWords,
  abandonmentConsequence
 }) => {
  // Contar palabras que descenderán
  const degradingWords = affectedWords.filter(word => word.would_degrade);
  
  // Determinar si hay palabras que serían afectadas
  const hasAffectedWords = degradingWords.length > 0;
  
  // Verificar si alguna palabra tiene estrellas que perder
  const hasWordsWithStars = degradingWords.some(word => word.current_level > 0);
  
  // Determinar mensaje apropiado basado en si hay palabras con estrellas
  let displayMessage;
  if (hasAffectedWords && hasWordsWithStars) {
    // Hay palabras con estrellas que perder
    const starsCount = degradingWords.length === 1 ? "tu estrella" : "tus estrellas";
    displayMessage = `¿En serio vas a abandonar? Vas a perder ${starsCount}. ¿Estás seguro? 🤔`;
  } else {
    // No hay estrellas que perder
    displayMessage = "¿En serio vas a abandonar? Suerte que no tienes estrellas. 🤔";
  }
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.headerContainer}>
            <Ionicons name="warning-outline" size={28} color="#FFA000" />
            <Text style={styles.headerText}>¿En serio vas a abandonar?</Text>
          </View>
          
          <View style={styles.divider} />
          
          <ScrollView style={styles.scrollContainer}>
            <Text style={styles.warningMessage}>
              {hasAffectedWords ? warningMessage : displayMessage}
            </Text>
            
            {degradingWords.length > 0 && (
              <View style={styles.affectedWordsContainer}>
                <Text style={styles.affectedTitle}>Palabras que perderán una estrella:</Text>
                
                {degradingWords.map((word, index) => (
                  <View key={index} style={styles.wordItem}>
                    <View style={styles.wordInfo}>
                      <Text style={styles.wordText}>{word.word}</Text>
                      <Text style={styles.spanishText}>({word.spanish})</Text>
                    </View>
                    
                    <View style={styles.starsContainer}>
                      <Text style={styles.starsText}>
                        {Array(word.current_level).fill('⭐').join('')}
                        {' → '}
                        {Array(word.potential_new_level).fill('⭐').join('')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.consequenceContainer}>
              <Text style={styles.consequenceText}>
                En modo {abandonmentConsequence.mode === 'detection' ? 'Detección' : 'Práctica'},
                abandonar equivale a {abandonmentConsequence.failure_penalty} {abandonmentConsequence.failure_penalty === 1 ? 'fallo' : 'fallos'} consecutivos.
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.continueButton} onPress={onCancel}>
              <Text style={styles.continueText}>Continuar ejercicios</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.abandonButton} onPress={onConfirm}>
              <Text style={styles.abandonText}>Abandonar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
 };

const styles = StyleSheet.create({
 modalOverlay: {
   flex: 1,
   backgroundColor: 'rgba(0, 0, 0, 0.5)',
   justifyContent: 'center',
   alignItems: 'center',
   padding: 20,
 },
 modalContainer: {
   width: '90%',
   backgroundColor: 'white',
   borderRadius: 16,
   paddingTop: 20,
   paddingBottom: 16,
   elevation: 5,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 3.84,
   maxHeight: '80%',
 },
 headerContainer: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
   paddingHorizontal: 20,
   marginBottom: 10,
 },
 headerText: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#333',
   marginLeft: 10,
 },
 divider: {
   height: 1,
   backgroundColor: '#E0E0E0',
   marginBottom: 15,
 },
 scrollContainer: {
   paddingHorizontal: 20,
   maxHeight: 300,
 },
 warningMessage: {
   fontSize: 16,
   color: '#333',
   marginBottom: 15,
   lineHeight: 22,
 },
 affectedWordsContainer: {
   marginBottom: 15,
 },
 affectedTitle: {
   fontSize: 14,
   fontWeight: 'bold',
   color: '#F44336',
   marginBottom: 10,
 },
 wordItem: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   paddingVertical: 8,
   borderBottomWidth: 1,
   borderBottomColor: '#F5F5F5',
 },
 wordInfo: {
   flex: 1,
 },
 wordText: {
   fontSize: 16,
   fontWeight: 'bold',
   color: '#333',
 },
 spanishText: {
   fontSize: 14,
   color: '#757575',
 },
 starsContainer: {
   flexDirection: 'row',
   alignItems: 'center',
 },
 starsText: {
   fontSize: 14,
 },
 consequenceContainer: {
   backgroundColor: '#FFF8E1',
   padding: 10,
   borderRadius: 8,
   marginBottom: 10,
 },
 consequenceText: {
   fontSize: 14,
   color: '#FF8F00',
   lineHeight: 20,
 },
 buttonContainer: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   paddingHorizontal: 20,
   marginTop: 10,
 },
 continueButton: {
   flex: 1,
   backgroundColor: '#4CAF50',
   paddingVertical: 12,
   borderRadius: 25,
   marginRight: 10,
   alignItems: 'center',
 },
 continueText: {
   color: 'white',
   fontWeight: 'bold',
 },
 abandonButton: {
   flex: 1,
   backgroundColor: '#F44336',
   paddingVertical: 12,
   borderRadius: 25,
   marginLeft: 10,
   alignItems: 'center',
 },
 abandonText: {
   color: 'white',
   fontWeight: 'bold',
 },
});