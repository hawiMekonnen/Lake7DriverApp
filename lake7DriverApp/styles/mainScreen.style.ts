import { Dimensions, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: Dimensions.get('window').width, height: 300 },
  loadingText: { textAlign: 'center', marginTop: 20 },
  requestsContainer: { flex: 1, padding: 20 },
  requestsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  noRequests: { color: '#6b7280' },
  requestBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  requestText: { fontSize: 16 },
});