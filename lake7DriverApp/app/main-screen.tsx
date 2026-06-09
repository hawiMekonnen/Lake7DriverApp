import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from '../src/context/AuthContext';
import { styles } from '@/styles/mainScreen.style';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_BASE_URL = 'http://10.255.49.59:5260';

export default function MainScreen() {
  const { driver } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const fetchActiveRide = async () => {
    if (!driver?.driverId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Ride/getAll`, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      const active = response.data.find((r: any) => 
        r.driverId === driver.driverId && 
        (r.status === 1 || r.status === 2 || r.status === 'Accepted' || r.status === 'InProgress')
      );
      if (active) {
        console.log('Fetched active ride:', active);
        setActiveRide(active);
        if (active.status === 2 || active.status === 'InProgress') {
          router.push({
            // cast pathname to any to satisfy route union types when dynamic route isn't in the union
            pathname: '/active-ride' as any,
            params: { ride: JSON.stringify(active) }
          });
        }
      }
    } catch (error) {
      console.log('Error fetching active ride:', error);
    }
  };

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
      fetchActiveRide();
    }
  }, [driver?.driverId]);

  // Fetch nearby pending requests (rides or orders)
  const fetchNearbyRequests = async (lat: number, lon: number) => {
    if (!driver?.token) return;
    try {
      if (driver?.vehicleType === 'Delivery') {
        const response = await axios.get(`${API_BASE_URL}/api/Order/nearby-prepared?latitude=${lat}&longitude=${lon}&radiusKm=10`, {
          headers: { Authorization: `Bearer ${driver.token}` }
        });
        setRideRequests(response.data);
      } else {
        const response = await axios.get(`${API_BASE_URL}/api/Ride/nearby-pending?latitude=${lat}&longitude=${lon}&radiusKm=10`, {
          headers: { Authorization: `Bearer ${driver.token}` }
        });
        setRideRequests(response.data);
      }
    } catch (error) {
      console.error('Error fetching nearby requests:', error);
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
      fetchNearbyRequests(loc.coords.latitude, loc.coords.longitude);
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

  // Fit markers when active ride or active order changes
  useEffect(() => {
    if (location && mapRef.current) {
      if (activeRide) {
        const coordinates = [
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: activeRide.pickupLatitude, longitude: activeRide.pickupLongitude },
          { latitude: activeRide.dropoffLatitude, longitude: activeRide.dropoffLongitude },
        ];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        });
      } else if (activeOrder && activeOrder.delivery) {
        const coordinates = [
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: activeOrder.delivery.pickupLatitude, longitude: activeOrder.delivery.pickupLongitude },
          { latitude: activeOrder.delivery.dropoffLatitude, longitude: activeOrder.delivery.dropoffLongitude },
        ];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        });
      }
    }
  }, [activeRide, activeOrder, location]);

  // Refresh pending requests periodically
  useEffect(() => {
    if (!location || activeRide || (driver?.vehicleType === 'Delivery' && activeOrder)) return;

    const interval = setInterval(() => {
      fetchNearbyRequests(location.latitude, location.longitude);
    }, 10000);

    return () => clearInterval(interval);
  }, [location, activeRide, activeOrder, driver?.vehicleType]);

  // Connect to SignalR hub
  useEffect(() => {
    if (!driver?.token) return;

    const connectHub = async () => {
      const hubConnection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/driverHub`, {
          accessTokenFactory: () => driver.token,
        })
        .configureLogging(LogLevel.None)
        .withAutomaticReconnect()
        .build();



      hubConnection.onclose(async (error) => {
        console.log('SignalR connection closed silently, will try to reconnect...', error);
        setTimeout(async () => {
          if (hubConnection.state === 'Disconnected') {
            try {
              await hubConnection.start();
              if (driver?.driverId) {
                await hubConnection.invoke('RegisterDriver', driver.driverId);
              }
            } catch (e) {
              console.log('Silent reconnect failed');
            }
          }
        }, 5000);
      });

      hubConnection.on('RideRequested', (rideData) => {
        const rideVehicleType = rideData.vehicleType?.toLowerCase();
        const driverVehicleType = driver?.vehicleType?.toLowerCase();
        
        if (rideVehicleType !== driverVehicleType) {
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

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/Order/${orderId}/assign/${driver.driverId}`, {}, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      setActiveOrder(response.data);
      setRideRequests([]);
      Alert.alert('Order Accepted', 'Navigate to restaurant to pick up.');
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Could not accept order.');
    }
  };

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

  const handleStartRide = async (rideId: string) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/Ride/${rideId}/transition?newStatus=2`, {}, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      
      const updatedRide = response.data;
      setActiveRide(updatedRide);
      Alert.alert('Ride Started', 'Navigate to destination.');
      router.push({
        pathname: '/active-ride',
        params: { ride: JSON.stringify(updatedRide) }
      });
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Could not start ride.');
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

          {/* Active Order Markers */}
          {activeOrder && activeOrder.delivery && (
            <>
              <Marker
                coordinate={{ latitude: activeOrder.delivery.pickupLatitude, longitude: activeOrder.delivery.pickupLongitude }}
                title="Restaurant Pickup"
              >
                <View style={[styles.markerContainer, { borderColor: '#f59e0b' }]}>
                  <Ionicons name="restaurant" size={24} color="#f59e0b" />
                </View>
              </Marker>
              <Marker
                coordinate={{ latitude: activeOrder.delivery.dropoffLatitude, longitude: activeOrder.delivery.dropoffLongitude }}
                title="Customer Dropoff"
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

              {(activeRide.status === 2 || activeRide.status === 'InProgress') ? (
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: '#10b981' }]}
                  onPress={() => router.push({ pathname: '/active-ride' as any, params: { ride: JSON.stringify(activeRide) } })}
                >
                  <Text style={styles.buttonText}>Continue Ride →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: '#004AAD' }]}
                  onPress={() => handleStartRide(activeRide.id)}
                >
                  <Text style={styles.buttonText}>Start Ride</Text>
                </TouchableOpacity>
              )}
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
                {(activeOrder.status === 3 || activeOrder.status === 'Prepared' || activeOrder.status === 2 || activeOrder.status === 'Received') ? (
                  <TouchableOpacity 
                    style={[styles.acceptButton, { backgroundColor: '#f59e0b', flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} 
                    onPress={() => handleUpdateOrderStatus(activeOrder.id, 4)} // Set to OutForDelivery (4)
                  >
                    <Text style={styles.buttonText}>Confirm Order Picked Up</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.completeButton, { backgroundColor: '#10b981', flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]} 
                    onPress={() => handleUpdateOrderStatus(activeOrder.id, 5)} // Set to Delivered (5)
                  >
                    <Text style={styles.buttonText}>Confirm Order Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : rideRequests.length === 0 ? (
            <Text style={styles.noRequests}>
              {driver?.vehicleType === 'Delivery' ? 'Looking for nearby orders...' : 'Looking for nearby rides...'}
            </Text>
          ) : (
            rideRequests.map((request, index) => {
              if (driver?.vehicleType === 'Delivery') {
                return (
                  <View key={index} style={styles.requestBox}>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>Restaurant: </Text>{request.delivery?.senderName || request.delivery?.pickupAddress || 'Restaurant'}
                    </Text>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>Pickup: </Text>{request.delivery?.pickupAddress}
                    </Text>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>Deliver to: </Text>{request.delivery?.dropoffAddress}
                    </Text>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>Items: </Text>{formatItemDescription(request.delivery?.itemDescription || '')}
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={styles.acceptButton} 
                        onPress={() => handleAcceptOrder(request.id)}
                      >
                        <Text style={styles.buttonText}>Accept Delivery Job</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              } else {
                return (
                  <View key={index} style={styles.requestBox}>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>From: </Text>{request.pickupLocation}
                    </Text>
                    <Text style={styles.requestText}>
                      <Text style={styles.label}>To: </Text>{request.dropoffLocation}
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={styles.acceptButton} 
                        onPress={() => handleAcceptRide(request.id)}
                      >
                        <Text style={styles.buttonText}>Accept Ride</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}


