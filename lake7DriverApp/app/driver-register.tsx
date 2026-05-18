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
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/styles/driverRegister.style';

const API_BASE_URL = 'http://192.168.137.234:5260';   

export default function DriverRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Car'); // default to Car
  const [carCategory, setCarCategory] = useState('Economy'); // Economy, Classic, Premium
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const validateEmail = (email: string) => {
    return email.endsWith('@gmail.com');
  };

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return regex.test(password);
  };

  const handleSignup = async () => {
    // If Cycle, we ensure details are pre-filled
    const finalVehicleInfo = vehicleType === 'Cycle' ? 'Bicycle' : vehicleInfo;
    const finalLicensePlate = vehicleType === 'Cycle' ? 'N/A' : licensePlate;
    const finalVehicleType = vehicleType === 'Cycle' ? 'Delivery' : carCategory;

    if (!name || !email || !password || !phoneNumber || !finalVehicleInfo || !finalLicensePlate || !finalVehicleType) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Email must be a valid Gmail address (e.g., driver@gmail.com)');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Error',
        'Password must be at least 6 characters and include uppercase, lowercase, number, and symbol'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/driver/register`, {
        name,
        email,
        password,
        phoneNumber,
        vehicleInfo: finalVehicleInfo,
        licensePlate: finalLicensePlate,
        vehicleType: finalVehicleType,
      });

      Alert.alert(
        "🎉 Registration Successful!", 
        `Your driver account has been created successfully as a ${finalVehicleType} partner.\n\nPlease login to start working.`,
        [
          { text: "Go to Login", onPress: () => router.replace('/login') }
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
      <Text style={styles.title}>Become a Partner</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
      
      <Text style={styles.sectionLabel}>Select Your Vehicle / Role</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity 
          style={[styles.roleCard, vehicleType === 'Car' && styles.roleCardActive]} 
          onPress={() => {
            setVehicleType('Car');
            if (vehicleInfo === 'Bicycle') setVehicleInfo('');
            if (licensePlate === 'N/A') setLicensePlate('');
          }}
        >
          <Ionicons name="car" size={32} color={vehicleType === 'Car' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.roleText, vehicleType === 'Car' && styles.roleTextActive]}>Car (Rides)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleCard, vehicleType === 'Cycle' && styles.roleCardActive]} 
          onPress={() => {
            setVehicleType('Cycle');
            setVehicleInfo('Bicycle');
            setLicensePlate('N/A');
          }}
        >
          <Ionicons name="bicycle" size={32} color={vehicleType === 'Cycle' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.roleText, vehicleType === 'Cycle' && styles.roleTextActive]}>Cycle (Food Delivery)</Text>
        </TouchableOpacity>
      </View>

      {vehicleType === 'Cycle' && (
        <Text style={styles.infoText}>* Note: For Cyclist role, Vehicle Info is preset to "Bicycle" and License Plate is preset to "N/A" (Delivery Category).</Text>
      )}

      {vehicleType === 'Car' && (
        <>
          <Text style={styles.sectionLabel}>Select Ride Category</Text>
          <View style={styles.roleContainer}>
            {['Economy', 'Classic', 'Premium'].map((cat) => (
              <TouchableOpacity 
                key={cat}
                style={[styles.roleCard, carCategory === cat && styles.roleCardActive]} 
                onPress={() => setCarCategory(cat)}
              >
                <Ionicons 
                  name={cat === 'Economy' ? 'car' : cat === 'Classic' ? 'car-sport' : 'shield-checkmark'} 
                  size={28} 
                  color={carCategory === cat ? '#2563eb' : '#64748b'} 
                />
                <Text style={[styles.roleText, carCategory === cat && styles.roleTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Vehicle Info (e.g. Toyota Corolla 2018)" value={vehicleInfo} onChangeText={setVehicleInfo} />
          <TextInput style={styles.input} placeholder="License Plate" value={licensePlate} onChangeText={setLicensePlate} />
        </>
      )}

      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register Partner</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
