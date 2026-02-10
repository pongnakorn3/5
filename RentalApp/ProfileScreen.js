import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

export default function ProfileScreen({ route, navigation }) {
    // ดึงข้อมูล user จาก params
    const { user } = route?.params || {}; 

    // ฟังก์ชันสำหรับกดไปหน้าแก้ไขที่อยู่ (เชื่อมกับ App.js ที่เราแก้ไว้)
    const handleEditAddress = () => {
        if (!user?.id) {
            Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้");
            return;
        }
        // สั่งให้ Navigator พาไปหน้า 'EditAddress' ที่เราสร้างไว้ใน App.js
        navigation.navigate('EditAddress');
    };

    const handleLogout = () => {
        Alert.alert(
            "ออกจากระบบ",
            "คุณต้องการออกจากระบบใช่หรือไม่?",
            [
                { text: "ยกเลิก", style: "cancel" },
                { 
                    text: "ยืนยัน", 
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]
        );
    };

    // หน้าจอแสดงผลกรณีไม่มีข้อมูล User
    if (!user || !user.id) {
        return (
            <View style={styles.container}>
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
                    <Text style={styles.errorText}>ไม่พบข้อมูลผู้ใช้ หรือเซสชันหมดอายุ</Text>
                    <TouchableOpacity style={styles.loginReturnButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginReturnText}>กลับไปหน้า Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image 
                    source={{ uri: user?.profile_picture || 'https://via.placeholder.com/150' }} 
                    style={styles.avatar} 
                />
                <Text style={styles.name}>{user?.full_name || "ไม่ระบุชื่อ"}</Text>
                <Text style={styles.email}>{user?.email || "ไม่มีอีเมล"}</Text>
                
                {/* แตะตรงนี้เพื่อไปหน้าแก้ไขที่อยู่ */}
                <TouchableOpacity style={styles.addressContainer} onPress={handleEditAddress}>
                    <Ionicons name="location-sharp" size={16} color="#FF385C" />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {user?.address && user.address !== "" ? user.address : "ยังไม่ได้ระบุที่อยู่จัดส่ง (แตะเพื่อเพิ่ม)"}
                    </Text>
                    <Ionicons name="pencil-outline" size={14} color="#9ca3af" style={{marginLeft: 5}} />
                </TouchableOpacity>

                <View style={[styles.badge, { backgroundColor: user?.kyc_status === 'approved' ? '#d1fae5' : '#fee2e2' }]}>
                    <Text style={{ color: user?.kyc_status === 'approved' ? '#065f46' : '#991b1b', fontWeight: 'bold' }}>
                        {user?.kyc_status === 'approved' ? '✅ ยืนยันตัวตนแล้ว' : '⚠️ ยังไม่ยืนยันตัวตน'}
                    </Text>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <Text style={styles.sectionTitle}>เมนูจัดการ</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('myBookings')}>
                    <View style={styles.iconBox}><Ionicons name="cube-outline" size={24} color="#FF385C" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.menuText}>รายการเช่าของฉัน</Text>
                        <Text style={styles.subText}>ดูสถานะสินค้าที่คุณปล่อยเช่าและเช่ามา</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                {/* ปุ่มแก้ไขที่อยู่ */}
                <TouchableOpacity style={styles.menuItem} onPress={handleEditAddress}>
                    <View style={styles.iconBox}><Ionicons name="home-outline" size={24} color="#FF385C" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.menuText}>แก้ไขที่อยู่จัดส่ง</Text>
                        <Text style={styles.subText}>ระบุที่อยู่เพื่อให้ผู้เช่าส่งของคืนถูกต้อง</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AddProduct')}>
                    <View style={styles.iconBox}><Ionicons name="add-circle-outline" size={24} color="#FF385C" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.menuText}>ลงประกาศสินค้าใหม่</Text>
                        <Text style={styles.subText}>สร้างรายได้จากการปล่อยเช่า</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <View style={styles.divider} />
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 ออกจากระบบ</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// ... styles เดิมของคุณคงไว้ ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { backgroundColor: '#fff', alignItems: 'center', padding: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, elevation: 5 },
    avatar: { width: 110, height: 110, borderRadius: 55, marginBottom: 12, borderWidth: 4, borderColor: '#FF385C' },
    name: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
    email: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
    addressContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    addressText: { fontSize: 13, color: '#4b5563', marginLeft: 5 },
    badge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 5 },
    menuContainer: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#9ca3af', marginBottom: 12, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { backgroundColor: '#fff', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
    iconBox: { width: 45, height: 45, backgroundColor: '#fff1f2', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    subText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 15 },
    logoutButton: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EF4444', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, padding: 20 },
    errorText: { fontSize: 18, color: '#4b5563', textAlign: 'center', marginTop: 20, marginBottom: 20 },
    loginReturnButton: { backgroundColor: '#FF385C', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
    loginReturnText: { color: '#fff', fontWeight: 'bold' }
});