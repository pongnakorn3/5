import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { BASE_URL } from './config';

export default function ProductDetailScreen({ route, navigation, user, onBack, onChatPress, onGoToCart, onGoToPayment }) {
    const product = route?.params?.product;
    const userId = user?.id;

    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDates, setSelectedDates] = useState({});
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [rentalDays, setRentalDays] = useState(1);
    const [loading, setLoading] = useState(false);

    if (!product) return null;

    const imageName = product?.image_url || product?.image;
    const productImage = imageName 
        ? (imageName.startsWith('http') ? imageName : `${BASE_URL}/uploads/${imageName}`)
        : 'https://via.placeholder.com/400';

    const basePrice = Number(product?.price_per_day || product?.price || 0);
    const depositPrice = Number(product?.deposit || 0);
    const shippingFee = 50;

    const getTieredRate = (days) => {
        if (days >= 8) return basePrice * 0.8;
        if (days >= 4) return basePrice * 0.9;
        return basePrice;
    };

    const activeRate = getTieredRate(rentalDays);
    const totalRentalFee = activeRate * rentalDays;
    const totalAmount = totalRentalFee + depositPrice + shippingFee;

    const onDayPress = (day) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day.dateString);
            setEndDate('');
            setSelectedDates({ 
                [day.dateString]: { selected: true, startingDay: true, color: '#FF385C', textColor: 'white' } 
            });
            setRentalDays(1);
        } else {
            let start = new Date(startDate);
            let end = new Date(day.dateString);
            if (end < start) {
                setStartDate(day.dateString);
                setEndDate('');
                setSelectedDates({ [day.dateString]: { selected: true, startingDay: true, color: '#FF385C', textColor: 'white' } });
                setRentalDays(1);
                return;
            }
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setRentalDays(diffDays);
            setEndDate(day.dateString);
            let range = {};
            for (let i = 0; i < diffDays; i++) {
                let d = new Date(start);
                d.setDate(d.getDate() + i);
                let str = d.toISOString().split('T')[0];
                range[str] = { selected: true, color: '#FF385C', textColor: 'white', startingDay: i === 0, endingDay: i === diffDays - 1 };
            }
            setSelectedDates(range);
        }
    };

    const addToCart = async () => {
        if (!userId) return Alert.alert("แจ้งเตือน", "กรุณาล็อกอินก่อนใช้งาน");
        if (Number(userId) === Number(product.owner_id)) return Alert.alert("เตือน", "เช่าของตัวเองไม่ได้");
        if (!startDate || !endDate) return setShowCalendar(true);

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, product_id: product.id, owner_id: product.owner_id,
                    start_date: startDate, end_date: endDate, days: rentalDays,
                    rental_fee: totalRentalFee, deposit_fee: depositPrice,
                    shipping_fee: shippingFee, total_price: totalAmount 
                })
            });
            const data = await response.json();
            if (data.success) {
                Alert.alert("สำเร็จ", "เพิ่มลงตะกร้าแล้ว", [
                    { text: "เลือกต่อ", style: "cancel" },
                    { text: "ดูตะกร้า", onPress: () => onGoToCart && onGoToCart() }
                ]);
            }
        } catch (error) { Alert.alert("Error", "เชื่อมต่อไม่ได้"); }
        finally { setLoading(false); }
    };

    const handleRent = async () => {
        if (!userId) return Alert.alert("แจ้งเตือน", "กรุณาล็อกอินก่อน");
        if (Number(userId) === Number(product.owner_id)) return Alert.alert("เตือน", "เช่าของตัวเองไม่ได้");
        if (!startDate || !endDate) return setShowCalendar(true);
        if (!user?.address) return Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกที่อยู่ในโปรไฟล์ก่อน");

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/create-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, product_id: product.id, total_price: totalAmount,
                    start_date: startDate, end_date: endDate, days: rentalDays
                })
            });
            const data = await response.json();
            if (data.success && onGoToPayment) {
                onGoToPayment(data.booking_id, { ...product, totalAmount, rentalDays, startDate, endDate });
            }
        } catch (error) { Alert.alert("Error", "เชื่อมต่อไม่ได้"); }
        finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={{flex: 1}}>
                <TouchableOpacity onPress={onBack} style={styles.floatingBackButton}>
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>

                {/* ✨ เพิ่มปุ่มแก้ไข (Edit) ตรงนี้ */}
{Number(userId) === Number(product.owner_id) && (
    <TouchableOpacity 
        style={styles.floatingEditButton} 
        onPress={() => navigation.navigate('EditProduct', { product: product, userId: userId })}
    >
        <Ionicons name="pencil" size={24} color="#007AFF" />
    </TouchableOpacity>
)}

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="cover" />
                    
                    <View style={styles.contentContainer}>
                        <View style={styles.headerInfo}>
                            <Text style={styles.title}>{product?.name || 'สินค้า'}</Text>
                            <View style={styles.stockBadge}>
                                <Text style={styles.stockText}>คงเหลือ {product?.quantity || 1} ชิ้น</Text>
                            </View>
                        </View>

                        <View style={styles.priceTierCard}>
                            <Text style={styles.priceText}>{activeRate.toLocaleString()} บาท/วัน</Text>
                            {rentalDays >= 4 ? (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>ประหยัดเพิ่ม!</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* ✨ ส่วนรายละเอียดสินค้าที่เพิ่มเข้ามา */}
                        <View style={styles.descriptionBox}>
                            <Text style={styles.sectionTitle}>รายละเอียดสินค้า</Text>
                            <Text style={styles.descriptionText}>
                                {product?.description || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับสินค้านี้'}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowCalendar(true)}>
                            <Ionicons name="calendar-outline" size={20} color="#FF385C" />
                            <Text style={styles.dateSelectorText}>
                                {startDate ? `${startDate} ถึง ${endDate || '...'}` : 'เลือกวันที่ต้องการเช่า'}
                            </Text>
                            <View style={styles.daysBadge}>
                                <Text style={styles.daysBadgeText}>{rentalDays} วัน</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.feeContainer}>
                            <View style={styles.feeRow}>
                                <Text style={styles.feeLabel}>ค่าเช่า ({rentalDays} วัน)</Text>
                                <Text>{totalRentalFee.toLocaleString()}.-</Text>
                            </View>
                            <View style={styles.feeRow}>
                                <Text style={styles.feeLabel}>มัดจำ + ค่าส่ง</Text>
                                <Text>{(depositPrice + shippingFee).toLocaleString()}.-</Text>
                            </View>
                            <View style={styles.totalDivider} />
                            <View style={styles.feeRow}>
                                <Text style={styles.totalLabel}>รวมยอดสุทธิ</Text>
                                <Text style={styles.totalValue}>{totalAmount.toLocaleString()}.-</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <Modal visible={showCalendar} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.modalTitle}>เลือกวันเช่าสินค้า</Text>
                            <Calendar 
                                markingType={'period'} markedDates={selectedDates} onDayPress={onDayPress} 
                                minDate={new Date().toISOString().split('T')[0]} 
                                theme={{ selectedDayBackgroundColor: '#FF385C', todayTextColor: '#FF385C', arrowColor: '#FF385C' }}
                            />
                            <TouchableOpacity 
                                style={[styles.closeModalBtn, { backgroundColor: startDate && endDate ? '#FF385C' : '#666' }]} 
                                onPress={() => (startDate && endDate) ? setShowCalendar(false) : Alert.alert("แจ้งเตือน", "กรุณาเลือกวันสิ้นสุด")}
                            >
                                <Text style={styles.closeModalText}>ยืนยันวันที่เลือก</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.footerContainer}>
                    <TouchableOpacity style={styles.chatButton} onPress={onChatPress}><Ionicons name="chatbubble-ellipses-outline" size={24} color="#444" /></TouchableOpacity>
                    <TouchableOpacity style={styles.cartButton} onPress={addToCart}><Ionicons name="cart-outline" size={24} color="#FF385C" /></TouchableOpacity>
                    <TouchableOpacity style={styles.rentButton} onPress={handleRent}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.rentButtonText}>เช่าทันที</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    floatingBackButton: { position: 'absolute', top: 40, left: 20, zIndex: 99, backgroundColor: '#fff', padding: 8, borderRadius: 25, elevation: 5 },
    floatingEditButton: { 
        position: 'absolute', 
        top: 40, 
        right: 20, 
        zIndex: 99, 
        backgroundColor: '#fff', 
        padding: 8, 
        borderRadius: 25, 
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee'
    },
    scrollContent: { paddingBottom: 120 },
    productImage: { width: '100%', height: 350, backgroundColor: '#f0f0f0' },
    contentContainer: { padding: 20 },
    headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 24, fontWeight: 'bold', flex: 1, color: '#333' },
    stockBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
    stockText: { fontSize: 12, color: '#666', fontWeight: '600' },
    priceTierCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
    priceText: { fontSize: 22, color: '#FF385C', fontWeight: 'bold' },
    discountBadge: { backgroundColor: '#4CAF50', marginLeft: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
    discountText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    descriptionBox: { marginVertical: 15, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 12 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, color: '#444' },
    descriptionText: { fontSize: 15, color: '#666', lineHeight: 22 },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    dateSelectorText: { flex: 1, marginLeft: 10, color: '#333', fontSize: 15 },
    daysBadge: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
    daysBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    feeContainer: { backgroundColor: '#fff', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#eee', elevation: 1 },
    feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    feeLabel: { color: '#777', fontSize: 15 },
    totalDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
    totalLabel: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#FF385C' },
    footerContainer: { position: 'absolute', bottom: 0, left:0, right:0, flexDirection: 'row', padding: 15, paddingBottom: 30, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10 },
    chatButton: { width: 55, height: 50, backgroundColor: '#f3f4f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cartButton: { width: 55, height: 50, borderWidth: 1, borderColor: '#FF385C', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rentButton: { flex: 1, backgroundColor: '#FF385C', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    rentButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    calendarContainer: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
    closeModalBtn: { padding: 16, borderRadius: 12, marginTop: 15 },
    closeModalText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
    
});