import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';

// 👇👇 1. ตรวจสอบ Link Ngrok ให้ตรงกับ Backend
const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function ProductDetailScreen(props) {
    
    // รับค่าสินค้าอย่างปลอดภัย
    const product = props.product || props.route?.params?.product;
    // ดึง userId จากข้อมูลผู้ใช้ที่ส่งผ่านมาทาง props
    const userId = props.user?.id || props.user_id; 
    
    const [loading, setLoading] = useState(false);

    // 🛑 กัน Error กรณีไม่มีข้อมูลสินค้า
    if (!product) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ ไม่พบข้อมูลสินค้า</Text>
                    <TouchableOpacity style={styles.backLink} onPress={props.onBack}>
                        <Text style={styles.backLinkText}>กลับไปหน้าหลัก</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // 🛠️ ส่วนจัดการรูปภาพ
    let productImage = 'https://via.placeholder.com/400';
    if (product?.image_url) {
        productImage = product.image_url.startsWith('http') 
            ? product.image_url 
            : `${BASE_URL}/uploads/${product.image_url}`;
    }

    // 🛠️ ส่วนจัดการราคาและข้อมูล
    const rawPrice = product?.price_per_day || product?.price || 0;
    const depositPrice = product?.deposit || 0;
    const shippingFee = 50; // ✨ ค่าส่งคงที่ตามโจทย์
    const totalAmount = Number(rawPrice) + Number(depositPrice) + shippingFee; // ✨ ประกาศตัวแปรตรงนี้

    const displayPrice = Number(rawPrice).toLocaleString(undefined, {
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2
    });
    
    const productName = product?.name || product?.title || 'ไม่ระบุชื่อ';
    const productDesc = product?.description || '-';
    const ownerName = product?.owner_name || 'ไม่ระบุชื่อ';

    // 🚀 ฟังก์ชันกดเช่า
    const handleRent = async () => {
        if (!userId) {
            Alert.alert("แจ้งเตือน", "กรุณาล็อกอินก่อนทำการเช่า");
            return;
        }

        const userAddress = (props.user && props.user.address) ? props.user.address : "";
        if (!userAddress || userAddress.toString().trim() === "") { 
            Alert.alert(
                "ข้อมูลไม่ครบถ้วน",
                "กรุณากรอกที่อยู่จัดส่งในหน้าโปรไฟล์ของคุณก่อนทำการเช่า",
                [{ text: "ตกลง" }]
            );
            return;
        }

        setLoading(true);

        try {
            // ส่งไปจองในระบบก่อน
            const response = await fetch(`${BASE_URL}/create-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: product.id,
                    total_price: totalAmount, // เบื้องต้นส่งราคาเช่าไปก่อน
                })
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("จองสำเร็จ!", "กรุณาชำระเงินเพื่อยืนยันออเดอร์", [
                    { 
                        text: "ไปจ่ายเงิน", 
                        onPress: () => {
                            if (props.onGoToPayment) {
                                // ✨ ส่งข้อมูลสินค้าพร้อมค่ามัดจำและค่าส่งไปที่หน้าสรุปยอด
                                props.onGoToPayment(data.booking_id, {
                                    ...product,
                                    price_per_day: rawPrice,
                                    deposit: depositPrice,
                                    shipping_fee: shippingFee,
                                    totalAmount: totalAmount
                                });
                            }
                        }
                    }
                ]);
            } else {
                Alert.alert("เกิดข้อผิดพลาด", data.message || "ไม่สามารถทำรายการจองได้");
            }

        } catch (error) {
            console.error("Rent Error:", error);
            Alert.alert("Error", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={{flex: 1}}>
                
                {/* Header Bar */}
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={props.onBack}>
                        <Text style={styles.backButtonText}>← ย้อนกลับ</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Image 
                        source={{ uri: productImage }} 
                        style={styles.productImage} 
                        resizeMode="cover"
                    />

                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>{productName}</Text>
                        <Text style={styles.priceText}>{displayPrice} บาท / วัน</Text>
                        
                        {/* ✨ ส่วนแสดงค่าใช้จ่ายเพิ่มเติมที่เพิ่มใหม่ */}
                        <View style={styles.feeContainer}>
                            <Text style={styles.feeText}>💰 ค่ามัดจำ: {Number(depositPrice).toLocaleString()} บาท</Text>
                            <Text style={styles.feeText}>🚚 ค่าจัดส่ง: {shippingFee} บาท</Text>
                            <Text style={styles.noteText}>* ค่ามัดจำจะได้รับคืนหลังจากคืนสินค้าในสภาพสมบูรณ์</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>รายละเอียดสินค้า</Text>
                        <Text style={styles.descriptionText}>{productDesc}</Text>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>ข้อมูลผู้ปล่อยเช่า</Text>
                        <View style={styles.ownerCard}>
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerName}>{ownerName}</Text>
                                <Text style={styles.verifiedTag}>✅ ยืนยันตัวตนแล้ว</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footerContainer}>
                    <TouchableOpacity style={styles.chatButton} onPress={props.onChatPress}>
                        <Text style={styles.chatButtonText}>💬 ทักแชท</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.rentButton, loading && styles.buttonDisabled]}
                        onPress={handleRent}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.rentButtonText}>📅 ขอเช่าทันที</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    headerBar: { 
        padding: 15, 
        backgroundColor: '#fff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#f0f0f0',
        paddingTop: 10
    },
    backButtonText: { color: '#007AFF', fontSize: 18, fontWeight: '500' },
    scrollContent: { paddingBottom: 120 },
    productImage: { width: '100%', height: 350, backgroundColor: '#f9f9f9' },
    contentContainer: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    priceText: { fontSize: 22, fontWeight: 'bold', color: '#FF385C', marginBottom: 5 },
    
    // ✨ Styles ใหม่สำหรับค่าธรรมเนียม
    feeContainer: { backgroundColor: '#FFF5F7', padding: 12, borderRadius: 10, marginTop: 10 },
    feeText: { fontSize: 16, color: '#444', marginBottom: 4, fontWeight: '500' },
    noteText: { fontSize: 12, color: '#888', fontStyle: 'italic' },

    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
    descriptionText: { fontSize: 16, color: '#666', lineHeight: 24 },
    ownerCard: { 
        backgroundColor: '#f8f8f8', 
        padding: 15, 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: '#efefef' 
    },
    ownerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    verifiedTag: { color: '#4CAF50', fontSize: 13, marginTop: 4, fontWeight: '600' },
    footerContainer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: '#fff', 
        flexDirection: 'row', 
        padding: 15, 
        paddingBottom: 30, 
        borderTopWidth: 1, 
        borderTopColor: '#f0f0f0',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    chatButton: { 
        flex: 1, 
        backgroundColor: '#f0f0f0', 
        borderRadius: 10, 
        height: 50,
        marginRight: 10, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    chatButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
    rentButton: { 
        flex: 1.5, 
        backgroundColor: '#FF385C', 
        borderRadius: 10, 
        height: 50,
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    buttonDisabled: { opacity: 0.6, backgroundColor: '#ccc' },
    rentButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 18, color: '#666' },
    backLink: { marginTop: 15 },
    backLinkText: { color: '#FF385C', fontSize: 16, fontWeight: '600' }
});