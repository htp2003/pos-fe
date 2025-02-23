import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    RefreshControl,
    Linking
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type LoginHistoryScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'LoginHistory'>;
};

interface LoginRecord {
    timestamp: string;
    locationStr: string;
    location?: {
        latitude: number;
        longitude: number;
    };
}

interface UserLoginHistory {
    _id: string;
    name: string;
    email: string;
    loginHistory: LoginRecord[];
}

const LoginHistoryScreen: React.FC<LoginHistoryScreenProps> = ({ navigation }) => {
    const [loginHistory, setLoginHistory] = useState<UserLoginHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";

    const fetchLoginHistory = async () => {
        try {
            const response = await axios.get(`${DEPLOYED_URL}/api/auth/login-history`);
            setLoginHistory(response.data);
        } catch (error) {
            console.error('Error fetching login history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLoginHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLoginHistory();
    };

    const openMap = (location: { latitude: number; longitude: number }) => {
        if (location?.latitude && location?.longitude) {
            const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
            Linking.openURL(url);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderLoginRecord = ({ item }: { item: UserLoginHistory }) => (
        <View style={styles.card}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>

            <View style={styles.historyList}>
                {item.loginHistory.map((login, index) => (
                    <View key={index} style={styles.historyItem}>
                        <MaterialIcons name="location-on" size={20} color="#007bff" />
                        <View style={styles.historyDetails}>
                            <TouchableOpacity
                                onPress={() => login.location && openMap(login.location)}
                                disabled={!login.location?.latitude}
                            >
                                <Text style={[
                                    styles.location,
                                    login.location?.latitude && styles.locationLink
                                ]}>
                                    {login.locationStr ||
                                        (login.location ? `${login.location.latitude}, ${login.location.longitude}` : 'Không có vị trí')}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.timestamp}>{formatDate(login.timestamp)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Lịch sử đăng nhập</Text>
            </View>

            <FlatList
                data={loginHistory}
                renderItem={renderLoginRecord}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có lịch sử đăng nhập</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    userInfo: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    historyList: {
        gap: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    historyDetails: {
        flex: 1,
    },
    location: {
        fontSize: 14,
        fontWeight: '500',
    },
    locationLink: {
        color: '#007bff',
        textDecorationLine: 'underline',
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});

export default LoginHistoryScreen;