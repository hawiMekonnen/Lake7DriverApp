import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 16,
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 24,
	},
	input: {
		width: 280,
		height: 44,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 16,
		fontSize: 16,
	},
	button: {
		backgroundColor: '#007bff',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		marginBottom: 12,
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	switchText: {
		color: '#007bff',
		fontSize: 16,
		marginTop: 8,
	},
	linkText: {
		color: '#007bff',
		fontSize: 16,
		marginTop: 8,
	},
});
