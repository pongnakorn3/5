import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Button } from 'react-native';

// 👇👇 ใส่ Link Ngrok ของคุณ
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function ProductDetailScreen({ product, onBack }) {
  if (!product) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔙 ปุ่มย้อนกลับ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>⬅ ย้อนกลับ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🖼️ รูปสินค้าขนาดใหญ่ */}
        <Image 
          source={{ uri: product.image_url ? `${API_URL}/uploads/${product.image_url}` : 'https://via.placeholder.com/400' }} 
          style={styles.image} 
        />

        {/* 📝 ข้อมูลสินค้า */}
        <View style={styles.infoContainer}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.price}>{product.price_per_day} บาท / วัน</Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>รายละเอียด</Text>
            <Text style={styles.description}>{product.description || "ไม่มีรายละเอียดเพิ่มเติม"}</Text>

            <View style={styles.divider} />

            {/* 👤 ข้อมูลคนปล่อยเช่า */}
            <Text style={styles.sectionTitle}>ผู้ปล่อยเช่า</Text>
            <View style={styles.ownerCard}>
                <Image 
                    source={{ uri: product.owner_pic || 'https://via.placeholder.com/50' }} 
                    style={styles.ownerImage} 
                />
                <View>
                    <Text style={styles.ownerName}>{product.owner_name}</Text>
                    <Text style={styles.ownerStatus}>✅ ยืนยันตัวตนแล้ว</Text>
                </View>
            </View>
        </View>
      </ScrollView>

      {/* 🦶 ปุ่ม Action ด้านล่าง (Fixed Bottom) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.chatButton} onPress={() => alert('ฟีเจอร์แชทกำลังมาเร็วๆนี้!')}>
            <Text style={styles.chatButtonText}>💬 ทักแชท</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.rentButton} onPress={() => alert('ระบบจองกำลังพัฒนา!')}>
            <Text style={styles.rentButtonText}>📅 ขอเช่าทันที</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { padding: 5 },
  backText: { fontSize: 16, color: '#007AFF' },
  
  scrollContent: { paddingBottom: 100 }, // เว้นที่ให้ปุ่มด้านล่าง
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  
  infoContainer: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  price: { fontSize: 20, color: '#FF385C', fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, color: '#555', lineHeight: 24 },

  ownerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10 },
  ownerImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  ownerName: { fontSize: 16, fontWeight: 'bold' },
  ownerStatus: { fontSize: 14, color: 'green', marginTop: 2 },

  bottomBar: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      flexDirection: 'row', padding: 15, backgroundColor: '#fff', 
      borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 
  },
  chatButton: { flex: 1, backgroundColor: '#eee', padding: 15, borderRadius: 10, marginRight: 10, alignItems: 'center' },
  chatButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rentButton: { flex: 2, backgroundColor: '#FF385C', padding: 15, borderRadius: 10, alignItems: 'center' },
  rentButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});