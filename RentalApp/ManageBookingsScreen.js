import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';

// 👇 ตรวจสอบ ngrok ให้ตรงกัน
const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function ManageBookingsScreen({ route }) {
    const user = route?.params?.user; 
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchOwnerBookings();
        }
    }, [user?.id]);

    const fetchOwnerBookings = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/bookings/owner/${user.id}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const json = await response.json();
            if (json.success) {
                setBookings(json.data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            Alert.alert("Error", "ไม่สามารถดึงข้อมูลรายการเช่าได้");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (bookingId, newStatus) => {
        let title = "";
        let message = "";

        // ปรับแต่งข้อความแจ้งเตือนตามสถานะ (Flow ใหม่)
        switch (newStatus) {
            case 'approved':
                title = "อนุมัติรายการ";
                message = "คุณต้องการอนุมัติรายการนี้ใช่ไหม?";
                break;
            case 'shipped':
                title = "ยืนยันการจัดส่ง";
                message = "คุณได้ทำการจัดส่งสินค้าให้ผู้เช่าแล้วใช่ไหม?";
                break;
            case 'completed':
                title = "ยืนยันรับคืน (คืนมัดจำ)";
                message = "สินค้าอยู่ในสภาพปกติ ระบบจะโอนเงินมัดจำคืนผู้เช่าทันที ยืนยันหรือไม่?";
                break;
            case 'damaged':
                title = "รายงานความเสียหาย (ยึดมัดจำ)";
                message = "สินค้าเสียหาย ระบบจะโอนเงินมัดจำให้คุณเพื่อชดเชย ยืนยันหรือไม่?";
                break;
            case 'rejected':
                title = "ปฏิเสธรายการ";
                message = "คุณต้องการยกเลิกรายการนี้ใช่ไหม?";
                break;
        }

        Alert.alert(title, message, [
            { text: "ยกเลิก", style: "cancel" },
            { 
                text: "ตกลง", 
                onPress: async () => {
                    try {
                        const res = await fetch(`${BASE_URL}/bookings/update-status`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ booking_id: bookingId, status: newStatus })
                        });
                        const json = await res.json();
                        if (json.success) {
                            Alert.alert("สำเร็จ", "อัปเดตสถานะเรียบร้อย");
                            fetchOwnerBookings(); 
                        } else {
                            Alert.alert("เกิดข้อผิดพลาด", json.message);
                        }
                    } catch (error) {
                        Alert.alert("Error", "เชื่อมต่อ Server ไม่ได้");
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => {
        let actionButtons = null;
        let statusMessage = null;

        const productImage = item?.image_url 
            ? { uri: `${BASE_URL}/uploads/${item.image_url}` } 
            : { uri: 'https://via.placeholder.com/150' };

        const slipImage = item?.slip_image 
            ? { uri: `${BASE_URL}/uploads/${item.slip_image}` }
            : null;

        // ----------------------------------------------------
        // Logic การแสดงผลตาม Flow ใหม่
        // ----------------------------------------------------

        // 1. รออนุมัติ (Pending)
        if (item?.status === 'pending') {
            actionButtons = (
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                        <Text style={styles.btnText}>❌ ปฏิเสธ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                        <Text style={styles.btnText}>✅ อนุมัติให้เช่า</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        
        // 2. อนุมัติแล้ว (Approved) -> เจ้าของต้องกดส่งของ
        else if (item?.status === 'approved') {
            statusMessage = (
                <View style={[styles.infoBox, {backgroundColor: '#E8F5E9'}]}>
                    <Text style={{color: '#2E7D32', fontWeight: 'bold'}}>📦 รอคุณจัดส่งสินค้า</Text>
                    <Text style={{fontSize: 12, color: '#555'}}>เมื่อส่งของแล้ว ให้กดปุ่มด้านล่าง</Text>
                </View>
            );
            actionButtons = (
                <TouchableOpacity style={[styles.btn, styles.btnShip]} onPress={() => handleUpdateStatus(item.id, 'shipped')}>
                    <Text style={styles.btnText}>🚚 แจ้งว่าจัดส่งแล้ว</Text>
                </TouchableOpacity>
            );
        }

        // 3. จัดส่งแล้ว (Shipped) -> รอผู้เช่ากดรับของ
        else if (item?.status === 'shipped') {
            statusMessage = (
                <View style={[styles.infoBox, {backgroundColor: '#E3F2FD'}]}>
                    <Text style={{color: '#1565C0', fontWeight: 'bold'}}>⏳ รอผู้เช่าได้รับสินค้า</Text>
                    <Text style={{fontSize: 12, color: '#555'}}>ระบบจะโอนค่าเช่าให้คุณเมื่อผู้เช่ากดยืนยันรับของ</Text>
                </View>
            );
        }

        // 4. กำลังเช่า (Active) -> ผู้เช่ากดรับของแล้ว (เงินเข้า Wallet เจ้าของแล้ว)
        else if (item?.status === 'active') {
            statusMessage = (
                <View style={[styles.infoBox, {backgroundColor: '#FFF3E0'}]}>
                    <Text style={{color: '#E65100', fontWeight: 'bold'}}>💰 ผู้เช่ารับของแล้ว (ได้รับค่าเช่าแล้ว)</Text>
                    <Text style={{fontSize: 12, color: '#555'}}>รอลูกค้าส่งคืนสินค้า</Text>
                </View>
            );
        }

        // 5. ผู้เช่าคืนของแล้ว (Returned) -> เจ้าของต้องตรวจรับ
        else if (item?.status === 'returned') {
            statusMessage = (
                <View style={[styles.infoBox, {backgroundColor: '#E1F5FE'}]}>
                    <Text style={{color: '#0277BD', fontWeight: 'bold'}}>↩️ ผู้เช่าแจ้งคืนสินค้าแล้ว</Text>
                    <Text style={{fontSize: 12, color: '#555'}}>กรุณาตรวจสอบสภาพสินค้าก่อนเลือกตัวเลือกด้านล่าง</Text>
                </View>
            );
            actionButtons = (
                <View style={styles.buttonRow}>
                     {/* ปุ่มแจ้งเสียหาย -> ยึดมัดจำ */}
                    <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleUpdateStatus(item.id, 'damaged')}>
                        <Text style={styles.btnText}>⚠️ เสียหาย</Text>
                    </TouchableOpacity>
                    {/* ปุ่มรับคืนปกติ -> คืนมัดจำ */}
                    <TouchableOpacity style={[styles.btn, styles.btnComplete]} onPress={() => handleUpdateStatus(item.id, 'completed')}>
                        <Text style={styles.btnText}>✅ รับคืนปกติ</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        
        // 6. รอตรวจสอบสลิป (กรณีเดิม ถ้ายังมีใช้)
        else if (item?.status === 'pending_verification') {
             statusMessage = (
                <View style={[styles.infoBox, styles.verificationBox]}>
                    <Text style={styles.verificationTitle}>💰 รอตรวจสลิป</Text>
                    <Text style={styles.verificationSub}>ยอด: {Number(item?.total_price).toLocaleString()} บ.</Text>
                    {slipImage && <Image source={slipImage} style={styles.slipPreview} resizeMode="contain" />}
                </View>
            );
            actionButtons = (
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                        <Text style={styles.btnText}>❌ ไม่ผ่าน</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleUpdateStatus(item.id, 'paid')}>
                        <Text style={styles.btnText}>✅ ผ่าน</Text>
                    </TouchableOpacity>
                </View>
            );
        }


        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>📅 {item?.created_at ? new Date(item.created_at).toLocaleDateString('th-TH') : '-'}</Text>
                    <Text style={[styles.statusBadge, { color: getStatusColor(item?.status) }]}>
                        {getStatusLabel(item?.status)}
                    </Text>
                </View>

                <View style={styles.body}>
                    <Image source={productImage} style={styles.productImage} />
                    <View style={styles.info}>
                        <Text style={styles.productName}>{item?.product_name || 'ไม่ระบุชื่อสินค้า'}</Text>
                        <Text style={styles.detailText}>👤 ผู้เช่า: {item?.renter_name || 'ไม่ระบุ'}</Text>
                        <Text style={styles.detailText}>📞 โทร: {item?.renter_phone || 'ไม่ระบุ'}</Text>
                        <Text style={styles.addressText}>📍 {item?.renter_address || "-"}</Text>
                        <Text style={styles.price}>ยอดรวม: {Number(item?.total_price || 0).toLocaleString()} ฿</Text>
                    </View>
                </View>

                {statusMessage}
                <View style={styles.actionContainer}>{actionButtons}</View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {loading && bookings.length === 0 ? (
                <ActivityIndicator size="large" color="#FF385C" style={{marginTop: 50}} />
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOwnerBookings} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีรายการคำขอเช่าสินค้าของคุณ</Text>}
                    contentContainerStyle={{ paddingBottom: 30 }}
                />
            )}
        </View>
    );
}

// Helper Functions
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#FFC107';
        case 'approved': return '#1976D2'; // น้ำเงิน
        case 'shipped': return '#9C27B0'; // ม่วง
        case 'active': return '#4CAF50'; // เขียว (รับเงินค่าเช่าแล้ว)
        case 'returned': return '#FF9800'; // ส้ม (รอตรวจ)
        case 'completed': return '#8BC34A'; // เขียวอ่อน (จบงาน)
        case 'damaged': return '#F44336'; // แดง
        case 'rejected': return '#F44336';
        default: return '#000';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'pending': return 'รออนุมัติ';
        case 'approved': return 'รอจัดส่ง';
        case 'shipped': return 'จัดส่งแล้ว';
        case 'active': return 'กำลังเช่า';
        case 'returned': return 'รอตรวจรับคืน';
        case 'completed': return 'จบงานปกติ';
        case 'damaged': return 'เสียหาย (ยึดมัดจำ)';
        case 'rejected': return 'ยกเลิก';
        default: return status;
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dateText: { color: '#888', fontSize: 12 },
    statusBadge: { fontWeight: 'bold', fontSize: 13 },
    body: { flexDirection: 'row', marginBottom: 12 },
    productImage: { width: 85, height: 85, borderRadius: 10, marginRight: 15, backgroundColor: '#f0f0f0' },
    info: { flex: 1, justifyContent: 'center' },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    detailText: { fontSize: 13, color: '#666', marginBottom: 2 },
    addressText: { color: '#444', fontSize: 12, marginTop: 4 },
    price: { color: '#FF385C', fontWeight: 'bold', fontSize: 15, marginTop: 6 },
    infoBox: { padding: 12, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
    verificationBox: { backgroundColor: '#FFF9C4', borderColor: '#FBC02D', borderWidth: 1 },
    verificationTitle: { color: '#F57F17', fontWeight: 'bold', fontSize: 15 },
    verificationSub: { fontSize: 12, color: '#666', marginBottom: 10 },
    slipPreview: { width: '100%', height: 280, borderRadius: 8, marginTop: 5, backgroundColor: '#eee' },
    actionContainer: { paddingTop: 5 },
    buttonRow: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, height: 45, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    btnApprove: { backgroundColor: '#4CAF50' },
    btnReject: { backgroundColor: '#F44336' },
    btnShip: { backgroundColor: '#0288D1' }, // สีฟ้าเข้ม
    btnComplete: { backgroundColor: '#4CAF50' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    emptyText: { textAlign: 'center', marginTop: 100, color: '#bbb', fontSize: 16 }
});