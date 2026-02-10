import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev";

export default function PaymentSummary({ user, product, bookingId, bookingDate, onComplete, onBack }) {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // 1. คำนวณจำนวนวันเช่า (ใช้ค่าจาก props ถ้ามี หรือคำนวณใหม่)
    const calculateDays = () => {
        if (!bookingDate?.start || !bookingDate?.end) return 1;
        const start = new Date(bookingDate.start);
        const end = new Date(bookingDate.end);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    };

    const diffDays = calculateDays();

    // 2. คำนวณยอดเงิน (ดึงค่าจาก product ที่ส่งมาจากหน้า Detail หรือ Summary ก่อนหน้า)
    const rentTotal = (Number(product?.price_per_day) || 0) * diffDays;
const shippingFee = Number(product?.shipping_fee) || 50; // ✅ เช็คชื่อฟิลด์ให้ตรง
const depositFee = Number(product?.deposit) || 0;

// ✨ แนะนำให้ดึง grandTotal จากที่คำนวณมาแล้วจากหน้าก่อนหน้าจะแม่นยำที่สุด
const grandTotal = product?.totalAmount || (rentTotal + shippingFee + depositFee);
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("ขออภัย", "เราต้องขออนุญาตเข้าถึงรูปภาพเพื่อแนบสลิป");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7, // ลดขนาดไฟล์เล็กน้อยเพื่อให้ upload เร็วขึ้น
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleConfirmPayment = async () => {
        if (!image) {
            Alert.alert("แจ้งเตือน", "กรุณาแนบหลักฐานการโอนเงิน (สลิป)");
            return;
        }

        // ตรวจสอบว่ามี bookingId หรือไม่ (สำคัญมากในการบันทึกลง DB)
        const targetBookingId = bookingId || product?.bookingId;
        if (!targetBookingId) {
            Alert.alert("Error", "ไม่พบหมายเลขการจอง กรุณาลองใหม่");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('booking_id', targetBookingId);
            formData.append('total_price', grandTotal);
            
            const filename = image.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            
            formData.append('slip_image', { 
                uri: image, 
                name: filename, 
                type 
            });

            const response = await fetch(`${API_URL}/bookings/confirm-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("สำเร็จ ✨", "ส่งหลักฐานเรียบร้อย ระบบจะแจ้งผลการตรวจสอบให้ทราบ", [
                    { text: "ตกลง", onPress: () => onComplete() }
                ]);
            } else {
                Alert.alert("ผิดพลาด", data.message || "ไม่สามารถส่งข้อมูลได้");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            Alert.alert("Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: '#F8F9FA'}}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>💰 แจ้งชำระเงิน</Text>

                <View style={styles.summaryCard}>
                    <Text style={styles.productName}>{product?.name || 'รายการเช่าสินค้า'}</Text>
                    <Text style={styles.dateText}>ระยะเวลาเช่า: {diffDays} วัน</Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>ค่าเช่า ({diffDays} วัน)</Text>
                        <Text style={styles.priceValue}>{rentTotal.toLocaleString()} ฿</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>ค่าจัดส่ง</Text>
                        <Text style={styles.priceValue}>{shippingFee.toLocaleString()} ฿</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, {color: '#FF385C', fontWeight: 'bold'}]}>ค่ามัดจำ (ได้รับคืน)</Text>
                        <Text style={[styles.priceValue, {color: '#FF385C', fontWeight: 'bold'}]}>{depositFee.toLocaleString()} ฿</Text>
                    </View>
                    
                    <View style={[styles.divider, {backgroundColor: '#FF385C'}]} />
                    
                    <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>ยอดโอนสุทธิ</Text>
                        <Text style={styles.totalValue}>{grandTotal.toLocaleString()} ฿</Text>
                    </View>
                </View>

                <View style={styles.paymentInfo}>
                    <Text style={styles.infoTitle}>🏦 บัญชีสำหรับโอนเงิน</Text>
                    <Text style={styles.bankDetail}>ธนาคารกสิกรไทย (K-Bank)</Text>
                    <Text style={styles.bankNumber}>123-4-56789-0</Text>
                    <Text style={styles.bankName}>ชื่อบัญชี: บจก. เช่าของกัน (RentShare)</Text>
                </View>

                <Text style={styles.uploadTitle}>📸 แนบสลิปโอนเงิน</Text>
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker} disabled={loading}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.slipImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderIcon}>➕</Text>
                            <Text style={styles.placeholderText}>กดเพื่อเลือกรูปภาพสลิป</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.confirmButton, (!image || loading) && styles.buttonDisabled]} 
                    onPress={handleConfirmPayment}
                    disabled={loading || !image}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>ยืนยันการแจ้งโอน ✨</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={loading}>
                    <Text style={styles.backButtonText}>ย้อนกลับไปแก้ไข</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { padding: 20, paddingBottom: 40 },
    header: { fontSize: 24, fontWeight: 'bold', marginTop: 10, marginBottom: 20, textAlign: 'center', color: '#333' },
    summaryCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    productName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    dateText: { color: '#666', marginTop: 4, fontSize: 14 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    priceLabel: { fontSize: 15, color: '#555' },
    priceValue: { fontSize: 15, color: '#333', fontWeight: '500' },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#FF385C' },
    paymentInfo: { marginVertical: 20, padding: 18, backgroundColor: '#E3F2FD', borderRadius: 12, borderWidth: 1, borderColor: '#BBDEFB' },
    infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#1976D2' },
    bankDetail: { fontSize: 15, fontWeight: '600', color: '#333' },
    bankNumber: { fontSize: 20, fontWeight: 'bold', color: '#0D47A1', marginVertical: 4 },
    bankName: { fontSize: 14, color: '#555' },
    uploadTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    imagePicker: { height: 280, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed' },
    slipImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    placeholder: { alignItems: 'center' },
    placeholderIcon: { fontSize: 40, marginBottom: 10 },
    placeholderText: { color: '#888', fontSize: 14 },
    confirmButton: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 25, elevation: 3 },
    buttonDisabled: { backgroundColor: '#ccc', elevation: 0 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
    backButtonText: { color: '#666', fontSize: 16, textDecorationLine: 'underline' }
});