import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from '../src/context/AuthContext';
import { styles } from '@/styles/mainScreen.style';

const API_BASE_URL = 'http://10.15.231.85:5260';

export default function MainScreen() {
  const { driver } = useAuth(); // contains token and driver info
  const [location, setLocation] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [rideRequests, setRideRequests] = useState<any[]>([]);

  // Get driver’s current location
  useEffect(() => {
    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    };
    getCurrentLocation();
  }, []);

  // Connect to SignalR hub
  useEffect(() => {
    if (!driver?.token) return;

    const connectHub = async () => {
      const hubConnection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/driverHub`, {
          accessTokenFactory: () => driver.token, // attach JWT
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      hubConnection.on('RideRequested', (rideData) => {
        console.log('New ride request:', rideData);
        setRideRequests((prev) => [...prev, rideData]);
        Alert.alert('🚗 New Ride Request', `Pickup: ${rideData.pickupLocation}\nDropoff: ${rideData.dropoffLocation}`);
      });

      try {
       await hubConnection.start();
console.log('SignalR connected');

if (!driver?.driverId) {
  console.error("❌ Missing driverId:", driver);
  return;
}

await hubConnection.invoke('RegisterDriver', driver.driverId);
      } catch (err) {
        console.error('SignalR connection error:', err);
      }

      setConnection(hubConnection);
    };

    connectHub();

    return () => {
      connection?.stop();
    };
  }, [driver?.token]);

  return (
    <View style={styles.container}>
      {/* Map showing driver location */}
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="You are here"
            pinColor="blue"
          />
        </MapView>
      ) : (
        <Text style={styles.loadingText}>Loading map...</Text>
      )}

      {/* Ride requests list */}
      <View style={styles.requestsContainer}>
        <Text style={styles.requestsTitle}>Incoming Ride Requests</Text>
        {rideRequests.length === 0 ? (
          <Text style={styles.noRequests}>No requests yet</Text>
        ) : (
          rideRequests.map((ride, index) => (
            <View key={index} style={styles.requestBox}>
              <Text style={styles.requestText}>Pickup: {ride.pickupLocation}</Text>
              <Text style={styles.requestText}>Dropoff: {ride.dropoffLocation}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}


