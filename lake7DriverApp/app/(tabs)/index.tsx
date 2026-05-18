import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { styles } from '@/styles/index.style';

const { width } = Dimensions.get('window');

export default function DriverHomeScreen() {
  const router = useRouter();
  const { driver } = useAuth();
  const [isPressed, setIsPressed] = useState(false);

  if (!driver) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Illustration */}
      <View style={styles.illustrationContainer}>
        <Image 
          source={require('../../assets/images/car.png')} 
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Welcome Text */}
      <View style={styles.textContainer}>
        <Text style={styles.welcomeText}>Welcome Back, {driver?.name || 'Driver'}!</Text>
        <Text style={styles.subtitle}>
          Ready to earn today?{'\n'}Accept rides and deliveries
        </Text>
      </View>

      {/* Look for Ride Requests Button */}
      <TouchableOpacity 
        style={styles.loginButton}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={() => router.push('/main-screen')}
      >
        <Ionicons name="reader-outline" size={24} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.loginButtonText}>Look for Ride Requests</Text>
      </TouchableOpacity>

      {/* Info Cards */}
      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Ionicons name="cash-outline" size={32} color="#2563eb" />
          <Text style={styles.infoTitle}>Earn More</Text>
          <Text style={styles.infoDesc}>Competitive rates per ride</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={32} color="#2563eb" />
          <Text style={styles.infoTitle}>Flexible Hours</Text>
          <Text style={styles.infoDesc}>Work when you want</Text>
        </View>
      </View>
    </ScrollView>
  );
}
