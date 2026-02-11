import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { BASE_URL } from './config'; 

export default function HomeScreen({ navigation, onProductPress, user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/products`);
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
    console.log("Current User:", user?.name || user?.email);
  }, [user]);

  // ✅ กรองสินค้าคนอื่น (เพื่อแสดงในตลาด)
  const otherProducts = products.filter(item => {
    if (!user || !item.owner_name) return true;
    const myName = (user.name || "").toString().trim().toLowerCase();
    const myEmail = (user.email || "").toString().trim().toLowerCase();
    const target = item.owner_name.toString().trim().toLowerCase();
    return target !== myName && target !== myEmail;
  });

  // ✅ กรองเฉพาะสินค้าของเราเอง (เพื่อใช้บอกจำนวนหรือแยกดู)
  const myProducts = products.filter(item => {
    if (!user || !item.owner_name) return false;
    const myName = (user.name || "").toString().trim().toLowerCase();
    const myEmail = (user.email || "").toString().trim().toLowerCase();
    const target = item.owner_name.toString().trim().toLowerCase();
    return target === myName || target === myEmail;
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onProductPress ? onProductPress(item) : navigation.navigate('ProductDetail', { product: item })}
    >
      <View>
        <Image 
          source={{ uri: item.image_url ? `${BASE_URL}/uploads/${item.image_url}` : 'https://via.placeholder.com/150' }} 
          style={[styles.productImage, item.quantity <= 0 && styles.outOfStockImage]} 
        />
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
          {item.quantity > 0 && <Text style={styles.quantityText}>เหลือ {item.quantity}</Text>}
        </View>
        <View style={styles.ownerContainer}>
          <Image source={{ uri: item.owner_pic || 'https://via.placeholder.com/30' }} style={styles.ownerAvatar} />
          <Text style={styles.ownerName} numberOfLines={1}>{item.owner_name || 'ไม่ระบุชื่อ'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 🟢 ส่วนหัว (Header) เพิ่มปุ่มสินค้าของฉัน */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>🛒 ตลาดเช่า</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* ✅ ปุ่มรายการสินค้าของฉัน */}
          <TouchableOpacity 
            style={[styles.manageBtn, { backgroundColor: '#FF385C' }]} 
            onPress={() => navigation.navigate('ManageBookings', { user: user, initialTab: 'products' })}
          >
            <Text style={styles.manageBtnText}>📦 ของฉัน ({myProducts.length})</Text>
          </TouchableOpacity>

          {/* ปุ่มจัดการร้านเดิม */}
          <TouchableOpacity 
            style={styles.manageBtn} 
            onPress={() => navigation.navigate('ManageBookings', { user: user, initialTab: 'bookings' })}
          >
            <Text style={styles.manageBtnText}>⚙️ จัดการ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF385C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={otherProducts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่พบสินค้าของคนอื่น</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 10, paddingTop: 50 },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
    paddingHorizontal: 5 
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  manageBtn: { 
    backgroundColor: '#333', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  manageBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  row: { justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, elevation: 3, overflow: 'hidden' },
  productImage: { width: '100%', height: 140, resizeMode: 'cover' },
  outOfStockImage: { opacity: 0.4 },
  outOfStockBadge: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, alignItems: 'center' },
  outOfStockText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoContainer: { padding: 10 },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  productPrice: { fontSize: 14, color: '#FF385C', fontWeight: 'bold', marginBottom: 5 },
  quantityText: { fontSize: 12, color: '#666', backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ownerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 },
  ownerAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 5 },
  ownerName: { fontSize: 12, color: '#666', flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});