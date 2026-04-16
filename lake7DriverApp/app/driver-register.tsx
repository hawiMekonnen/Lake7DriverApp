// app/driver-register.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5260';   

export default function DriverRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !email || !password || !phoneNumber || !vehicleInfo || !licensePlate || !vehicleType) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/driver/register`, {
        name,
        email,
        password,
        phoneNumber,
        vehicleInfo,
        licensePlate,
        vehicleType,
      });

      // SUCCESS MESSAGE - Clear and friendly
      Alert.alert(
        "🎉 Registration Successful!", 
        "Your driver account has been created successfully.\n\nPlease login to start accepting rides and deliveries.",
        [
          { 
            text: "Go to Login", 
            onPress: () => router.replace('/login') 
          }
        ]
      );

    } catch (error: any) {
      console.error('Registration error:', error);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Registration failed. Please try again.';
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Become a Driver</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Vehicle Info (e.g. Toyota Corolla 2018)" value={vehicleInfo} onChangeText={setVehicleInfo} />
      <TextInput style={styles.input} placeholder="License Plate" value={licensePlate} onChangeText={setLicensePlate} />
      <TextInput style={styles.input} placeholder="Vehicle Type (Car, Bike, etc.)" value={vehicleType} onChangeText={setVehicleType} />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register as Driver</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#1e2937',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 25,
    color: '#2563eb',
    fontSize: 16,
  },
});