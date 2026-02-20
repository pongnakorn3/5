import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

export default function ProfileScreen({ route, navigation }) {
    // ดึงข้อมูล user จาก params
    const { user } = route?.params || {}; 

    // 📍 ฟังก์ชันสำหรับกดไปหน้าแก้ไขที่อยู่
    const handleEditAddress = () => {
        if (!user?.id) {
            Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้");
            return;
        }
        navigation.navigate('EditAddress', { userId: user.id, currentAddress: user.address });
    };

    // 🛒 ฟังก์ชันไปหน้าลงประกาศสินค้าใหม่
    const handleAddProduct = () => {
        if (!user?.id) {
            Alert.alert("Error", "กรุณาเข้าสู่ระบบใหม่");
            return;
        }
        // ✅ ส่งข้อมูล user ไปให้หน้า AddProduct
        navigation.navigate('AddProduct', { user: user });
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* --- Profile Header --- */}
            <View style={styles.header}>
                <Image 
                    source={{ uri: user?.profile_picture || 'https://via.placeholder.com/150' }} 
                    style={styles.avatar} 
                />
                <Text style={styles.name}>{user?.full_name || "ไม่ระบุชื่อ"}</Text>
                <Text style={styles.email}>{user?.email || "ไม่มีอีเมล"}</Text>
                
                <TouchableOpacity style={styles.addressContainer} onPress={handleEditAddress}>
                    <Ionicons name="location-sharp" size={16} color="#FF385C" />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {user?.address && user.address !== "" ? user.address : "ยังไม่ได้ระบุที่อยู่จัดส่ง (แตะเพื่อเพิ่ม)"}
                    </Text>
                    <Ionicons name="pencil-outline" size={14} color="#9ca3af" style={{marginLeft: 5}} />
                </TouchableOpacity>

                <View style={[styles.badge, { backgroundColor: user?.kyc_status === 'approved' ? '#d1fae5' : '#fee2e2' }]}>
                    <Text style={{ color: user?.kyc_status === 'approved' ? '#065f46' : '#991b1b', fontWeight: 'bold', fontSize: 12 }}>
                        {user?.kyc_status === 'approved' ? '✅ ยืนยันตัวตนแล้ว' : '⚠️ ยังไม่ยืนยันตัวตน'}
                    </Text>
                </View>
            </View>

            {/* --- Menu Section --- */}
            <View style={styles.menuContainer}>
                <Text style={styles.sectionTitle}>การจัดการร้านค้า</Text>

                {/* ✅ เมนูลงสินค้าใหม่ (ปรับให้เด่นขึ้น) */}
                <TouchableOpacity style={[styles.menuItem, { borderLeftWidth: 4, borderLeftColor: '#FF385C' }]} onPress={handleAddProduct}>
                    <View style={styles.iconBox}><Ionicons name="add-circle" size={26} color="#FF385C" /></View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.menuText, { color: '#FF385C' }]}>ลงประกาศสินค้าใหม่</Text>
                        <Text style={styles.subText}>สร้างรายได้จากการเพิ่มสินค้าในระบบ</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>เมนูทั่วไป</Text>

                {/* รายการเช่า */}
                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('myBookings', { userId: user.id })}>
                    <View style={styles.iconBox}><Ionicons name="cube-outline" size={24} color="#4B5563" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.menuText}>รายการเช่าของฉัน</Text>
                        <Text style={styles.subText}>ดูสถานะสินค้าที่คุณปล่อยเช่าและเช่ามา</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                {/* แก้ไขที่อยู่ */}
                <TouchableOpacity style={styles.menuItem} onPress={handleEditAddress}>
                    <View style={styles.iconBox}><Ionicons name="home-outline" size={24} color="#4B5563" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.menuText}>แก้ไขที่อยู่จัดส่ง</Text>
                        <Text style={styles.subText}>ระบุที่อยู่จัดส่งและที่อยู่รับของคืน</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                {/* เมนูยืนยันตัวตน */}
                {user?.kyc_status !== 'approved' && (
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('KYC', { userId: user.id })}>
                        <View style={styles.iconBox}><Ionicons name="id-card-outline" size={24} color="#4B5563" /></View>
                        <View style={{flex: 1}}>
                            <Text style={styles.menuText}>ยืนยันตัวตน (KYC)</Text>
                            <Text style={styles.subText}>เพิ่มความน่าเชื่อถือในการปล่อยเช่า</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                )}

                <View style={styles.divider} />
                
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 ออกจากระบบ</Text>
                </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { 
        backgroundColor: '#fff', 
        alignItems: 'center', 
        paddingTop: 40,
        paddingBottom: 30, 
        borderBottomLeftRadius: 30, 
        borderBottomRightRadius: 30, 
        marginBottom: 20, 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: { width: 110, height: 110, borderRadius: 55, marginBottom: 12, borderWidth: 4, borderColor: '#FF385C' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
    email: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
    addressContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f9fafb', 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 20, 
        marginBottom: 10, 
        borderWidth: 1, 
        borderColor: '#eee',
        maxWidth: '80%'
    },
    addressText: { fontSize: 13, color: '#4b5563', marginLeft: 5, flexShrink: 1 },
    badge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 5 },
    menuContainer: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#9ca3af', marginBottom: 12, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { 
        backgroundColor: '#fff', 
        padding: 16, 
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12, 
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    iconBox: { width: 45, height: 45, backgroundColor: '#f9fafb', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    subText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 15 },
    logoutButton: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EF4444', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 18, color: '#4b5563', textAlign: 'center', marginTop: 20, marginBottom: 20 },
    loginReturnButton: { backgroundColor: '#FF385C', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
    loginReturnText: { color: '#fff', fontWeight: 'bold' }
});