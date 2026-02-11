import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    Image, 
    FlatList, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    SafeAreaView, 
    ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from './config';

export default function CartScreen({ user, onBack, onCheckout }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [itemsPrice, setItemsPrice] = useState(0);
    const [shippingFee, setShippingFee] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/cart/${user.id}`);
            const data = await response.json();
            if (data.success) {
                setCartItems(data.items || []);
                calculateTotal(data.items || []); // ส่ง Array เปล่ากันเหนียว
            }
        } catch (error) {
            console.error("Fetch Cart Error:", error);
            Alert.alert("Error", "โหลดข้อมูลตะกร้าไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (items) => {
        if (!items || items.length === 0) {
            setItemsPrice(0);
            setShippingFee(0);
            setGrandTotal(0);
            return;
        }

        // ใช้ Number() และตรวจสอบค่าเพื่อป้องกัน NaN
        const totalItemsPrice = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
        const totalShipping = items.reduce((sum, item) => sum + (Number(item.shipping_fee) || 0), 0);

        setItemsPrice(totalItemsPrice);
        setShippingFee(totalShipping);
        setGrandTotal(totalItemsPrice + totalShipping);
    };

    const deleteItem = async (itemId) => {
        Alert.alert("ยืนยัน", "ต้องการลบสินค้านี้ใช่ไหม?", [
            { text: "ยกเลิก", style: "cancel" },
            {
                text: "ลบ",
                style: "destructive",
                onPress: async () => {
                    try {
                        const response = await fetch(`${BASE_URL}/cart/${itemId}`, { method: 'DELETE' });
                        if (response.ok) {
                            fetchCart(); 
                        }
                    } catch (error) {
                        Alert.alert("Error", "ลบไม่สำเร็จ");
                    }
                }
            }
        ]);
    };

    const handleCheckoutPress = () => {
    const payload = {
        isCart: true,
        items: cartItems,
        // ใส่ Number(...) || 0 กันแอปเด้ง
        itemsPrice: Number(itemsPrice) || 0,      
        shippingFee: Number(shippingFee) || 0,    
        totalAmount: Number(grandTotal) || 0  
    };
    onCheckout(payload); // ส่งก้อนข้อมูลนี้ไปให้ App.js
};

    const renderItem = ({ item }) => {
        const imageUrl = item.image_url && item.image_url.startsWith('http') 
            ? item.image_url 
            : `${BASE_URL}/uploads/${item.image_url}`;

        return (
            <View style={styles.card}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.details}>
                    <Text style={styles.name} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={styles.date}>📅 ระยะเวลา: {item.days} วัน</Text>
                    <Text style={styles.owner}>👤 ร้านค้า: {item.owner_id}</Text>
                    <View style={styles.priceContainer}>
                        {/* 👇 ป้องกัน Error ด้วยการใช้ (Number || 0) ก่อน toLocaleString */}
                        <Text style={styles.price}>฿{(Number(item.total_price) || 0).toLocaleString()}</Text>
                        <Text style={styles.shippingText}>+ ค่าส่ง ฿{(Number(item.shipping_fee) || 0).toLocaleString()}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={22} color="#FF385C" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ตะกร้าสินค้า ({cartItems.length})</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF385C" />
                </View>
            ) : cartItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color="#ddd" />
                    <Text style={styles.emptyText}>ไม่มีสินค้าในตะกร้า</Text>
                    <TouchableOpacity style={styles.shopButton} onPress={onBack}>
                        <Text style={styles.shopButtonText}>กลับไปเลือกสินค้า</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={cartItems}
                        renderItem={renderItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                    />

                    <View style={styles.footer}>
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>รวมค่าเช่า</Text>
                                {/* 👇 ใส่ Safe Check ให้กับยอดรวมทุกจุด */}
                                <Text style={styles.summaryValue}>฿{(Number(itemsPrice) || 0).toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>ค่าจัดส่งรวม</Text>
                                <Text style={styles.summaryValue}>฿{(Number(shippingFee) || 0).toLocaleString()}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.totalLabel}>ยอดรวมสุทธิ</Text>
                                <Text style={styles.totalValue}>฿{(Number(grandTotal) || 0).toLocaleString()}</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.checkoutButton} 
                            onPress={handleCheckoutPress}
                        >
                            <Text style={styles.checkoutText}>ดำเนินการชำระเงิน</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

// ... styles เดิมของคุณ (ใช้งานได้ดีอยู่แล้วครับ)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingVertical: 12, 
        backgroundColor: '#fff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee',
        paddingTop: 50 
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 15, paddingBottom: 250 },
    card: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        padding: 12, 
        borderRadius: 15, 
        marginBottom: 12, 
        alignItems: 'center', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, 
        elevation: 2 
    },
    image: { width: 85, height: 85, borderRadius: 12, marginRight: 15 },
    details: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    date: { fontSize: 12, color: '#666', marginTop: 4 },
    owner: { fontSize: 11, color: '#999', marginTop: 2 },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
    price: { fontSize: 17, color: '#FF385C', fontWeight: 'bold' },
    shippingText: { fontSize: 11, color: '#777', marginLeft: 8 },
    deleteBtn: { padding: 8 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    emptyText: { marginTop: 15, color: '#999', fontSize: 16, marginBottom: 20 },
    shopButton: { backgroundColor: '#FF385C', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    shopButtonText: { color: '#fff', fontWeight: 'bold' },
    
    // Footer Styles
    footer: { 
        backgroundColor: '#fff', 
        padding: 20, 
        borderTopLeftRadius: 25, 
        borderTopRightRadius: 25, 
        position: 'absolute', 
        bottom: 0, left: 0, right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        elevation: 20
    },
    summaryBox: { marginBottom: 15 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 14, color: '#666' },
    summaryValue: { fontSize: 14, color: '#333', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#FF385C' },
    checkoutButton: { 
        backgroundColor: '#FF385C', 
        paddingVertical: 16, 
        borderRadius: 16, 
        alignItems: 'center',
        shadowColor: '#FF385C',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5
    },
    checkoutText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});