import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

const API_BASE_URL = 'http://10.255.49.59:5260';
const { width, height } = Dimensions.get('window');

export default function ActiveRideScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { driver } = useAuth();
  
  const ride = JSON.parse(params.ride as string);
  
  const mapRef = useRef<MapView>(null);
  
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  
  // Real-time Ride stats
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0); // in km
  const [currentFare, setCurrentFare] = useState(50); // Base fare: 50 ETB

  const [isRideActive, setIsRideActive] = useState(true);

  // 1. Fetch pickup to destination route
  const fetchRoute = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/map/directions`, {
        params: {
          origin: `${ride.pickupLatitude},${ride.pickupLongitude}`,
          destination: `${ride.dropoffLatitude},${ride.dropoffLongitude}`,
        },
      });
      setRouteCoords(response.data);

      // Fit map to show both pickup and dropoff
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: ride.pickupLatitude, longitude: ride.pickupLongitude },
            { latitude: ride.dropoffLatitude, longitude: ride.dropoffLongitude },
          ],
          { edgePadding: { top: 120, right: 60, bottom: 60, left: 60 }, animated: true }
        );
      }, 500);
    } catch (error) {
      console.log("Route error:", error);
      // Even if route fails, still fit map to show both markers
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: ride.pickupLatitude, longitude: ride.pickupLongitude },
            { latitude: ride.dropoffLatitude, longitude: ride.dropoffLongitude },
          ],
          { edgePadding: { top: 120, right: 60, bottom: 60, left: 60 }, animated: true }
        );
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // 2. Location Tracking and simulating movement towards destination
  useEffect(() => {
    fetchRoute();
    
    let locationSubscription: any;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const loc = await Location.getCurrentPositionAsync({});
      setDriverLocation(loc.coords);
      
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLoc) => {
          if (!isRideActive) return;
          setDriverLocation(newLoc.coords);
          // calculate distance from pickup
          const dist = haversineDistance(
            ride.pickupLatitude, ride.pickupLongitude,
            newLoc.coords.latitude, newLoc.coords.longitude
          );
          setDistanceTraveled(Math.min(dist, haversineDistance(ride.pickupLatitude, ride.pickupLongitude, ride.dropoffLatitude, ride.dropoffLongitude)));
        }
      );
    };

    startTracking();

    return () => {
      locationSubscription?.remove();
    };
  }, [isRideActive]);

  // 3. Time counter and fare calculator
  useEffect(() => {
    if (!isRideActive) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => {
        const nextTime = prev + 1;
        // Fare = Base (50) + 0.1 ETB/sec + 25 ETB/km
        const calculatedFare = 50 + (nextTime * 0.1) + (distanceTraveled * 25);
        setCurrentFare(parseFloat(calculatedFare.toFixed(2)));
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [distanceTraveled, isRideActive]);

  // Haversine Distance helper
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCompleteRide = async () => {
    setIsRideActive(false); // Stop the fare count immediately

    Alert.alert(
      "Complete Ride",
      `Are you sure you want to complete this ride?\n\nTotal Fare: ETB ${currentFare.toFixed(2)}`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsRideActive(true) // Resume count if cancelled
        },
        {
          text: "Complete Ride",
          onPress: async () => {
            setCompleting(true);
            try {
              await axios.patch(`${API_BASE_URL}/api/Ride/${ride.id}/transition?newStatus=3&finalFare=${currentFare}`, {}, {
                headers: { Authorization: `Bearer ${driver.token}` }
              });
              Alert.alert('Ride Completed', `Total Fare: ETB ${currentFare.toFixed(2)}`);
              router.replace('/main-screen');
            } catch (error) {
              console.error('Error completing ride:', error);
              Alert.alert('Error', 'Could not complete ride.');
              setIsRideActive(true); // Resume count on error
            } finally {
              setCompleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Upper Map Navigation */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (ride.pickupLatitude + ride.dropoffLatitude) / 2,
            longitude: (ride.pickupLongitude + ride.dropoffLongitude) / 2,
            latitudeDelta: Math.abs(ride.pickupLatitude - ride.dropoffLatitude) * 2 + 0.02,
            longitudeDelta: Math.abs(ride.pickupLongitude - ride.dropoffLongitude) * 2 + 0.02,
          }}
        >
          {/* Pickup Marker */}
          <Marker coordinate={{ latitude: ride.pickupLatitude, longitude: ride.pickupLongitude }} title="Pickup">
            <View style={[styles.marker, { backgroundColor: '#10b981' }]} />
          </Marker>

          {/* Destination Marker */}
          <Marker coordinate={{ latitude: ride.dropoffLatitude, longitude: ride.dropoffLongitude }} title="Destination">
            <View style={[styles.marker, { backgroundColor: '#ef4444' }]} />
          </Marker>

          {/* Driver Location Marker */}
          {driverLocation && (
            <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Your Location">
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#004AAD" />
          )}
        </MapView>
      </View>

      {/* Floating Header Card for Destination */}
      <View style={styles.navigationHeader}>
        <Ionicons name="navigate-circle" size={28} color="#004AAD" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerLabel}>Heading to</Text>
          <Text style={styles.headerValue} numberOfLines={1}>{ride.dropoffLocation}</Text>
        </View>
      </View>

      {/* Live Counting Card */}
      <View style={styles.countingPanel}>
        <View style={styles.dragHandle} />
        
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>LIVE FARE</Text>
          <Text style={styles.fareValue}>ETB {currentFare.toFixed(2)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color="#64748b" />
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>{formatTime(elapsedSeconds)}</Text>
          </View>
          
          <View style={styles.statBox}>
            <Ionicons name="speedometer-outline" size={24} color="#64748b" />
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{distanceTraveled.toFixed(2)} km</Text>
          </View>
        </View>

        <View style={styles.customerBox}>
          <Ionicons name="person-circle" size={40} color="#004AAD" />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{ride.userName || 'Customer'}</Text>
            <Text style={styles.customerPhone}>{ride.userPhoneNumber || 'N/A'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={() => Alert.alert("Calling Customer", `Dialing ${ride.userPhoneNumber}`)}
          >
            <Ionicons name="call" size={20} color="#004AAD" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.completeButton, completing && { opacity: 0.7 }]}
          onPress={handleCompleteRide}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.completeText}>Complete Ride & Collect Fare</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  mapContainer: {
    height: '50%',
    width: '100%',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarker: {
    backgroundColor: '#004AAD',
    padding: 6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 2,
  },
  countingPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 25,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  fareContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 2,
  },
  fareValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#004AAD', // Theme blue instead of green
    marginTop: 4,
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 8,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  customerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 12,
    width: '100%',
    marginVertical: 10,
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerPhone: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  completeButton: {
    backgroundColor: '#004AAD', // Theme blue for completing the ride
    width: '100%',
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  completeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
