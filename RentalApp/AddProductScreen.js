import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ⚠️ ใส่ลิงก์ Ngrok ของคุณที่นี่ (ไม่ต้องมี / ต่อท้าย)
const API_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function AddProductScreen({ user, onBack }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันเลือกรูป
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ฟังก์ชันส่งข้อมูลไป Server
  const handleSubmit = async () => {
    if (!name || !price || !image) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อ, ราคา และใส่รูปสินค้า");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('owner_id', user.id); // ส่ง ID คนโพสต์ไปด้วย

      // เตรียมไฟล์รูป
      const filename = image.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', { uri: image, name: filename, type });

      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("สำเร็จ", "ลงประกาศเรียบร้อยแล้ว! 🎉");
        onBack(); // กลับไปหน้าหลัก
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

      {/* เลือกรูปภาพ */}
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

      <Text style={styles.label}>ราคาเช่า (ต่อวัน)</Text>
      <TextInput 
        style={styles.input} 
        placeholder="เช่น 500" 
        value={price} 
        onChangeText={setPrice} 
        keyboardType="numeric" 
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ลงประกาศเลย 🚀</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>ยกเลิก</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', marginTop: 40 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  textArea: { height: 100, textAlignVertical: 'top' },
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: 200, borderRadius: 10 },
  placeholder: { width: '100%', height: 200, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#aaa' },
  placeholderText: { color: '#666', fontSize: 16 },
  button: { backgroundColor: '#FF385C', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#666', fontSize: 16 },
});