import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from './config';

export default function MyProductsScreen({ navigation, userId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลสินค้าเฉพาะของเรามาแสดง
  const fetchMyProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/products?owner_id=${userId}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  return (
    <View style={styles.container}>
      {/* 1️⃣ ปุ่มสำหรับ "ลงสินค้าใหม่" (วางไว้บนสุด เห็นชัดๆ) */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => navigation.navigate('EditProduct', { userId: userId })} 
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>ลงประกาศสินค้าใหม่</Text>
      </TouchableOpacity>

      <Text style={styles.title}>สินค้าของฉัน</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF385C" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Image 
                source={{ uri: `${BASE_URL}/uploads/${item.image_url}` }} 
                style={styles.productImage} 
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>{item.price_per_day} บาท/วัน</Text>
                
                {/* 2️⃣ ปุ่มสำหรับ "แก้ไขสินค้าเดิม" (แยกออกมาในแต่ละตัว) */}
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => navigation.navigate('EditProduct', { product: item, userId: userId })}
                >
                  <Ionicons name="pencil" size={16} color="#007AFF" />
                  <Text style={styles.editButtonText}>แก้ไขข้อมูล</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 15 },
  addButton: {
    backgroundColor: '#FF385C', // สีแดง สำหรับของใหม่
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 10,
    marginBottom: 15,
    elevation: 2
  },
  productImage: { width: 80, height: 80, borderRadius: 8 },
  productInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productPrice: { color: '#666', marginVertical: 4 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 5,
    width: 100,
    justifyContent: 'center'
  },
  editButtonText: { color: '#007AFF', fontSize: 14, marginLeft: 5 }
});