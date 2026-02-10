import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker'; //
const generatePayload = require('promptpay-qr');

export default function PaymentScreen({ route, onBack, onComplete, BASE_URL }) {
    // 1. ดึงข้อมูลจาก params
    const { amount, bookingId, userId } = route.params; 
    
    // 2. สร้าง State สำหรับจัดการรูปและสถานะโหลด
    const [slipImage, setSlipImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // 3. ตั้งค่าเบอร์พร้อมเพย์และสร้าง Payload
    const mobileNumber = "081-234-5678"; 
    const payload = generatePayload(mobileNumber, { amount: Number(amount) });

    // 4. ฟังก์ชันเลือกรูปสลิป
    const pickSlip = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) {
            setSlipImage(result.assets[0].uri);
        }
    };

    // 5. ฟังก์ชันส่งสลิปไป Backend
    const handleUploadSlip = async () => {
        if (!slipImage) return Alert.alert("แจ้งเตือน", "กรุณาอัปโหลดสลิปก่อน");
        
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('slip_image', {
                uri: slipImage,
                name: `slip_${bookingId}.jpg`,
                type: 'image/jpeg',
            });
            formData.append('booking_id', bookingId);

            const response = await fetch(`${BASE_URL}/booking/upload-slip`, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("สำเร็จ", "ส่งสลิปเรียบร้อย รอตรวจสอบครับ");
                onComplete(); // เปลี่ยนไปหน้า MyBookings
            }
        } catch (err) {
            Alert.alert("Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
            <TouchableOpacity onPress={onBack} style={{ marginBottom: 10 }}>
                <Text style={{ color: 'blue' }}>⬅️ ย้อนกลับ</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
                ชำระเงินมัดจำและค่าเช่า
            </Text>
            
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
                <QRCode value={payload} size={250} />
                <Text style={{ marginTop: 10, fontSize: 18, color: '#333' }}>
                    ยอดที่ต้องโอน: <Text style={{ fontWeight: 'bold', color: 'blue' }}>{amount} บาท</Text>
                </Text>
            </View>

            <View style={{ marginTop: 20, paddingBottom: 50 }}>
                <Text style={{ fontSize: 16, marginBottom: 10 }}>อัปโหลดสลิปยืนยันการโอนเงิน:</Text>
                
                <TouchableOpacity 
                    style={{ backgroundColor: '#f0f0f0', padding: 20, borderRadius: 10, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 }}
                    onPress={pickSlip}
                >
                    <Text>{slipImage ? '✅ เลือกรูปแล้ว' : '📷 คลิกเพื่อเลือกรูปสลิป'}</Text>
                </TouchableOpacity>

                {slipImage && (
                    <Image source={{ uri: slipImage }} style={{ width: '100%', height: 300, marginTop: 15, borderRadius: 10 }} resizeMode="contain" />
                )}

                <TouchableOpacity 
                    style={{ 
                        backgroundColor: slipImage ? '#28a745' : '#ccc', 
                        padding: 15, borderRadius: 10, marginTop: 25, alignItems: 'center' 
                    }}
                    disabled={!slipImage || loading}
                    onPress={handleUploadSlip}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                        {loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันการชำระเงิน'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}