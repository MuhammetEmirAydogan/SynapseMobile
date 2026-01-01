import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from './api';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen email ve şifre girin.');
      return;
    }

    setLoading(true);
    try {
      // Backend'e POST isteği atıyoruz
      // Form Data formatında göndermemiz gerek 
      const formData = new URLSearchParams();
      formData.append('username', email); 
      formData.append('password', password);

      const response = await api.post('/token', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Token'ı al ve telefona kaydet
      const { access_token } = response.data;
      await SecureStore.setItemAsync('userToken', access_token);
      
      // Başarılı! Ana ekrana geç
      onLoginSuccess();

    } catch (error) {
      console.error(error);
      Alert.alert('Giriş Başarısız', 'Email veya şifre hatalı olabilir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Synapse Giriş 🧠</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email Adresiniz"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: '#333' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});