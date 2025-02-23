import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    RefreshControl
} from 'react-native';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

type DashboardScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "Dashboard">;
};

interface DailySales {
    date: string;
    total: number;
}

interface TopProduct {
    _id: string;
    name: string;
    totalQuantity: number;
    totalRevenue: number;
}

interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    dailySales: DailySales[];
    topProducts: TopProduct[];
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
    let DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";
    let LOCAL_URL = "http://localhost:5000";

    const fetchDashboardStats = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${DEPLOYED_URL}/api/orders/stats/dashboard?range=${timeRange}`);
            setStats(response.data);
        } catch (err) {
            setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
            console.error('Error fetching stats:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardStats();
    }, [timeRange]);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchDashboardStats(false);
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchDashboardStats()}
                >
                    <Text style={styles.buttonText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!stats) return null;

    const chartConfig = {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#007bff'
        }
    };

    return (

        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    colors={['#007bff']}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Thống kê doanh thu</Text>
                <View style={styles.timeRangeButtons}>
                    <TouchableOpacity
                        style={[
                            styles.timeButton,
                            timeRange === 'week' && styles.activeTimeButton
                        ]}
                        onPress={() => setTimeRange('week')}
                    >
                        <Text
                            style={[
                                styles.timeButtonText,
                                timeRange === 'week' && styles.activeTimeButtonText
                            ]}
                        >
                            7 ngày
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.timeButton,
                            timeRange === 'month' && styles.activeTimeButton
                        ]}
                        onPress={() => setTimeRange('month')}
                    >
                        <Text
                            style={[
                                styles.timeButtonText,
                                timeRange === 'month' && styles.activeTimeButtonText
                            ]}
                        >
                            30 ngày
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
                    <Text style={styles.summaryValue}>
                        {formatCurrency(stats.totalRevenue)}
                    </Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Số đơn hàng</Text>
                    <Text style={styles.summaryValue}>{stats.totalOrders}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Trung bình</Text>
                    <Text style={styles.summaryValue}>
                        {formatCurrency(stats.averageOrderValue)}
                    </Text>
                </View>
            </View>

            {/* Revenue Chart */}
            {stats.dailySales.length > 0 ? (
                <View style={styles.chartContainer}>
                    <Text style={styles.sectionTitle}>Biểu đồ doanh thu</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <LineChart
                            data={{
                                labels: stats.dailySales.map(sale => sale.date),
                                datasets: [{
                                    data: stats.dailySales.map(sale => sale.total)
                                }]
                            }}
                            width={Math.max(Dimensions.get('window').width - 40, stats.dailySales.length * 60)}
                            height={220}
                            chartConfig={chartConfig}
                            style={styles.chart}
                            bezier
                            yAxisLabel=""
                            yAxisSuffix=""
                            formatYLabel={(value) => formatCurrency(Number(value))}
                        />
                    </ScrollView>
                </View>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Chưa có dữ liệu doanh thu</Text>
                </View>
            )}

            {/* Top Products */}
            <View style={styles.topProductsContainer}>
                <Text style={styles.sectionTitle}>Top 5 sản phẩm bán chạy</Text>
                {stats.topProducts.length > 0 ? (
                    stats.topProducts.map((product, index) => (
                        <View key={product._id} style={styles.productCard}>
                            <View style={[
                                styles.productRank,
                                index === 0 && styles.topRank
                            ]}>
                                <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{product.name}</Text>
                                <Text style={styles.productStats}>
                                    Đã bán: {product.totalQuantity} | Doanh thu: {formatCurrency(product.totalRevenue)}
                                </Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noDataText}>Chưa có sản phẩm nào được bán</Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    timeRangeButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    timeButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    activeTimeButton: {
        backgroundColor: '#007bff',
    },
    timeButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    activeTimeButtonText: {
        color: '#fff',
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 10,
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    chartContainer: {
        backgroundColor: '#fff',
        margin: 10,
        padding: 15,
        borderRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    topProductsContainer: {
        backgroundColor: '#fff',
        margin: 10,
        padding: 15,
        borderRadius: 10,
        elevation: 2,
        marginBottom: 20,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    productRank: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#007bff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    topRank: {
        backgroundColor: '#ffc107',
    },
    rankText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
    },
    productStats: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    error: {
        color: '#dc3545',
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default DashboardScreen;