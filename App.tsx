import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import CartScreen from "./screens/CartScreen";
import PaymentScreen from "./screens/PaymentScreen";
import DashboardScreen from "./screens/DashboardScreen";
import LoginScreen from "./screens/LoginScreen";
import LoginHistoryScreen from "./screens/LoginHistoryScreen";
import { AuthProvider } from './AuthContext';
import { useAuth } from './AuthContext';

export type RootStackParamList = {
  Home: undefined;
  Cart: { cartItems: Array<{ _id: string; name: string; price: number; quantity: number; }> };
  Payment: { orderId: string };
  Dashboard: undefined;
  Login: undefined;
  LoginHistory: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error("Error checking login status:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    checkLoginStatus();
  }, []);

  if (!isInitialized) return null;

  return (
    <Stack.Navigator>
      {!isLoggedIn ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="LoginHistory" component={LoginHistoryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}