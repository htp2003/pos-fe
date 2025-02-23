import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    SafeAreaView,
    ActivityIndicator,
    Dimensions,
    Modal,
    Alert
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../AuthContext';

const { width } = Dimensions.get("window");
const cardWidth = width * 0.44; // 2 columns with spacing

type HomeScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "Home">;
};

interface Product {
    _id: string;
    name: string;
    price: number;
    imageUrl: string;
    category: string;
    description: string;
}

interface CartItem extends Product {
    quantity: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const { setIsLoggedIn } = useAuth();

    let DEPLOYED_URL = "https://pos-backend-pvnx.onrender.com";
    let LOCAL_URL = "http://localhost:5000";
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${DEPLOYED_URL}/api/products`);
            setProducts(response.data);
            // Extract unique categories
            const uniqueCategories = Array.from(new Set(response.data.map((p: Product) => p.category)));
            setCategories(["all", ...uniqueCategories]);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectedCategory === "all"
        ? products
        : products.filter(p => p.category === selectedCategory);

    const addToCart = (product: Product) => {
        setCartItems(prev => {
            const existingItem = prev.find(item => item._id === product._id);
            if (existingItem) {
                return prev.map(item =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCartItems(prev => {
            const existingItem = prev.find(item => item._id === productId);
            if (existingItem && existingItem.quantity > 1) {
                return prev.map(item =>
                    item._id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prev.filter(item => item._id !== productId);
        });
    };

    const getItemQuantity = (productId: string): number => {
        return cartItems.find(item => item._id === productId)?.quantity || 0;
    };

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    const renderCategoryItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[
                styles.categoryButton,
                selectedCategory === item && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(item)}
        >
            <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.selectedCategoryText
            ]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
        </TouchableOpacity>
    );

    const handleLogout = async () => {
        try {
            setIsLoggedIn(false);
            // Gọi API logout
            // await axios.post(`${DEPLOYED_URL}/api/auth/logout`);

            // Xóa token
            await AsyncStorage.removeItem('authToken');

            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });


            // Chuyển về màn login
            // navigation.replace('Login');
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng xuất');
        }
    };

    const MenuDropdown = () => (
        <Modal
            visible={isMenuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsMenuVisible(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setIsMenuVisible(false)}
            >
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setIsMenuVisible(false);
                            navigation.navigate("Dashboard");
                        }}
                    >
                        <MaterialIcons name="dashboard" size={24} color="#007bff" />
                        <Text style={styles.menuText}>Thống kê doanh thu</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setIsMenuVisible(false);
                            navigation.navigate("LoginHistory");
                        }}
                    >
                        <MaterialIcons name="history" size={24} color="#007bff" />
                        <Text style={styles.menuText}>Lịch sử đăng nhập</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuItem, styles.logoutItem]}
                        onPress={() => {
                            setIsMenuVisible(false);
                            handleLogout();
                        }}
                    >
                        <MaterialIcons name="logout" size={24} color="#ff4444" />
                        <Text style={[styles.menuText, styles.logoutText]}>Đăng xuất</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Menu</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setIsMenuVisible(true)}
                    >
                        <MaterialIcons name="menu" size={24} color="#007bff" />
                    </TouchableOpacity>

                    {totalItems > 0 && (
                        <TouchableOpacity
                            style={styles.cartButton}
                            onPress={() => navigation.navigate("Cart", { cartItems })}
                        >
                            <MaterialIcons name="shopping-cart" size={24} color="white" />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{totalItems}</Text>
                            </View>
                            <Text style={styles.cartAmount}>{formatPrice(totalAmount)}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <MenuDropdown />

            <View style={styles.categoriesContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.categoriesContent}
                />
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item._id}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.productRow}
                contentContainerStyle={styles.productsContainer}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image
                            source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                            style={styles.productImage}
                        />
                        <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {item.name}
                            </Text>
                            <Text style={styles.description} numberOfLines={2}>
                                {item.description}
                            </Text>
                            <Text style={styles.price}>{formatPrice(item.price)}</Text>
                        </View>

                        <View style={styles.quantityContainer}>
                            {getItemQuantity(item._id) > 0 ? (
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        onPress={() => removeFromCart(item._id)}
                                        style={styles.quantityButton}
                                    >
                                        <MaterialIcons name="remove" size={20} color="white" />
                                    </TouchableOpacity>
                                    <Text style={styles.quantity}>
                                        {getItemQuantity(item._id)}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => addToCart(item)}
                                        style={styles.quantityButton}
                                    >
                                        <MaterialIcons name="add" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => addToCart(item)}
                                    style={styles.addButton}
                                >
                                    <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5"
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "white",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    dashboardButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: "bold"
    },
    cartButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#007bff",
        padding: 8,
        borderRadius: 20,
        minWidth: 100
    },
    badge: {
        backgroundColor: "#ff4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 6
    },
    badgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold"
    },
    cartAmount: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        marginLeft: 4
    },
    categoriesList: {
        backgroundColor: "white",
        paddingVertical: 12
    },
    categoriesContainer: {
        backgroundColor: "white",
        height: 60, // Fixed height for categories container
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0"
    },
    categoriesContent: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8 // Space between category buttons
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        height: 40, // Fixed height for category buttons
        justifyContent: "center"
    },
    selectedCategory: {
        backgroundColor: "#007bff"
    },
    categoryText: {
        fontSize: 14,
        color: "#666"
    },
    selectedCategoryText: {
        color: "white",
        fontWeight: "bold"
    },
    productsContainer: {
        paddingHorizontal: 12,
        paddingBottom: 20
    },
    productRow: {
        justifyContent: "space-between",
        marginTop: 16
    },
    card: {
        width: cardWidth,
        backgroundColor: "white",
        borderRadius: 12,
        marginBottom: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: "hidden"
    },
    productImage: {
        width: "100%",
        height: cardWidth,
        resizeMode: "cover"
    },
    productInfo: {
        padding: 12
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4
    },
    description: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8
    },
    price: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#007bff"
    },
    quantityContainer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0"
    },
    quantityControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    quantityButton: {
        backgroundColor: "#007bff",
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center"
    },
    quantity: {
        fontSize: 16,
        fontWeight: "bold",
        minWidth: 30,
        textAlign: "center"
    },
    addButton: {
        backgroundColor: "#007bff",
        padding: 8,
        borderRadius: 20,
        alignItems: "center",

    },
    addButtonText: {
        color: "white",
        fontWeight: "bold"
    },
    menuButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menuContainer: {
        position: 'absolute',
        top: 70,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        minWidth: 200,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 4,
    },
    menuText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
});
const additionalStyles = StyleSheet.create({
    logoutItem: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        marginTop: 8,
        paddingTop: 8
    },
    logoutText: {
        color: '#ff4444'
    }
});

// Merge styles vào styles object hiện tại
Object.assign(styles, additionalStyles);

export default HomeScreen;