import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";

type CartScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "Cart">;
    route: RouteProp<RootStackParamList, "Cart">;
};

interface CartItem {
    _id: string;
    name: string;
    price: number;
    quantity: number;
}

const CartScreen: React.FC<CartScreenProps> = ({ navigation, route }) => {
    const { cartItems } = route.params;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    let DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";
    let LOCAL_URL = "http://localhost:5000";
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const confirmOrder = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Format data theo cấu trúc backend mong đợi
            const formattedProducts = cartItems.map(item => ({
                productId: item._id,
                quantity: item.quantity
            }));

            const response = await axios.post(`${DEPLOYED_URL}/api/orders`, {
                products: formattedProducts,
                paymentMethod: "qr"
            });

            if (response.data && response.data._id) {
                navigation.navigate("Payment", { orderId: response.data._id });
            } else {
                setError("Không nhận được ID đơn hàng từ server");
            }
        } catch (err) {
            console.error("Error creating order:", err);
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data?.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
            } else {
                setError("Không thể tạo đơn hàng. Vui lòng thử lại.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>Giỏ hàng trống</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate("Home")}
                >
                    <Text style={styles.buttonText}>Quay lại menu</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Xác nhận đơn hàng</Text>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <FlatList
                data={cartItems}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.productInfo}>
                            <Text style={styles.text}>{item.name}</Text>
                            <Text style={styles.price}>{item.price} VND x {item.quantity}</Text>
                        </View>
                        <Text style={styles.itemTotal}>
                            {item.price * item.quantity} VND
                        </Text>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <Text style={styles.total}>Tổng cộng: {totalAmount} VND</Text>
                <TouchableOpacity
                    onPress={confirmOrder}
                    style={[
                        styles.confirmButton,
                        isLoading && styles.disabledButton
                    ]}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Xác nhận đơn hàng</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20
    },
    card: {
        padding: 15,
        backgroundColor: "#f8f8f8",
        marginBottom: 10,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    productInfo: {
        flex: 1,
    },
    text: {
        fontSize: 18
    },
    price: {
        fontSize: 16,
        color: "#666",
        marginTop: 4
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: "bold"
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        paddingTop: 20,
        marginTop: 10
    },
    total: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "right"
    },
    confirmButton: {
        padding: 15,
        backgroundColor: "#28a745",
        borderRadius: 8,
        alignItems: "center"
    },
    disabledButton: {
        backgroundColor: "#88c79e"
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold"
    },
    errorContainer: {
        backgroundColor: "#ffebee",
        padding: 10,
        borderRadius: 8,
        marginBottom: 15
    },
    errorText: {
        color: "#c62828",
        textAlign: "center"
    },
    emptyText: {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 20
    },
    backButton: {
        padding: 15,
        backgroundColor: "#007bff",
        borderRadius: 8,
        alignItems: "center"
    }
});

export default CartScreen;