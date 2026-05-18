import { Dimensions, StyleSheet } from "react-native";

const { width, height } = Dimensions.get('window');
const PRIMARY_BLUE = '#004AAD';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  map: { width: width, height: height * 0.55 },
  loadingText: { textAlign: 'center', marginTop: 20, color: PRIMARY_BLUE, fontWeight: 'bold' },
  
  requestsContainer: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  
  requestsTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  
  noRequests: { 
    textAlign: 'center', 
    color: '#64748b', 
    marginTop: 40,
    fontSize: 16,
    fontStyle: 'italic'
  },
  
  requestBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  
  requestText: { 
    fontSize: 15, 
    color: '#475569',
    marginBottom: 10,
    lineHeight: 22
  },
  
  label: {
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },

  buttonContainer: { 
    flexDirection: 'row', 
    marginTop: 16, 
    gap: 12
  },
  
  acceptButton: { 
    backgroundColor: PRIMARY_BLUE, 
    paddingVertical: 15, 
    borderRadius: 14, 
    flex: 1, 
    alignItems: 'center',
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  completeButton: { 
    backgroundColor: PRIMARY_BLUE, 
    paddingVertical: 16, 
    borderRadius: 14, 
    width: '100%', 
    alignItems: 'center',
    marginTop: 10,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  
  buttonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  
  userInfo: { 
    marginTop: 16, 
    padding: 18, 
    backgroundColor: '#f0f7ff', 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0efff',
    marginBottom: 10
  },
  
  userName: { 
    fontWeight: '700', 
    fontSize: 17, 
    color: '#1e3a8a',
    marginBottom: 6
  },
  
  userPhone: { 
    color: PRIMARY_BLUE, 
    fontSize: 20, 
    fontWeight: '900', 
  },

  markerContainer: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  }
});