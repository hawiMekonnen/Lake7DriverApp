import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from '../src/context/AuthContext';
import { styles } from '@/styles/mainScreen.style';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.137.234:5260';

export default function MainScreen() {
  const { driver } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const fetchActiveOrder = async () => {
    if (!driver?.driverId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Order/driver/${driver.driverId}/active`, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      if (response.data) {
        console.log('Fetched active order:', response.data);
        setActiveOrder(response.data);
      }
    } catch (error) {
      console.log('No active order found or error fetching it');
    }
  };

  const formatItemDescription = (description: string) => {
    try {
      const parsed = JSON.parse(description);
      if (parsed && parsed.items) {
        return parsed.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ');
      }
    } catch (e) {
      // Not JSON
    }
    return description;
  };

  useEffect(() => {
    if (driver?.driverId) {
      fetchActiveOrder();
    }
  }, [driver?.driverId]);

  // Fetch nearby pending rides
  const fetchNearbyRides = async (lat: number, lon: number) => {
    if (driver?.vehicleType === 'Delivery') {
      return; // Cyclists (Delivery) do not accept rides
    }
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
        licensePlate: driver.licensePlate || 'N/A',
        vehicleType: driver.vehicleType || 'N/A'
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
        if (rideData.vehicleType !== driver?.vehicleType) {
          return; // Only show ride requests that match driver's vehicle/ride option!
        }
        console.log('New ride request via SignalR:', rideData);
        setRideRequests((prev) => {
          if (prev.find(r => r.id === rideData.id)) return prev;
          return [rideData, ...prev];
        });
      });

      hubConnection.on('OrderAssigned', (orderData) => {
        console.log('New order assigned via SignalR:', orderData);
        setActiveOrder(orderData);
        Alert.alert('New Order Assigned', 'You have a new food delivery. Pick it up from the restaurant.');
      });

      hubConnection.on('OrderPrepared', (orderData) => {
        if (driver?.vehicleType === 'Delivery' && !activeOrder) {
          console.log('Order prepared alert:', orderData);
          Alert.alert(
            'Food Ready for Pickup',
            `An order is ready at ${orderData.senderName || orderData.pickupAddress || 'the restaurant'}.`
          );
        }
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

  const handleUpdateOrderStatus = async (orderId: string, status: number) => {
    try {
      // OrderStatus enums in backend: Received=2, Prepared=3, OutForDelivery=4, Delivered=5, Completed=6
      await axios.patch(`${API_BASE_URL}/api/Order/${orderId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      
      if (status === 5 || status === 6) {
        setActiveOrder(null);
        Alert.alert('Success', 'Order delivered!');
      } else {
        // Refresh active order status
        setActiveOrder((prev: any) => ({ ...prev, status }));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Could not update order status.');
    }
  };

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
              <Ionicons name={driver?.vehicleType === 'Delivery' ? 'bicycle' : 'car'} size={24} color="#004AAD" />
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
          {activeRide || activeOrder ? 'Job in Progress' : 'Available Requests'}
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
          ) : activeOrder ? (
            <View style={styles.requestBox}>
              <Text style={styles.requestText}>
                <Text style={styles.label}>Restaurant: </Text>{activeOrder.senderName || activeOrder.pickupAddress || activeOrder.delivery?.pickupAddress}
              </Text>
              <Text style={styles.requestText}>
                <Text style={styles.label}>Deliver to: </Text>{activeOrder.receiverName || activeOrder.dropoffAddress || activeOrder.delivery?.dropoffAddress}
              </Text>
              <Text style={styles.requestText}>
                <Text style={styles.label}>Items: </Text>{formatItemDescription(activeOrder.itemDescription || activeOrder.delivery?.itemDescription || '')}
              </Text>
              
              <View style={styles.buttonContainer}>
                {(activeOrder.delivery?.status === 0 || activeOrder.delivery?.status === 'Pending') ? (
                  <TouchableOpacity 
                    style={[styles.acceptButton, { backgroundColor: '#004AAD', flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} 
                    onPress={() => handleUpdateOrderStatus(activeOrder.id, 4)} // Set to OutForDelivery (4) which automatically sets delivery.Status = RideStatus.Accepted
                  >
                    <Text style={styles.buttonText}>Accept Delivery Job</Text>
                  </TouchableOpacity>
                ) : (activeOrder.status === 3 || activeOrder.status === 'Prepared' || activeOrder.status === 2 || activeOrder.status === 'Received') ? (
                  <TouchableOpacity 
                    style={[styles.acceptButton, { backgroundColor: '#f59e0b', flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} 
                    onPress={() => handleUpdateOrderStatus(activeOrder.id, 4)} // Set to OutForDelivery (4)
                  >
                    <Text style={styles.buttonText}>Pick Up Order</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.completeButton, { backgroundColor: '#10b981', flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} 
                    onPress={() => handleUpdateOrderStatus(activeOrder.id, 5)} // Set to Delivered (5)
                  >
                    <Text style={styles.buttonText}>Mark as Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
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


