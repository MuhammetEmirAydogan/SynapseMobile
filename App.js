import React, { useState, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker'; 
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './src/LoginScreen';
import api from './src/api'; // Fetch yerine bunu kullanacağız 

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 1. Uygulama açılınca Token var mı kontrol et
  useEffect(() => {
    const checkLogin = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        setIsAuthenticated(true);
      }
      setCheckingAuth(false);
    };
    checkLogin();
  }, []);

  // 2. Çıkış Yap Fonksiyonu
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setIsAuthenticated(false);
  };

  // Eğer hala kontrol ediliyorsa bekleme ekranı göster
  if (checkingAuth) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Eğer giriş yapılmamışsa Login Ekranını göster
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <ChatScreen onLogout={handleLogout} />;
}

// --- SENİN ORİJİNAL CHAT KODLARIN ---
function ChatScreen({ onLogout }) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null); 

  const [chatHistory, setChatHistory] = useState([
    { id: '1', text: 'Selam! Ben Synapse AI. Önce yukarıdan bir PDF yükle, sonra sorunu sor! 🧠', sender: 'bot' }
  ]);

  // 1. DOSYA SEÇME VE YÜKLEME 
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf',
      });

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCurrentFileName(file.name); 
      Alert.alert("Başarılı! ", `${file.name} hafızaya kaydedildi. Mod: Odaklanmış.`);
        
      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        text: `"${file.name}" dosyasını okudum. Artık sadece bu dosyayla ilgili soruları cevaplayacağım.`, 
        sender: 'bot' 
      }]);

    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || "Yükleme başarısız oldu.";
      Alert.alert("Hata", errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. MESAJ GÖNDERME 
  const handleSend = async () => {
    if (message.trim().length === 0) return;

    const userMessage = { id: Date.now().toString(), text: message, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage]);
    
    const originalMessage = message;
    setMessage('');
    setIsLoading(true);

    try {
      // Backend'e soruyu gönder 
      const response = await api.post('/ask', {
        question: originalMessage,
        model_type: 'flash',
        file_name: currentFileName
      });

      const botResponse = { 
        id: (Date.now() + 1).toString(), 
        text: response.data.answer, 
        sender: 'bot',
        model: response.data.used_model,
        source: currentFileName
      };
      setChatHistory(prev => [...prev, botResponse]);

    } catch (error) {
      console.error(error);
      const errorMsg = { 
        id: (Date.now() + 1).toString(), 
        text: 'Hata! Token süresi dolmuş veya sunucu kapalı olabilir.', 
        sender: 'bot' 
      };
      setChatHistory(prev => [...prev, errorMsg]);
      
      if (error.response?.status === 401) {
        Alert.alert("Oturum Süresi Doldu", "Lütfen tekrar giriş yapın.");
        onLogout();
      }
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
        <View style={styles.metaContainer}>
           <Text style={styles.modelText}>⚡ {item.model}</Text>
           {item.source && <Text style={styles.sourceText}> {item.source}</Text>}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Synapse</Text>
        
        <View style={{flexDirection:'row', gap: 10}}>
            {/* Dosya Yükle Butonu */}
            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={pickDocument}
              disabled={isUploading}
            >
            {isUploading ? (
                <ActivityIndicator color="#fff" size="small" />
            ) : (
                <Text style={styles.uploadButtonText}>📄 Yükle</Text>
            )}
            </TouchableOpacity>

            {/* Çıkış Yap Butonu */}
            <TouchableOpacity 
              style={[styles.uploadButton, {backgroundColor: '#FF3B30'}]} 
              onPress={onLogout}
            >
              <Text style={styles.uploadButtonText}>Çıkış</Text>
            </TouchableOpacity>
        </View>
      </View>
      
      {currentFileName && (
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>Aktif Dosya: {currentFileName}</Text>
        </View>
      )}

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
            placeholder={currentFileName ? "Dosya hakkında sor..." : "Önce dosya yükle..."}
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  uploadButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  uploadButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  infoBar: { backgroundColor: '#E8F5E9', padding: 5, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  infoText: { color: '#2E7D32', fontSize: 12, fontWeight: '600' },
  listContent: { padding: 15, paddingBottom: 20 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E5EA' },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#fff' },
  botText: { color: '#000' },
  metaContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, gap: 10 },
  modelText: { fontSize: 10, color: '#999' },
  sourceText: { fontSize: 10, color: '#34C759', fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ddd', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16, height: 40 },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' },
  disabledButton: { backgroundColor: '#999' },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});