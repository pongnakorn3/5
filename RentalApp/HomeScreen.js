import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';

// 👇👇 แก้ Link Ngrok ให้เป็นปัจจุบันนะครับ
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

// ⚠️ เพิ่ม navigation เข้ามาใน props เพื่อให้กดเปลี่ยนหน้าได้
export default function HomeScreen({ navigation, onProductPress }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onProductPress(item)}
    >
      <View>
        <Image 
          source={{ uri: item.image_url ? `${API_URL}/uploads/${item.image_url}` : 'https://via.placeholder.com/150' }} 
          style={[styles.productImage, item.quantity <= 0 && styles.outOfStockImage]} 
        />
        {/* ป้ายแปะถ้าของหมด */}
        {item.quantity <= 0 && (
            <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>หมดแล้ว</Text>
            </View>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.productPrice}>{item.price_per_day} ฿/วัน</Text>
            {item.quantity > 0 && (
                <Text style={styles.quantityText}>เหลือ {item.quantity}</Text>
            )}
        </View>
        
        <View style={styles.ownerContainer}>
           <Image 
             source={{ uri: item.owner_pic || 'https://via.placeholder.com/30' }} 
             style={styles.ownerAvatar} 
           />
           <Text style={styles.ownerName} numberOfLines={1}>{item.owner_name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* 🟢 ส่วนหัว (Header) + ปุ่มไปหน้าจัดการร้าน */}
      <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>🛒 ตลาดเช่าของ</Text>
          
          <TouchableOpacity 
            style={styles.manageBtn}
            // 👉 กดตรงนี้เพื่อไปหน้า ManageBookingsScreen
            onPress={() => navigation.navigate('ManageBookings')} 
          >
             <Text style={styles.manageBtnText}>⚙️ จัดการร้าน</Text>
          </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF385C" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2} 
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีสินค้า ลงประกาศคนแรกเลย!</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 10, paddingTop: 50 },
  
  // 🟢 สไตล์ Header ใหม่ (จัดเรียงซ้ายขวา)
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  manageBtn: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  manageBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  row: { justifyContent: 'space-between' },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    overflow: 'hidden'
  },
  productImage: { width: '100%', height: 140, resizeMode: 'cover' },
  
  outOfStockImage: { opacity: 0.4 },
  outOfStockBadge: { 
    position: 'absolute', top: 50, left: 0, right: 0, 
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, alignItems: 'center' 
  },
  outOfStockText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  infoContainer: { padding: 10 },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  productPrice: { fontSize: 14, color: '#FF385C', fontWeight: 'bold', marginBottom: 5 },
  
  quantityText: { fontSize: 12, color: '#666', backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  ownerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 },
  ownerAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 5 },
  ownerName: { fontSize: 12, color: '#666', flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});