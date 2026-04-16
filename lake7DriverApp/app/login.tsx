
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      const endpoint = 'http://localhost:5260/api/driver/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      const data = await response.json();
      if (data.token) {
        console.log('JWT Token:', data.token);
      } else {
        console.log('Login response:', data);
      }
      login(data); // You may want to store token or driver info
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/driver-register')}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 16,
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 24,
	},
	input: {
		width: 280,
		height: 44,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 16,
		fontSize: 16,
	},
	button: {
		backgroundColor: '#007bff',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		marginBottom: 12,
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	switchText: {
		color: '#007bff',
		fontSize: 16,
		marginTop: 8,
	},
	linkText: {
		color: '#007bff',
		fontSize: 16,
		marginTop: 8,
	},
});
