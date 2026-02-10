import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function AddProductScreen({ route, navigation, onBack }) {
  const user = route?.params?.user || {}; 
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState(''); // ✨ เพิ่ม State ค่ามัดจำ
  const [quantity, setQuantity] = useState('1'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // 🚩 เพิ่มการเช็ค 'deposit' ในเงื่อนไข
    if (!name || !price || !deposit || !image || !quantity) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงค่ามัดจำและรูปภาพ");
      return;
    }

    if (!user?.id) {
      Alert.alert("ผิดพลาด", "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('deposit', deposit); // ✨ ส่งค่ามัดจำไปที่ Server
      formData.append('owner_id', user.id); 
      formData.append('quantity', quantity);

      const filename = image.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', { uri: image, name: filename, type });

      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("สำเร็จ", "ลงประกาศเรียบร้อยแล้ว! 🎉");
        handleBack(); 
      } else {
        Alert.alert("ผิดพลาด", data.message || "อัปโหลดไม่สำเร็จ");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "เชื่อมต่อ Server ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📦 ลงประกาศปล่อยเช่า</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>+ เพิ่มรูปสินค้า</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>ชื่อสินค้า</Text>
      <TextInput style={styles.input} placeholder="เช่น กล้อง Canon, PS5" value={name} onChangeText={setName} />

      <Text style={styles.label}>รายละเอียด</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="สภาพสินค้า, อุปกรณ์ที่มีให้..." 
        value={description} 
        onChangeText={setDescription} 
        multiline 
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '48%' }}>
          <Text style={styles.label}>จำนวนที่มี</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>
        <View style={{ width: '48%' }}>
          <Text style={styles.label}>ค่าเช่า (ต่อวัน)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="500" 
            value={price} 
            onChangeText={setPrice} 
            keyboardType="numeric" 
          />
        </View>
      </View>

      {/* ✨ ช่องกรอกค่ามัดจำที่เพิ่มใหม่ */}
      <Text style={[styles.label, { color: '#FF385C' }]}>ค่ามัดจำสินค้า (บาท)</Text>
      <TextInput 
        style={[styles.input, { borderColor: '#FF385C', borderWidth: 1.5 }]} 
        placeholder="ระบุค่ามัดจำที่คนเช่าต้องจ่าย" 
        value={deposit} 
        onChangeText={setDeposit} 
        keyboardType="numeric" 
      />
      <Text style={{ fontSize: 12, color: '#888', marginTop: 5 }}>
        * ค่ามัดจำจะรวมอยู่ในยอดโอน และเจ้าของต้องคืนเมื่อได้รับสินค้าคืน
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ลงประกาศเลย 🚀</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>ยกเลิก</Text>
      </TouchableOpacity>
      
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', marginTop: 40 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  textArea: { height: 80, textAlignVertical: 'top' },
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: 200, borderRadius: 10 },
  placeholder: { width: '100%', height: 200, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#aaa' },
  placeholderText: { color: '#666', fontSize: 16 },
  button: { backgroundColor: '#FF385C', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#666', fontSize: 16 },
});