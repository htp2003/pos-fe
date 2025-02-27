import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import * as Location from "expo-location";
import axios from "axios";
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../AuthContext';
import MapView, { Marker } from 'react-native-maps'; // Expo đã tích hợp sẵn MapView

interface LocationCoords {
    latitude: number;
    longitude: number;
}

interface LoginScreenProps {
    navigation: NavigationProp<any>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    const { setIsLoggedIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [location, setLocation] = useState<LocationCoords | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [mapRegion, setMapRegion] = useState<any>(null);

    let DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";
    let LOCAL_URL = "http://localhost:5000";

    // Tách riêng hàm getLocation ra để tái sử dụng
    const getLocation = async () => {
        try {
            setLocationLoading(true);
            setLocationError(null);

            // Kiểm tra và yêu cầu quyền truy cập
            const { status } = await Location.requestForegroundPermissionsAsync();
            console.log("📱 Location permission status:", status);

            if (status !== "granted") {
                setLocationError("Ứng dụng cần quyền truy cập vị trí để tiếp tục");
                setLocationLoading(false);
                return;
            }

            // Thử với độ chính xác thấp hơn và timeout ngắn hơn
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
                timeout: 5000
            });

            console.log("📍 Vị trí đã lấy được:", loc.coords);

            const currentLocation = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            };

            setLocation(currentLocation);

            // Cập nhật region cho bản đồ
            setMapRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005, // Mức độ zoom, giá trị nhỏ hơn = zoom gần hơn
                longitudeDelta: 0.005,
            });

            setLocationLoading(false);

        } catch (error) {
            console.error("❌ Lỗi lấy vị trí:", error);
            setLocationError("Không thể lấy vị trí. Vui lòng thử lại");
            setLocationLoading(false);
        }
    };

    // useEffect chỉ gọi getLocation
    useEffect(() => {
        getLocation();
    }, []);

    const handleRetryLocation = () => {
        getLocation();
    };

    // Xử lý đăng nhập
    const handleLogin = async () => {
        try {
            console.log("📍 Sending location data:", location);
            setLoading(true);
            const response = await axios.post(`${DEPLOYED_URL}/api/auth/login`, {
                email,
                password,
                location
            });

            // Lưu token
            await AsyncStorage.setItem('authToken', response.data.token);

            // Cập nhật trạng thái đăng nhập
            setIsLoggedIn(true);

            Alert.alert("Thành công", "Đăng nhập thành công!");
            // Không cần navigation.navigate nữa vì AuthContext sẽ tự động
            // chuyển sang màn Home khi isLoggedIn = true

        } catch (error: any) {
            console.error("❌ Lỗi đăng nhập:", error);
            Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Đăng nhập</Text>

            {/* Hiển thị bản đồ */}
            <View style={styles.mapContainer}>
                {mapRegion ? (
                    <MapView
                        style={styles.map}
                        region={mapRegion}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                    >
                        <Marker
                            coordinate={{
                                latitude: mapRegion.latitude,
                                longitude: mapRegion.longitude
                            }}
                            title="Vị trí của bạn"
                            description="Bạn đang ở đây"
                        />
                    </MapView>
                ) : locationLoading ? (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color="#0000ff" />
                        <Text>Đang tải bản đồ...</Text>
                    </View>
                ) : (
                    <View style={styles.mapError}>
                        <Text style={styles.errorText}>Không thể tải bản đồ</Text>
                        <Button title="Thử lại" onPress={handleRetryLocation} />
                    </View>
                )}
            </View>

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                placeholder="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />

            {/* Hiển thị trạng thái location */}
            {locationLoading && (
                <View style={styles.locationStatus}>
                    <ActivityIndicator size="small" color="#666" />
                    <Text style={styles.locationText}>Đang lấy vị trí...</Text>
                </View>
            )}

            {locationError && (
                <View style={styles.locationStatus}>
                    <Text style={styles.errorText}>{locationError}</Text>
                    <Button title="Thử lại" onPress={handleRetryLocation} />
                </View>
            )}

            {location && !locationLoading && !locationError && (
                <View style={styles.locationInfo}>
                    <Text style={styles.locationText}>
                        ✅ Đã lấy được vị trí
                    </Text>
                    <Text style={styles.locationCoords}>
                        Tọa độ: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                </View>
            )}

            {/* Nút đăng nhập */}
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
            ) : (
                <Button
                    title="Đăng nhập"
                    onPress={handleLogin}
                    disabled={loading || locationLoading || !!locationError}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: 'center'
    },
    mapContainer: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    map: {
        width: '100%',
        height: '100%'
    },
    mapLoading: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    mapError: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    input: {
        borderBottomWidth: 1,
        marginBottom: 15,
        paddingVertical: 8,
        paddingHorizontal: 4
    },
    locationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        gap: 8
    },
    locationInfo: {
        marginBottom: 15,
        alignItems: 'center'
    },
    locationText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 5
    },
    locationCoords: {
        textAlign: 'center',
        color: '#888',
        fontSize: 12
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 15
    },
    loading: {
        marginTop: 10
    }
});

export default LoginScreen;