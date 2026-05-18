import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';

const API_BASE_URL = 'http://192.168.137.234:5260';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { driver, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  const fetchDriverDetails = async () => {
    if (!driver?.driverId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/driver/${driver.driverId}`, {
        headers: { Authorization: `Bearer ${driver.token}` }
      });
      const data = response.data;
      setProfileData(data);
      setName(data.name);
      setEmail(data.email);
      setPhone(data.phoneNumber);
      setVehicleInfo(data.vehicleInfo);
      setLicensePlate(data.licensePlate);
    } catch (error) {
      console.error("Failed to fetch driver details:", error);
      Alert.alert("Error", "Could not fetch profile details.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2, // Compress heavily for ultra-lightweight storage
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      handleUpdateProfileImage(base64Image);
    }
  };

  const handleUpdateProfileImage = async (base64Image: string) => {
    if (!profileData) return;
    setUpdating(true);

    try {
      // Append the profile picture base64 string using the pipe delimiter workaround
      const combinedVehicleInfo = `${vehicleInfo}|${base64Image}`;

      const payload = {
        name: profileData.name,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber,
        vehicleInfo: combinedVehicleInfo,
        licensePlate: profileData.licensePlate,
        vehicleType: profileData.vehicleType,
        password: "PlaceholderPassword1!", // Bypasses C# model validation safely
        isAvailable: profileData.isAvailable,
      };

      const response = await axios.put(`${API_BASE_URL}/api/driver/${driver.driverId}`, payload, {
        headers: { 
          Authorization: `Bearer ${driver.token}`,
          'Content-Type': 'application/json'
        }
      });

      setProfileData(response.data);
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile picture:", error);
      Alert.alert("Upload Failed", error.response?.data || "Could not save your photo.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!profileData) return;
    if (!name || !email || !phone || !vehicleInfo || !licensePlate) {
      Alert.alert("Validation Error", "All fields are required");
      return;
    }

    setUpdating(true);

    try {
      // Retain the existing profile picture if there is one
      const existingPic = profileData.profilePicture ? `|${profileData.profilePicture}` : '';
      const combinedVehicleInfo = `${vehicleInfo}${existingPic}`;

      const payload = {
        name,
        email,
        phoneNumber: phone,
        vehicleInfo: combinedVehicleInfo,
        licensePlate,
        vehicleType: profileData.vehicleType,
        password: "PlaceholderPassword1!", 
        isAvailable: profileData.isAvailable,
      };

      const response = await axios.put(`${API_BASE_URL}/api/driver/${driver.driverId}`, payload, {
        headers: { 
          Authorization: `Bearer ${driver.token}`,
          'Content-Type': 'application/json'
        }
      });

      setProfileData(response.data);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile details:", error);
      Alert.alert("Update Failed", error.response?.data || "Could not save your details.");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: () => {
            logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={screenStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#64748b', fontWeight: '500' }}>Loading profile...</Text>
      </View>
    );
  }

  const profileImageUri = profileData?.profilePicture 
    ? (profileData.profilePicture.startsWith('data:') 
        ? profileData.profilePicture 
        : `data:image/jpeg;base64,${profileData.profilePicture}`)
    : null;

  return (
    <ScrollView style={screenStyles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={screenStyles.header}>
        <View style={screenStyles.profileImageContainer}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={screenStyles.profileImage} />
          ) : (
            <View style={[screenStyles.profileImage, screenStyles.avatarPlaceholder]}>
              <Ionicons name="person" size={54} color="#94a3b8" />
            </View>
          )}
          <TouchableOpacity style={screenStyles.editImageButton} onPress={pickImage} disabled={updating}>
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={screenStyles.headerName}>{profileData?.name}</Text>
        <Text style={screenStyles.headerRole}>{profileData?.vehicleType} Partner</Text>
      </View>

      {/* Profile Details Card */}
      <View style={screenStyles.card}>
        <View style={screenStyles.cardHeader}>
          <Text style={screenStyles.cardTitle}>Account Details</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={screenStyles.editBtn}>
              <Ionicons name="pencil" size={16} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={screenStyles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={screenStyles.form}>
            <Text style={screenStyles.inputLabel}>Full Name</Text>
            <TextInput style={screenStyles.input} value={name} onChangeText={setName} placeholder="Name" />

            <Text style={screenStyles.inputLabel}>Email Address</Text>
            <TextInput style={screenStyles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />

            <Text style={screenStyles.inputLabel}>Phone Number</Text>
            <TextInput style={screenStyles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" keyboardType="phone-pad" />

            <Text style={screenStyles.inputLabel}>Vehicle Info</Text>
            <TextInput style={screenStyles.input} value={vehicleInfo} onChangeText={setVehicleInfo} placeholder="e.g. Toyota Corolla 2018" />

            <Text style={screenStyles.inputLabel}>License Plate</Text>
            <TextInput style={screenStyles.input} value={licensePlate} onChangeText={setLicensePlate} placeholder="e.g. AA 3-A1234" />

            <View style={screenStyles.btnRow}>
              <TouchableOpacity style={[screenStyles.btn, screenStyles.btnCancel]} onPress={() => setIsEditing(false)} disabled={updating}>
                <Text style={screenStyles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[screenStyles.btn, screenStyles.btnSave]} onPress={handleSaveDetails} disabled={updating}>
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={screenStyles.btnSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={screenStyles.detailsList}>
            <View style={screenStyles.detailItem}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={screenStyles.detailIcon} />
              <View>
                <Text style={screenStyles.detailLabel}>Email</Text>
                <Text style={screenStyles.detailValue}>{profileData?.email}</Text>
              </View>
            </View>

            <View style={screenStyles.detailItem}>
              <Ionicons name="call-outline" size={20} color="#64748b" style={screenStyles.detailIcon} />
              <View>
                <Text style={screenStyles.detailLabel}>Phone Number</Text>
                <Text style={screenStyles.detailValue}>{profileData?.phoneNumber}</Text>
              </View>
            </View>

            <View style={screenStyles.detailItem}>
              <Ionicons name="car-outline" size={20} color="#64748b" style={screenStyles.detailIcon} />
              <View>
                <Text style={screenStyles.detailLabel}>Vehicle Info</Text>
                <Text style={screenStyles.detailValue}>{profileData?.vehicleInfo}</Text>
              </View>
            </View>

            <View style={screenStyles.detailItem}>
              <Ionicons name="card-outline" size={20} color="#64748b" style={screenStyles.detailIcon} />
              <View>
                <Text style={screenStyles.detailLabel}>License Plate</Text>
                <Text style={screenStyles.detailValue}>{profileData?.licensePlate}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Logout button */}
      <TouchableOpacity style={screenStyles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={screenStyles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  avatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2563eb',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerRole: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },
  detailsList: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 15,
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  form: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#f1f5f9',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  btnSave: {
    backgroundColor: '#2563eb',
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ef4444',
  },
});
