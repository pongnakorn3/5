import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker'; 
import { Ionicons } from '@expo/vector-icons'; // เพิ่ม Icon เพื่อความสวยงาม

const generatePayload = require('promptpay-qr');

export default function PaymentScreen({ route, onBack, onComplete, BASE_URL, user }) {
    // 1. ดึงข้อมูลและดัก Error กรณี params ว่าง
    const params = route?.params || {};
    const { amount, totalAmount, bookingId } = params;
    
    // ดึง userId จาก params หรือจาก props user ที่ส่งมาจาก App.js
    const currentUserId = params.userId || user?.id;

    const finalAmount = Number(totalAmount || amount || 0);

    const [slipImage, setSlipImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // 2. ตั้งค่าเบอร์พร้อมเพย์ (แนะนำให้ดึงจาก Backend หรือ Config)
    const mobileNumber = "081-234-5678"; 
    const payload = generatePayload(mobileNumber, { amount: finalAmount });

    const pickSlip = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            return Alert.alert("ขออนุญาต", "แอปต้องการสิทธิ์เข้าถึงรูปภาพเพื่ออัปโหลดสลิป");
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.6, // ลดคุณภาพนิดหน่อยเพื่อให้ส่งไวขึ้น
        });

        if (!result.canceled) {
            setSlipImage(result.assets[0].uri);
        }
    };

    const handleUploadSlip = async () => {
        if (!slipImage) return Alert.alert("แจ้งเตือน", "กรุณาอัปโหลดสลิปก่อน");
        if (!bookingId) return Alert.alert("Error", "ไม่พบข้อมูลการจอง (Missing Booking ID)");
        
        setLoading(true);
        try {
            const formData = new FormData();
            
            // การจัดการไฟล์สำหรับ React Native FormData
            const filename = slipImage.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('slip_image', {
                uri: slipImage,
                name: filename,
                type: type,
            });
            
            formData.append('booking_id', String(bookingId));
            formData.append('user_id', String(currentUserId || ''));

            const response = await fetch(`${BASE_URL}/booking/upload-slip`, {
                method: 'POST',
                body: formData,
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("สำเร็จ", "ส่งสลิปเรียบร้อยแล้ว ระบบจะตรวจสอบภายใน 24 ชม.", [
                    { text: "ตกลง", onPress: () => onComplete() }
                ]);
            } else {
                Alert.alert("ล้มเหลว", data.message || "เซิร์ฟเวอร์ปฏิเสธการอัปโหลด");
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ต");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 20 }}>
            {/* Header */}
            <TouchableOpacity onPress={onBack} style={{ marginTop: 40, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chevron-back" size={24} color="#FF385C" />
                <Text style={{ color: '#FF385C', fontSize: 16, fontWeight: '600' }}> ย้อนกลับ</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333', marginTop: 20 }}>
                ชำระเงิน
            </Text>
            
            {/* QR Code Section */}
            <View style={{ alignItems: 'center', marginVertical: 25, padding: 20, backgroundColor: '#fdfdfd', borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <Image source={require('./assets/promptpay_logo.png')} style={{ width: 120, height: 40, marginBottom: 15 }} resizeMode="contain" />
                
                {finalAmount > 0 ? (
                    <QRCode value={payload} size={200} />
                ) : (
                    <View style={{ height: 200, justifyContent: 'center' }}><Text>รอยอดชำระ...</Text></View>
                )}

                <Text style={{ marginTop: 20, fontSize: 18, color: '#444' }}>ยอดที่ต้องโอน</Text>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FF385C' }}>
                    ฿{finalAmount.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: '#777', marginTop: 5 }}>Booking ID: {bookingId}</Text>
            </View>

            {/* Upload Section */}
            <View style={{ marginBottom: 40 }}>
                <Text style={{ fontSize: 16, marginBottom: 12, fontWeight: 'bold', color: '#333' }}>
                    แนบสลิปการโอนเงิน
                </Text>
                
                <TouchableOpacity 
                    style={{ 
                        backgroundColor: '#f8f9fa', 
                        height: slipImage ? 400 : 150,
                        borderRadius: 15, 
                        justifyContent: 'center',
                        alignItems: 'center', 
                        borderStyle: 'dashed', 
                        borderWidth: 2,
                        borderColor: slipImage ? '#28a745' : '#ddd',
                        overflow: 'hidden'
                    }}
                    onPress={pickSlip}
                >
                    {slipImage ? (
                        <Image source={{ uri: slipImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={40} color="#999" />
                            <Text style={{ color: '#999', marginTop: 8 }}>คลิกเพื่อเลือกรูปภาพสลิป</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={{ 
                        backgroundColor: slipImage ? '#FF385C' : '#ccc', 
                        padding: 18, 
                        borderRadius: 15, 
                        marginTop: 25, 
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center' 
                    }}
                    disabled={!slipImage || loading}
                    onPress={handleUploadSlip}
                >
                    {loading && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                        {loading ? 'กำลังประมวลผล...' : 'ยืนยันและส่งสลิป'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}