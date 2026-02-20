import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, 
  StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from './config'; 

export default function AddProductScreen({ route, navigation }) {
  const userId = route?.params?.userId;


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [quantity, setQuantity] = useState('1'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันเลือกรูปภาพ
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

  // ฟังก์ชันบันทึก (ลงประกาศ)
  const handleSave = async () => {
    if (!name || !price || !image || !quantity) {
        Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
    }

    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price_per_day', Number(price));
        formData.append('deposit', deposit || '0');
        formData.append('quantity', quantity);
        formData.append('status', 'available');

        if (userId) {
            formData.append('owner_id', userId.toString());
        }

        // จัดการรูปภาพเพื่อส่งเข้า FormData
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('image', { uri: image, name: filename, type });

        const response = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (result.success || result.id) {
            Alert.alert('สำเร็จ', 'ลงประกาศสินค้าเรียบร้อยแล้ว');
            navigation.goBack(); // กลับไปหน้าก่อนหน้า
        } else {
            Alert.alert('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกได้');
        }
    } catch (error) {
        console.error(error);
        Alert.alert('Error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ลงประกาศสินค้าใหม่</Text>
          <View style={{width: 40}} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* เลือกรูปภาพ */}
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.imagePreview} />
                ) : (
                    <View style={{alignItems:'center'}}>
                        <Ionicons name="camera-outline" size={50} color="#ccc" />
                        <Text style={styles.imagePickerText}>คลิกเพื่อเลือกรูปภาพสินค้า</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.label}>ชื่อสินค้า *</Text>
            <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="เช่น กล้อง Sony A7IV" 
            />

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>ราคาเช่า/วัน *</Text>
                    <TextInput 
                        style={styles.input} 
                        value={price} 
                        onChangeText={setPrice} 
                        placeholder="0" 
                        keyboardType="numeric"
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>จำนวนชิ้น *</Text>
                    <TextInput 
                        style={styles.input} 
                        value={quantity} 
                        onChangeText={setQuantity} 
                        placeholder="1" 
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <Text style={styles.label}>ค่ามัดจำสินค้า (บาท)</Text>
            <TextInput 
                style={styles.input} 
                value={deposit} 
                onChangeText={setDeposit} 
                placeholder="ระบุค่ามัดจำ (ถ้ามี)" 
                keyboardType="numeric"
            />

            <Text style={styles.label}>รายละเอียดเพิ่มเติม</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="อธิบายสภาพสินค้า..." 
                multiline
            />

            <TouchableOpacity 
                style={[styles.saveButton, loading && { backgroundColor: '#ccc' }]} 
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <View style={styles.buttonContent}>
                        <Ionicons name="add-circle-outline" size={22} color="#fff" />
                        <Text style={styles.saveButtonText}>ยืนยันลงประกาศ</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>

            <View style={{height: 50}} />
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 40 // ปรับตามความเหมาะสมของ SafeArea
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 20 },
  imagePicker: {
    width: '100%',
    height: 220,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed'
  },
  imagePickerText: { color: '#adb5bd', marginTop: 10, fontSize: 14 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 15, resizeMode: 'cover' },
  label: { fontSize: 15, marginBottom: 8, fontWeight: '600', color: '#495057' },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: '#fff'
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FF385C'
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  cancelButton: { marginTop: 20, alignItems:'center' },
  cancelButtonText: { color: '#adb5bd', fontSize: 15 }
});