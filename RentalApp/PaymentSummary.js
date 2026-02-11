import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    ScrollView, 
    Alert, 
    ActivityIndicator, 
    SafeAreaView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// 👇 ตรวจสอบ Link Ngrok ให้ตรงกันกับ Backend
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev";

export default function PaymentSummary({ user, product, bookingId, bookingDate, onComplete, onBack }) {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // 🕵️‍♀️ ตรวจสอบประเภทบิล
    const isCart = product?.isCart === true;
    const cartItems = product?.items || [];

    // ==========================================
    // 🧮 ส่วนคำนวณราคา (Safe Calculation)
    // ==========================================
    let displayName = "";
    let displayDays = 0;
    let rentTotal = 0;
    let shippingFee = 0;
    let depositFee = 0;
    let grandTotal = 0;

    if (isCart) {
        // 🛒 กรณี: มาจากตะกร้าสินค้า
        displayName = `สินค้าในตะกร้า (${cartItems.length} รายการ)`;
        // ดึงยอดสุทธิที่ส่งมาจาก CartScreen (ใช้ชื่อ totalAmount หรือ total_price)
        grandTotal = parseFloat(product.totalAmount || product.total_price || 0);
        shippingFee = parseFloat(product.shippingFee || 0);
    } else {
        // 📦 กรณี: เช่าชิ้นเดียว
        displayName = product?.name || 'รายการเช่าสินค้า';
        
        const calculateDays = () => {
            if (!bookingDate?.start || !bookingDate?.end) return 1;
            const start = new Date(bookingDate.start);
            const end = new Date(bookingDate.end);
            const diffTime = Math.abs(end - start);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        };
        displayDays = calculateDays();

        rentTotal = (Number(product?.price_per_day) || 0) * displayDays;
        shippingFee = Number(product?.shipping_fee || 50);
        depositFee = Number(product?.deposit || 0);
        // ใช้ยอดรวมที่ส่งมา หรือคำนวณใหม่ถ้าไม่มี
        grandTotal = parseFloat(product?.totalAmount || (rentTotal + shippingFee + depositFee));
    }

    // ==========================================
    // 📸 ฟังก์ชันเลือกรูปสลิป
    // ==========================================
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("ขออภัย", "เราต้องขออนุญาตเข้าถึงรูปภาพเพื่อแนบสลิป");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    // ==========================================
    // 🚀 ฟังก์ชันยืนยันการโอน
    // ==========================================
    const handleConfirmPayment = async () => {
        if (!image) {
            Alert.alert("แจ้งเตือน", "กรุณาแนบหลักฐานการโอนเงิน (สลิป)");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            
            // เตรียมไฟล์รูปสลิป
            const filename = image.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            formData.append('slip_image', { uri: image, name: filename, type });

            let targetUrl = "";
            
            if (isCart) {
                // 🛒 ส่งข้อมูลไปที่ Endpoint ของตะกร้า
                targetUrl = `${API_URL}/cart/checkout`; 
                formData.append('user_id', user.id);
                formData.append('total_price', grandTotal);
                formData.append('items', JSON.stringify(cartItems));
            } else {
                // 📦 ส่งข้อมูลไปที่ Endpoint เช่าปกติ
                const targetBookingId = bookingId || product?.bookingId;
                if (!targetBookingId) throw new Error("ไม่พบหมายเลขการจอง");

                targetUrl = `${API_URL}/bookings/confirm-payment`;
                formData.append('booking_id', targetBookingId);
                formData.append('user_id', user.id);
                formData.append('total_price', grandTotal);
            }

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            const data = await response.json();
            
            if (data.success) {
                Alert.alert("สำเร็จ ✨", "ส่งหลักฐานเรียบร้อย ระบบจะตรวจสอบข้อมูลครับ", [
                    { text: "ตกลง", onPress: () => onComplete() }
                ]);
            } else {
                Alert.alert("ผิดพลาด", data.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            Alert.alert("Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>💰 รายละเอียดการชำระเงิน</Text>

                <View style={styles.summaryCard}>
                    <Text style={styles.productName}>{displayName}</Text>
                    {!isCart && <Text style={styles.dateText}>ระยะเวลาเช่า: {displayDays} วัน</Text>}

                    <View style={styles.divider} />

                    {isCart ? (
                        <View>
                            {cartItems.map((item, index) => (
                                <View key={index} style={styles.cartItemRow}>
                                    <Text style={styles.cartItemName} numberOfLines={1}>• {item.product_name}</Text>
                                    <Text style={styles.cartItemPrice}>฿{Number(item.total_price || 0).toLocaleString()}</Text>
                                </View>
                            ))}
                            <View style={[styles.divider, { marginVertical: 10 }]} />
                        </View>
                    ) : (
                        <>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>ค่าเช่า ({displayDays} วัน)</Text>
                                <Text style={styles.priceValue}>฿{rentTotal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>ค่าจัดส่ง</Text>
                                <Text style={styles.priceValue}>฿{shippingFee.toLocaleString()}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, {color: '#FF385C', fontWeight: 'bold'}]}>ค่ามัดจำ (ได้รับคืน)</Text>
                                <Text style={[styles.priceValue, {color: '#FF385C', fontWeight: 'bold'}]}>฿{depositFee.toLocaleString()}</Text>
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}
                    
                    <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>ยอดโอนสุทธิ</Text>
                        <Text style={styles.totalValue}>฿{grandTotal.toLocaleString()}</Text>
                    </View>
                </View>

                {/* บัญชีธนาคาร */}
                <View style={styles.paymentInfo}>
                    <Text style={styles.infoTitle}>🏦 ช่องทางโอนเงิน</Text>
                    <Text style={styles.bankDetail}>ธนาคารกสิกรไทย (K-Bank)</Text>
                    <Text style={styles.bankNumber}>123-4-56789-0</Text>
                    <Text style={styles.bankName}>ชื่อบัญชี: บจก. เช่าของกัน (RentShare)</Text>
                </View>

                {/* อัปโหลดสลิป */}
                <Text style={styles.uploadTitle}>📸 หลักฐานการโอน (สลิป)</Text>
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker} disabled={loading}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.slipImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderIcon}>🖼️</Text>
                            <Text style={styles.placeholderText}>เลือกรูปภาพสลิปจากอัลบั้ม</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.confirmButton, (!image || loading) && styles.buttonDisabled]} 
                    onPress={handleConfirmPayment}
                    disabled={loading || !image}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>แจ้งชำระเงิน ✨</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={loading}>
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    header: { fontSize: 22, fontWeight: 'bold', marginTop: 40, marginBottom: 20, textAlign: 'center', color: '#333' },
    summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    productName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    dateText: { color: '#666', marginTop: 4, fontSize: 14 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
    priceLabel: { fontSize: 15, color: '#666' },
    priceValue: { fontSize: 15, color: '#333', fontWeight: '600' },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    totalValue: { fontSize: 26, fontWeight: 'bold', color: '#FF385C' },
    cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    cartItemName: { fontSize: 14, color: '#666', flex: 1, marginRight: 10 },
    cartItemPrice: { fontSize: 14, color: '#333', fontWeight: '600' },
    paymentInfo: { marginVertical: 20, padding: 20, backgroundColor: '#E3F2FD', borderRadius: 15, borderWidth: 1, borderColor: '#BBDEFB' },
    infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: '#1976D2' },
    bankDetail: { fontSize: 15, color: '#333' },
    bankNumber: { fontSize: 22, fontWeight: 'bold', color: '#0D47A1', marginVertical: 5 },
    bankName: { fontSize: 14, color: '#555' },
    uploadTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
    imagePicker: { height: 250, backgroundColor: '#fff', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed' },
    slipImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    placeholder: { alignItems: 'center' },
    placeholderIcon: { fontSize: 40, marginBottom: 10 },
    placeholderText: { color: '#999', fontSize: 14 },
    confirmButton: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 25, elevation: 3 },
    buttonDisabled: { backgroundColor: '#ccc' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
    backButtonText: { color: '#999', fontSize: 16 }
});