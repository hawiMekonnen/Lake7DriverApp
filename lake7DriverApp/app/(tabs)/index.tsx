// app/(tabs)/index.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DriverHomeScreen() {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

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
        <Text style={styles.welcomeText}>Welcome Back, Driver!</Text>
        <Text style={styles.subtitle}>
          Ready to earn today?{'\n'}Accept rides and deliveries
        </Text>
      </View>

      {/* Login Button */}
      <TouchableOpacity 
        style={styles.loginButton}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={() => router.push('/login')}
      >
        <Ionicons name="log-in-outline" size={24} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.loginButtonText}>Login to Start Earning</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  illustrationContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },

  illustration: {
    width: width * 0.8,
    height: 220,
  },

  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
  },

  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e2937',
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 17,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
  },

  loginButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 40,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  buttonIcon: {
    marginRight: 12,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e2937',
    marginTop: 12,
    marginBottom: 6,
  },

  infoDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});