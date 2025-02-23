import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ToastAndroid,
    Platform,
    Alert,
    Linking,
    ScrollView,
    TextInput
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";

type PaymentScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "Payment">;
    route: RouteProp<RootStackParamList, "Payment">;
};

const showAlert = (title: string, message: string, buttons: Array<{ text: string, onPress: () => void }>) => {
    if (Platform.OS === 'web') {
        // Sử dụng confirm của web cho đơn giản
        const result = window.confirm(`${title}\n${message}`);
        if (result) {
            // Nếu user click OK, thực hiện action của nút "Có"
            const confirmButton = buttons.find(button => button.text === "Có");
            confirmButton?.onPress();
        } else {
            // Nếu user click Cancel, thực hiện action của nút "Không"
            const cancelButton = buttons.find(button => button.text === "Không");
            cancelButton?.onPress();
        }
    } else {
        Alert.alert(title, message, buttons);
    }
};

const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else if (Platform.OS === 'web') {
        window.alert(message);
    } else {
        Alert.alert('Thông báo', message);
    }
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
    const { orderId } = route.params;
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | null>(null);
    const [cashReceived, setCashReceived] = useState<string>('');
    const [change, setChange] = useState<number>(0);
    const [paymentStatus, setPaymentStatus] = useState<string>("pending");

    let DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";
    let LOCAL_URL = "http://localhost:5000";

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    useEffect(() => {
        // Lấy thông tin đơn hàng
        axios.get(`${DEPLOYED_URL}/api/orders/${orderId}`)
            .then(response => setTotalAmount(response.data.totalPrice))
            .catch(error => console.log(error));

        // Tạo QR Code
        axios.post(`${DEPLOYED_URL}/api/orders/payment/qr`, { orderId })
            .then(response => setQrUrl(response.data.qrUrl))
            .catch(error => console.log(error));
    }, [orderId]);

    useEffect(() => {
        if (qrUrl && paymentStatus !== "paid") {
            const interval = setInterval(() => {
                checkPaymentStatus();
            }, 30000); // ✅ Gọi mỗi 30 giây để tránh bị chặn

            return () => clearInterval(interval);
        }
    }, [qrUrl, paymentStatus]);


    const checkPaymentStatus = async () => {
        try {
            const response = await axios.post(
                `${DEPLOYED_URL}/api/orders/payment/check-casso`,
                { orderId }
            );

            if (response.data && response.data.status === "paid") {
                setPaymentStatus("paid");
                handlePaymentSuccess();
            }
        } catch (error) {
            console.error("Error checking payment:", error);
        }
    };

    const fetchOrderDetails = async () => {
        try {
            const response = await axios.get(`${DEPLOYED_URL}/api/orders/${orderId}`);
            setTotalAmount(response.data.totalPrice);
        } catch (error) {
            console.error("Error fetching order:", error);
            showToast("Không thể lấy thông tin đơn hàng");
        }
    };

    const calculateChange = (received: string) => {
        const receivedAmount = parseInt(received) || 0;
        setChange(receivedAmount - totalAmount);
        setCashReceived(received);
    };

    const handleCashPayment = async () => {
        if (parseInt(cashReceived) < totalAmount) {
            showToast("Số tiền khách đưa không đủ");
            return;
        }

        try {
            const response = await axios.patch(
                `${DEPLOYED_URL}/api/orders/payment/confirm`,
                {
                    orderId,
                    paymentMethod: 'cash',
                    cashReceived: parseInt(cashReceived),
                    change: change
                }
            );

            if (response.data && (response.data.status === "paid" || response.data.message === "Payment confirmed successfully")) {
                handlePaymentSuccess();
            } else {
                showToast("Trạng thái thanh toán không hợp lệ");
            }
        } catch (error) {
            console.error("Error confirming payment:", error);
            showToast("Không thể xác nhận thanh toán");
        }
    };

    const getChangeTextStyle = () => ({
        ...styles.changeText,
        color: change >= 0 ? '#28a745' : '#dc3545'
    });

    const renderPaymentMethodSelection = () => (
        <View style={styles.paymentMethodContainer}>
            <TouchableOpacity
                style={[styles.methodButton, paymentMethod === 'cash' && styles.selectedMethod]}
                onPress={() => setPaymentMethod('cash')}
            >
                <Text style={[
                    styles.methodButtonText,
                    paymentMethod === 'cash' && styles.selectedMethodText
                ]}>
                    Tiền mặt
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.methodButton, paymentMethod === 'qr' && styles.selectedMethod]}
                onPress={() => setPaymentMethod('qr')}
            >
                <Text style={[
                    styles.methodButtonText,
                    paymentMethod === 'qr' && styles.selectedMethodText
                ]}>
                    VietQR
                </Text>
            </TouchableOpacity>
        </View>
    );
    const renderCashPayment = () => (
        <View style={styles.cashPaymentContainer}>
            <Text style={styles.label}>Tiền khách đưa:</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cashReceived}
                onChangeText={calculateChange}
                placeholder="Nhập số tiền"
            />
            <Text style={getChangeTextStyle()}>
                Tiền thối lại: {formatCurrency(change)}
            </Text>
            <TouchableOpacity
                style={[
                    styles.confirmButton,
                    parseInt(cashReceived) < totalAmount && styles.disabledButton
                ]}
                onPress={handleCashPayment}
                disabled={parseInt(cashReceived) < totalAmount}
            >
                <Text style={styles.buttonText}>Xác nhận thanh toán</Text>
            </TouchableOpacity>
        </View>
    );

    const generateQRCode = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${DEPLOYED_URL}/api/orders/payment/qr`, { orderId });
            setQrUrl(response.data.qrUrl);
        } catch (error) {
            console.error("Error generating QR:", error);
            showToast("Không thể tạo mã QR");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvoiceDownload = async () => {
        try {
            console.log("Downloading invoice for order:", orderId);
            const url = `${DEPLOYED_URL}/api/orders/${orderId}/invoice`;
            await Linking.openURL(url);
            showToast("Đang tải hóa đơn...");
        } catch (error) {
            console.error("Error downloading invoice:", error);
            showToast("Không thể tải hóa đơn");
        }
    };

    const handlePaymentSuccess = () => {
        showAlert(
            "Thanh toán thành công",
            "Bạn có muốn xuất hóa đơn không?",
            [
                {
                    text: "Không",
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Home" }]
                        });
                    }
                },
                {
                    text: "Có",
                    onPress: async () => {
                        await handleInvoiceDownload();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Home" }]
                        });
                    }
                }
            ]
        );
    };

    const confirmPayment = async () => {
        try {
            const response = await axios.post(
                `${DEPLOYED_URL}/api/orders/payment/check-casso`,  // Gọi API Casso
                { orderId }
            );

            if (response.data && response.data.status === "paid") {
                handlePaymentSuccess();
            } else {
                showToast("Thanh toán chưa hoàn tất, vui lòng kiểm tra lại.");
            }
        } catch (error) {
            console.error("Error confirming payment:", error);
            showToast("Lỗi khi kiểm tra thanh toán, thử lại sau.");
        }
    };


    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

            <View style={styles.contentContainer}>
                <Text style={styles.title}>Thanh toán</Text>
                <Text style={styles.total}>Tổng tiền: {formatCurrency(totalAmount)}</Text>

                {!paymentMethod ? (
                    renderPaymentMethodSelection()
                ) : paymentMethod === 'cash' ? (
                    renderCashPayment()
                ) : (
                    // QR payment flow
                    <View style={styles.qrContainer}>
                        {!qrUrl ? (
                            <TouchableOpacity
                                onPress={generateQRCode}
                                style={[styles.qrButton, isLoading && styles.disabledButton]}
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>
                                    {isLoading ? "Đang tạo mã QR..." : "Tạo QR VietQR"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                                <Text style={styles.instruction}>
                                    1. Quét mã QR bằng app ngân hàng{'\n'}
                                    2. Kiểm tra thông tin và số tiền{'\n'}
                                    3. Xác nhận thanh toán trong app ngân hàng
                                </Text>

                                {paymentStatus === "pending" ? (
                                    <Text style={styles.pendingText}>Đang chờ thanh toán...</Text>
                                ) : (
                                    <Text style={styles.successText}>✅ Thanh toán thành công!</Text>
                                )}
                            </>
                        )}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
    total: {
        fontSize: 20,
        fontWeight: "bold",
        marginVertical: 20,
    },
    paymentMethodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 20,
    },
    methodButton: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    selectedMethod: {
        backgroundColor: '#007bff',
    },
    methodButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    selectedMethodText: {
        color: '#fff',
    },
    cashPaymentContainer: {
        width: '100%',
        alignItems: 'stretch',
    },
    qrContainer: {
        width: '100%',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    changeText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    qrButton: {
        padding: 15,
        backgroundColor: "#007bff",
        borderRadius: 8,
        marginBottom: 20,
        minWidth: 200,
        alignItems: "center",
    },
    qrImage: {
        width: 250,
        height: 250,
        marginVertical: 20,
    },
    instruction: {
        backgroundColor: "#f8f9fa",
        padding: 15,
        borderRadius: 8,
        marginVertical: 20,
        lineHeight: 24,
        color: "#666",
    },
    confirmButton: {
        padding: 15,
        backgroundColor: "#28a745",
        borderRadius: 8,
        width: '100%',
        alignItems: "center",
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    pendingText: { fontSize: 18, color: "orange" },
    successText: { fontSize: 18, color: "green", fontWeight: "bold" },
});

export default PaymentScreen;