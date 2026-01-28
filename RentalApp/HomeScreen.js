import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';

// 👇👇 Link Ngrok ของคุณ
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

// ✅ เพิ่ม prop: onProductPress เข้ามา
export default function HomeScreen({ onProductPress }) {
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
    // ✅ เพิ่ม onPress ให้ส่ง item กลับไป
    <TouchableOpacity style={styles.card} onPress={() => onProductPress(item)}>
      <Image 
        source={{ uri: item.image_url ? `${API_URL}/uploads/${item.image_url}` : 'https://via.placeholder.com/150' }} 
        style={styles.productImage} 
      />
      
      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price_per_day} บาท/วัน</Text>
        
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
      <Text style={styles.header}>🛒 ตลาดเช่าของ</Text>
      
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
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
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
  infoContainer: { padding: 10 },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  productPrice: { fontSize: 14, color: '#FF385C', fontWeight: 'bold', marginBottom: 10 },
  ownerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 },
  ownerAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 5 },
  ownerName: { fontSize: 12, color: '#666', flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});