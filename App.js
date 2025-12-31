import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker'; // Dosya seçici

// Backend Adresi (iOS Simülatör için)
const API_URL = 'http://127.0.0.1:8000/api/v1';

export default function App() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Yükleme durumu
  
  const [chatHistory, setChatHistory] = useState([
    { id: '1', text: 'Selam! Ben Synapse AI. Önce yukarıdan bir PDF yükle, sonra sorunu sor! 🧠', sender: 'bot' }
  ]);

  // 1. DOSYA SEÇME VE YÜKLEME FONKSİYONU
  const pickDocument = async () => {
    try {
      // Dosya Seçiciyi Aç
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf', // Sadece PDF
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsUploading(true);

      // Gönderilecek Paketi Hazırla (FormData)
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf', // Backend PDF bekliyor
      });

      // Backend'e Gönder (/upload)
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Başarılı! 🎉", `${file.name} hafızaya kaydedildi. Şimdi soru sorabilirsin.`);
        // Bot da mesaj atsın
        setChatHistory(prev => [...prev, { 
          id: Date.now().toString(), 
          text: `📄 "${file.name}" dosyasını okudum ve hafızama attım. Sor gelsin!`, 
          sender: 'bot' 
        }]);
      } else {
        Alert.alert("Hata", data.detail || "Yükleme başarısız oldu.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Sunucuya bağlanılamadı.");
    } finally {
      setIsUploading(false);
    }
  };

  // 2. MESAJ GÖNDERME FONKSİYONU
  const handleSend = async () => {
    if (message.trim().length === 0) return;

    const userMessage = { id: Date.now().toString(), text: message, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage]);
    
    const originalMessage = message;
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: originalMessage,
          model_type: 'flash' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const botResponse = { 
          id: (Date.now() + 1).toString(), 
          text: data.answer, 
          sender: 'bot',
          model: data.used_model
        };
        setChatHistory(prev => [...prev, botResponse]);
      } else {
        throw new Error(data.detail || 'Bir hata oluştu');
      }

    } catch (error) {
      const errorMsg = { 
        id: (Date.now() + 1).toString(), 
        text: '⚠️ Bağlantı hatası! Backend sunucusu açık mı?', 
        sender: 'bot' 
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.bubble, 
      item.sender === 'user' ? styles.userBubble : styles.botBubble
    ]}>
      <Text style={[
        styles.messageText, 
        item.sender === 'user' ? styles.userText : styles.botText
      ]}>
        {item.text}
      </Text>
      {item.model && (
        <Text style={styles.modelText}>⚡ {item.model}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* HEADER: Başlık ve Yükle Butonu */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Synapse 🧠</Text>
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={pickDocument}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.uploadButtonText}>📄 PDF Yükle</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={chatHistory}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Sorunu sor..."
            value={message}
            onChangeText={setMessage}
            placeholderTextColor="#999"
            editable={!isLoading} 
          />
          <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.disabledButton]} 
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row', // Yan yana diz
    justifyContent: 'space-between', // Aralarını aç
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#34C759', // Yeşil renk
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#000',
  },
  modelText: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    height: 40,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});