import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 1. เพิ่มบรรทัดนี้

// 👇👇 เปลี่ยนเป็น URL ของ Ngrok คุณ (ต้องตรงกับ Server)
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function OwnerOrdersScreen({ route }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    // 1. ดึงข้อมูล User ID และโหลดรายการจอง
    useEffect(() => {
        const initData = async () => {
            try {
                // พยายามดึงจาก params ก่อน ถ้าไม่มีให้ไปดึงจาก AsyncStorage
                let userId = route.params?.user?.id;

                if (!userId) {
                    const storedUser = await AsyncStorage.getItem('user'); // เช็ค key ที่ใช้เก็บตอน login (อาจจะเป็น 'userData' หรือ 'user')
                    if (storedUser) {
                        const parsedUser = JSON.parse(storedUser);
                        userId = parsedUser.id;
                    }
                }

                if (userId) {
                    console.log("🔥 App กำลังดึงข้อมูลของ Owner ID:", userId);
                    setCurrentUserId(userId);
                    fetchBookings(userId);
                } else {
                    Alert.alert("แจ้งเตือน", "ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่");
                    setLoading(false);
                }
            } catch (error) {
                console.error("User Check Error:", error);
                setLoading(false);
            }
        };

        initData();
    }, []);

    // 2. ฟังก์ชันดึงข้อมูลรายการจอง
    const fetchBookings = async (ownerId) => {
        try {
            // 👈 เพิ่ม header เพื่อแก้ปัญหา ngrok warning
            const response = await axios.get(`${API_URL}/bookings/owner/${ownerId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            
            // 👈 2. ต้องเข้าถึง .data.data เพราะ server ส่ง { success: true, data: [...] }
            if (response.data.success) {
                setBookings(response.data.data); 
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            // Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    // 3. ฟังก์ชันกดเปลี่ยนสถานะ
    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            // 👈 3. แก้จาก .put เป็น .post ให้ตรงกับ Server.js
            const response = await axios.post(`${API_URL}/bookings/update-status`, {
                booking_id: bookingId,
                status: newStatus
            });

            if (response.data.success) {
                Alert.alert("สำเร็จ", `สถานะเปลี่ยนเป็น ${newStatus} แล้ว`);
                // โหลดข้อมูลใหม่โดยใช้ ID เดิม
                if (currentUserId) fetchBookings(currentUserId);
            }
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("ผิดพลาด", "อัปเดตสถานะไม่สำเร็จ");
        }
    };

    // 4. การแสดงผล Card (เหมือนเดิม)
    const renderBookingItem = ({ item }) => {
        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <Image source={{ uri: `${API_URL}/uploads/${item.image_url}` }} style={styles.productImage} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.productName}>{item.product_name}</Text>
                        <Text style={styles.renterText}>ผู้เช่า: {item.renter_name}</Text>
                        <Text style={styles.renterText}>เบอร์: {item.renter_phone}</Text>
                        <Text style={{ fontWeight: 'bold', color: getStatusColor(item.status), marginTop: 4 }}>
                            สถานะ: {getStatusLabel(item.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    {item.status === 'pending' && (
                        <>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnApprove]}
                                onPress={() => handleUpdateStatus(item.id, 'approved')}
                            >
                                <Text style={styles.btnText}>✅ อนุมัติ</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.btn, styles.btnReject]}
                                onPress={() => handleUpdateStatus(item.id, 'rejected')}
                            >
                                <Text style={styles.btnText}>❌ ไม่รับ</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {item.status === 'approved' && (
                        <TouchableOpacity 
                            style={[styles.btn, styles.btnComplete]}
                            onPress={() => handleUpdateStatus(item.id, 'completed')}
                        >
                            <Text style={styles.btnText}>📦 ได้รับของคืนแล้ว (จบงาน)</Text>
                        </TouchableOpacity>
                    )}

                    {(item.status === 'completed' || item.status === 'rejected') && (
                        <Text style={{ color: '#888', fontStyle: 'italic', alignSelf: 'center' }}>
                            -- ดำเนินการเสร็จสิ้น --
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const getStatusColor = (status) => {
        if (status === 'approved') return 'green';
        if (status === 'pending') return 'orange';
        if (status === 'rejected') return 'red';
        if (status === 'completed') return 'blue';
        return 'black';
    };

    const getStatusLabel = (status) => {
        if (status === 'pending') return 'รออนุมัติ';
        if (status === 'approved') return 'กำลังเช่า';
        if (status === 'completed') return 'คืนของแล้ว';
        if (status === 'rejected') return 'ปฏิเสธ';
        return status;
    }

    if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#0000ff" />;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>📋 รายการจองสินค้าของฉัน</Text>
            {bookings.length === 0 ? (
                <Text style={styles.emptyText}>ยังไม่มีใครมาจองของของคุณ</Text>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBookingItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
    header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    productImage: { width: 70, height: 70, borderRadius: 5, backgroundColor: '#ddd' },
    productName: { fontSize: 16, fontWeight: 'bold' },
    renterText: { fontSize: 14, color: '#555' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    btn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 5, minWidth: 100, alignItems: 'center' },
    btnApprove: { backgroundColor: '#4CAF50' }, 
    btnReject: { backgroundColor: '#F44336' },  
    btnComplete: { backgroundColor: '#2196F3', flex: 1 }, 
    btnText: { color: 'white', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' }
});