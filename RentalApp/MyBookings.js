import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';

const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function MyBookingsScreen({ user, setCurrentScreen, setSelectedProduct, setBookingDate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.id) {
        fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/bookings/user/${user.id}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันแจ้งคืนของ
  const processReturn = async (bookingId) => {
      try {
          const response = await fetch(`${API_URL}/bookings/update-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: bookingId, status: 'returned' })
          });
          const json = await response.json();
          if (json.success) {
              Alert.alert("สำเร็จ", "แจ้งคืนของเรียบร้อย รอเจ้าของตรวจสอบ!");
              fetchBookings();
          }
      } catch (error) {
          Alert.alert("Error", "เชื่อมต่อ Server ไม่ได้");
      }
  };

  // ✅ ฟังก์ชันกดยืนยันรับของ (แก้ไขชื่อตัวแปร URL ให้ถูกต้อง)
  const handleConfirmReceive = async (bookingId) => {
    Alert.alert(
        "ยืนยันรับสินค้า",
        "คุณได้รับสินค้าและตรวจสอบเรียบร้อยแล้วใช่หรือไม่?",
        [
            { text: "ยังไม่ได้รับ", style: "cancel" },
            {
                text: "ได้รับแล้ว",
                onPress: async () => {
                    try {
                        const response = await fetch(`${API_URL}/bookings/update-status`, { // แก้ BASE_URL -> API_URL
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            // หมายเหตุ: เช็ค Backend ว่ารับ 'received' หรือ 'active' (ในที่นี้ใช้ received)
                            body: JSON.stringify({ 
                                booking_id: bookingId, 
                                status: 'received' 
                            })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                            fetchBookings(); // รีโหลดข้อมูลใหม่
                        } else {
                            Alert.alert("ผิดพลาด", data.message || "อัปเดตสถานะไม่สำเร็จ");
                        }
                    } catch (error) {
                        console.error("Error updating status:", error);
                        Alert.alert("Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                    }
                }
            }
        ]
    );
  };

  const renderItem = ({ item }) => {
    let statusColor = '#9E9E9E';
    let statusText = item.status;
    let showReturnButton = false;
    let showReceiveButton = false; // ✅ ตัวแปรสำหรับปุ่มรับของ

    // ปรับ Logic สถานะ
    switch (item.status) {
        case 'pending':
            statusColor = '#FFC107';
            statusText = '⏳ รอเจ้าของอนุมัติ';
            break;
        case 'pending_verification': 
            statusColor = '#F57F17';
            statusText = '💰 รอตรวจสอบสลิป';
            break;
        case 'approved': 
            statusColor = '#2196F3'; // สีฟ้า
            statusText = '📦 อนุมัติแล้ว (กำลังเตรียมส่ง)';
            break;  
        case 'shipped': // ✅ เพิ่มเคสนี้
            statusColor = '#9C27B0'; // สีม่วง
            statusText = '🚚 อยู่ระหว่างจัดส่ง';
            showReceiveButton = true; // เปิดปุ่มรับของ
            break;
        case 'received': // หรือ 'active' (กำลังเช่า)
        case 'paid': // รองรับ case เก่าเผื่อหลุดมา
            statusColor = '#4CAF50';
            statusText = '✅ ได้รับของแล้ว (กำลังเช่า)';
            showReturnButton = true; // เปิดปุ่มคืนของ
            break;
        case 'returned':
            statusColor = '#00BCD4'; // สีฟ้าเชียน
            statusText = '🔄 ส่งคืนแล้ว (รอตรวจรับ)';
            break;
        case 'completed':
            statusColor = '#607D8B';
            statusText = '🎉 จบการเช่า (คืนมัดจำแล้ว)';
            break;
        case 'rejected':
            statusColor = '#F44336';
            statusText = '❌ ปฏิเสธการเช่า';
            break;
    }

    return (
      <View style={styles.card}>
        <Image 
          source={{ uri: item.image_url ? `${API_URL}/uploads/${item.image_url}` : 'https://via.placeholder.com/150' }} 
          style={styles.image} 
        />
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.priceText}>ยอดรวม: {Number(item.total_price).toLocaleString()} บาท</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          
          {/* ข้อมูลเจ้าของร้านจะโชว์เมื่อเริ่มมีการส่งของ/จ่ายเงินแล้ว */}
          {['approved', 'shipped', 'received', 'paid', 'returned'].includes(item.status) && (
            <View style={styles.contactBox}>
                <Text style={styles.contactText}>📞 ติดต่อ: {item.owner_phone || "-"}</Text>
                <Text style={styles.contactText}>📍 ที่อยู่เจ้าของ: {item.owner_address || "ดูในแชท"}</Text>
            </View>
          )}

          {/* ✅ ปุ่มยืนยันรับของ (แสดงตอน status = shipped) */}
          {showReceiveButton && (
            <TouchableOpacity 
              style={styles.receiveButton}
              onPress={() => handleConfirmReceive(item.id)}
            >
              <Text style={styles.buttonText}>✅ ฉันได้รับสินค้าแล้ว</Text>
            </TouchableOpacity>
          )}

          {/* ปุ่มแจ้งคืนของ (แสดงตอนได้รับของแล้ว) */}
          {showReturnButton && (
              <TouchableOpacity 
                style={styles.returnButton} 
                onPress={() => {
                    Alert.alert("ยืนยันการคืนของ", "คุณส่งของคืนเจ้าของแล้วใช่ไหม?", [
                        { text: "ยกเลิก", style: "cancel" },
                        { text: "ใช่", onPress: () => processReturn(item.id) }
                    ]);
                }}
              >
                  <Text style={styles.buttonText}>📦 แจ้งคืนของ</Text>
              </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>รายการเช่าของฉัน</Text>
      {loading && bookings.length === 0 ? <ActivityIndicator size="large" color="#FF385C" /> : (
          bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={{fontSize: 50}}>📦</Text>
                <Text style={styles.emptyText}>ไม่มีรายการเช่า</Text>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 15 },
  header: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, color: '#333' },
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, marginBottom: 15, padding: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  image: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#eee' },
  infoContainer: { flex: 1, marginLeft: 15 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 2 },
  priceText: { fontSize: 14, color: '#E44D26', fontWeight: 'bold', marginBottom: 5 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  contactBox: { backgroundColor: '#F1F8E9', padding: 8, borderRadius: 8, marginBottom: 10 },
  contactText: { fontSize: 11, color: '#388E3C' },
  
  // Styles for buttons
  receiveButton: { backgroundColor: '#28a745', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  returnButton: { backgroundColor: '#FF9500', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 }
});