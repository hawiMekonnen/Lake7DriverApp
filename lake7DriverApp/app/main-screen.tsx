import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from '../src/context/AuthContext';
import { styles } from '@/styles/mainScreen.style';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.137.218:5260';

export default function MainScreen() {
  const { driver } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);

  // Fetch nearby pending rides
  const fetchNearbyRides = async (lat: number, lon: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Ride/nearby-pending?latitude=${lat}&longitude=${lon}&radiusKm=10`, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      setRideRequests(response.data);
    } catch (error) {
      console.error('Error fetching nearby rides:', error);
    }
  };

  // Update driver location on backend
  const updateDriverLocation = async (lat: number, lon: number) => {
    if (!driver?.driverId) return;
    try {
      await axios.post(`${API_BASE_URL}/api/Driver/${driver.driverId}/location`, {
        latitude: lat,
        longitude: lon,
        licensePlate: 'N/A',
        vehicleType: 'N/A'
      }, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Get driver’s current location and start tracking
  useEffect(() => {
    let locationSubscription: any;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      fetchNearbyRides(loc.coords.latitude, loc.coords.longitude);
      updateDriverLocation(loc.coords.latitude, loc.coords.longitude);

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 50 },
        (newLoc) => {
          setLocation(newLoc.coords);
          updateDriverLocation(newLoc.coords.latitude, newLoc.coords.longitude);
        }
      );
    };

    startLocationTracking();

    return () => {
      locationSubscription?.remove();
    };
  }, []);

  // Fit markers when active ride changes
  useEffect(() => {
    if (activeRide && location && mapRef.current) {
      const coordinates = [
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: activeRide.pickupLatitude, longitude: activeRide.pickupLongitude },
        { latitude: activeRide.dropoffLatitude, longitude: activeRide.dropoffLongitude },
      ];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  }, [activeRide, location]);

  // Refresh pending rides periodically
  useEffect(() => {
    if (!location || activeRide) return;

    const interval = setInterval(() => {
      fetchNearbyRides(location.latitude, location.longitude);
    }, 10000);

    return () => clearInterval(interval);
  }, [location, activeRide]);

  // Connect to SignalR hub
  useEffect(() => {
    if (!driver?.token) return;

    const connectHub = async () => {
      const hubConnection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/driverHub`, {
          accessTokenFactory: () => driver.token,
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      hubConnection.on('RideRequested', (rideData) => {
        console.log('New ride request via SignalR:', rideData);
        setRideRequests((prev) => {
          if (prev.find(r => r.id === rideData.id)) return prev;
          return [rideData, ...prev];
        });
      });

      hubConnection.on('Registered', (driverId) => {
        console.log('Driver registered in hub:', driverId);
      });

      try {
        await hubConnection.start();
        if (driver?.driverId) {
          await hubConnection.invoke('RegisterDriver', driver.driverId);
        }
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

  const handleAcceptRide = async (rideId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/Ride/${rideId}/accept?driverId=${driver.driverId}`, {}, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      
      setActiveRide(response.data);
      setRideRequests([]);
      Alert.alert('Ride Accepted', 'Navigate to pickup point.');
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Could not accept ride.');
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/Ride/${rideId}/transition?newStatus=3`, {}, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      
      setActiveRide(null);
      Alert.alert('Success', 'Ride completed!');
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Could not complete ride.');
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Driver Marker */}
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="You"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="car" size={24} color="#004AAD" />
            </View>
          </Marker>

          {/* Active Ride Markers */}
          {activeRide && (
            <>
              <Marker
                coordinate={{ latitude: activeRide.pickupLatitude, longitude: activeRide.pickupLongitude }}
                title="Pickup"
              >
                <View style={[styles.markerContainer, { borderColor: '#10b981' }]}>
                  <Ionicons name="location" size={24} color="#10b981" />
                </View>
              </Marker>
              <Marker
                coordinate={{ latitude: activeRide.dropoffLatitude, longitude: activeRide.dropoffLongitude }}
                title="Dropoff"
              >
                <View style={[styles.markerContainer, { borderColor: '#ef4444' }]}>
                  <Ionicons name="flag" size={24} color="#ef4444" />
                </View>
              </Marker>
            </>
          )}
        </MapView>
      ) : (
        <Text style={styles.loadingText}>Locating you...</Text>
      )}

      <View style={styles.requestsContainer}>
        <Text style={styles.requestsTitle}>
          {activeRide ? 'Ride in Progress' : 'Available Requests'}
        </Text>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {activeRide ? (
            <View style={styles.requestBox}>
              <Text style={styles.requestText}>
                <Text style={styles.label}>Pickup: </Text>{activeRide.pickupLocation}
              </Text>
              <Text style={styles.requestText}>
                <Text style={styles.label}>Dropoff: </Text>{activeRide.dropoffLocation}
              </Text>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Customer: {activeRide.userName || 'User'}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Calling', `Dialing ${activeRide.userPhoneNumber}`)}>
                  <Text style={styles.userPhone}>📞 {activeRide.userPhoneNumber}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.completeButton} 
                onPress={() => handleCompleteRide(activeRide.id)}
              >
                <Text style={styles.buttonText}>Complete Ride</Text>
              </TouchableOpacity>
            </View>
          ) : rideRequests.length === 0 ? (
            <Text style={styles.noRequests}>Looking for nearby rides...</Text>
          ) : (
            rideRequests.map((ride, index) => (
              <View key={index} style={styles.requestBox}>
                <Text style={styles.requestText}>
                  <Text style={styles.label}>From: </Text>{ride.pickupLocation}
                </Text>
                <Text style={styles.requestText}>
                  <Text style={styles.label}>To: </Text>{ride.dropoffLocation}
                </Text>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.acceptButton} 
                    onPress={() => handleAcceptRide(ride.id)}
                  >
                    <Text style={styles.buttonText}>Accept Ride</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}


