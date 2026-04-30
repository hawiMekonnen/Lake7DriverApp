import { StyleSheet, Dimensions } from "react-native";

export const styles = StyleSheet.create({
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
    width: Dimensions.get('window').width * 0.8,
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