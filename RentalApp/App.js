import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useURL } from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';

// ✅ Import หน้าจอใหม่เข้ามา
import AddProductScreen from './AddProductScreen';
import HomeScreen from './HomeScreen'; 
import ProductDetailScreen from './ProductDetailScreen'; // ✅ เพิ่มหน้า Detail

// ⚠️⚠️⚠️ สำคัญ: เปลี่ยนเป็น Link Ngrok ล่าสุดของคุณทุกครั้งที่รันใหม่ ⚠️⚠️⚠️
const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const url = useURL();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 🟢 State ควบคุมหน้าจอ Login/Register
  const [mode, setMode] = useState('login'); 
  
  // 🟢 State ควบคุม Tab ด้านล่าง (Market vs Profile)
  const [activeTab, setActiveTab] = useState('market'); 

  // 📦 State สำหรับหน้าสินค้า (Overlay)
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'addProduct', 'productDetail'
  const [selectedProduct, setSelectedProduct] = useState(null); // ✅ เก็บสินค้าที่ถูกกดเลือก
  
  const [isOtpStep, setIsOtpStep] = useState(false);

  // 📝 ข้อมูล Form ทั่วไป
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // 📷 ข้อมูล KYC (รูป + เลขบัตร)
  const [idCardImage, setIdCardImage] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [idNumber, setIdNumber] = useState('');

  // เช็ค Social Login Callback
  useEffect(() => {
    if (url) {
      const { queryParams } = WebBrowser.maybeCompleteAuthSession();
      if (queryParams?.data) {
        const data = JSON.parse(decodeURIComponent(queryParams.data));
        handleLoginSuccess(data);
      }
    }
  }, [url]);

  // ✅ ฟังก์ชันจัดการหลัง Login สำเร็จ
  const handleLoginSuccess = (user) => {
      console.log("User Status:", user.kyc_status);
      setUserData(user);
      setMode('main_app'); 
      setActiveTab('market'); 
  };

  const handleSocialLogin = async (provider) => {
    const authUrl = `${BASE_URL}/auth/${provider}`;
    await WebBrowser.openAuthSessionAsync(authUrl);
  };

  // -------------------------
  // 📸 ฟังก์ชันถ่ายรูป KYC
  // -------------------------
  const pickImage = async (setImageFunc) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('ขออภัย', 'ต้องอนุญาตให้ใช้กล้องเพื่อถ่ายรูปยืนยันตัวตน');
        return;
    }

    let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,    
        quality: 0.5,            
    });

    if (!result.canceled) {
        setImageFunc(result.assets[0].uri);
    }
  };

  // 📤 ฟังก์ชันส่งข้อมูล KYC
  const handleKycSubmit = async () => {
    if (!idCardImage || !faceImage || !idNumber) {
        Alert.alert("ข้อมูลไม่ครบ", "กรุณาถ่ายรูปให้ครบ 2 รูป และกรอกเลขบัตรประชาชน");
        return;
    }

    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('user_id', userData.id);
        formData.append('id_card_number', idNumber);
        
        const getFileName = (uri) => uri.split('/').pop();
        formData.append('id_card_image', { uri: idCardImage, type: 'image/jpeg', name: getFileName(idCardImage) });
        formData.append('face_image', { uri: faceImage, type: 'image/jpeg', name: getFileName(faceImage) });

        const response = await fetch(`${BASE_URL}/kyc/submit`, {
            method: 'POST',
            headers: { 'ngrok-skip-browser-warning': 'true' },
            body: formData,
        });

        const json = await response.json();
        if (json.success) {
            Alert.alert("สำเร็จ!", "ส่งข้อมูลเรียบร้อย รอแอดมินตรวจสอบ");
            setUserData(json.data); 
            setMode('main_app'); 
            setActiveTab('profile'); 
        } else {
            Alert.alert("ผิดพลาด", json.message);
        }

    } catch (error) {
        Alert.alert("Error", "ส่งข้อมูลไม่สำเร็จ");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  // -------------------------
  // Auth Functions
  // -------------------------
  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone) { Alert.alert("แจ้งเตือน", "กรอกให้ครบ"); return; }
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'},
        body: JSON.stringify({ email, password, full_name: fullName, phone }),
      });
      const json = await res.json();
      if (json.success) {
         Alert.alert("สำเร็จ", "ส่ง OTP แล้ว (ดูใน Server Console)");
         setIsOtpStep(true);
      } else { Alert.alert("ผิดพลาด", json.message); }
    } catch (e) { Alert.alert("Error", "เชื่อมต่อไม่ได้"); }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, otp }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("สำเร็จ!", "กรุณาล็อกอินเพื่อยืนยันตัวตนต่อ");
        setIsOtpStep(false);
        setMode('login');
        setFullName(''); setPassword(''); setPhone(''); setOtp('');
      } else { Alert.alert("ผิดพลาด", json.message); }
    } catch (e) { Alert.alert("Error", "Server Error"); }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) { Alert.alert("แจ้งเตือน", "กรอกอีเมล/รหัสผ่าน"); return; }
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        handleLoginSuccess(json.user);
      } else { Alert.alert("เข้าระบบไม่สำเร็จ", json.message); }
    } catch (e) { Alert.alert("Error", "เชื่อมต่อไม่ได้"); }
  };

  const handleLogout = () => {
    setUserData(null);
    setEmail(''); setPassword(''); 
    setMode('login');
    setCurrentScreen('home'); 
    setActiveTab('market');
  };

  // ==========================================
  // 🖥️ ส่วนแสดงผลหน้าจอ (UI)
  // ==========================================

  // 0️⃣ หน้าจอเพิ่มสินค้า (Add Product)
  if (userData && currentScreen === 'addProduct') {
    return (
        <AddProductScreen 
            user={userData} 
            onBack={() => setCurrentScreen('home')} 
        />
    );
  }

  // 🆕 หน้า Product Detail (รายละเอียดสินค้า) ✅
  if (userData && currentScreen === 'productDetail' && selectedProduct) {
      return (
          <ProductDetailScreen 
              product={selectedProduct} 
              onBack={() => {
                  setSelectedProduct(null);
                  setCurrentScreen('home');
              }} 
          />
      );
  }

  // 1️⃣ หน้า Main App (เมื่อ Login แล้ว)
  if (userData && (mode === 'main_app' || mode === 'view_profile')) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff'}}>
          
          {/* ส่วนเนื้อหาหลัก (เปลี่ยนตาม Tab) */}
          <View style={{flex: 1}}>
              {activeTab === 'market' ? (
                  // 🛒 TAB 1: ตลาดสินค้า (HomeScreen)
                  <HomeScreen 
                      onProductPress={(item) => {
                          setSelectedProduct(item); // ✅ 1. เก็บสินค้าที่กด
                          setCurrentScreen('productDetail'); // ✅ 2. เปลี่ยนหน้าไป Detail
                      }} 
                  />
              ) : (
                  // 👤 TAB 2: โปรไฟล์
                  <ScrollView contentContainerStyle={styles.container}>
                      <Image source={{ uri: userData.profile_picture || 'https://via.placeholder.com/150' }} style={styles.profilePic} />
                      <Text style={styles.title}>สวัสดี, {userData.full_name}</Text>
                      <Text style={{color: '#666', marginBottom: 20}}>Email: {userData.email}</Text>
                      
                      {/* สถานะ KYC */}
                      <View style={{width: '100%', marginBottom: 30}}>
                          {userData.kyc_status === 'approved' ? (
                              <View>
                                  <View style={styles.verifiedBox}>
                                      <Text style={styles.verifiedText}>สถานะ: ✅ ยืนยันตัวตนแล้ว</Text>
                                  </View>
                                  <TouchableOpacity 
                                        style={styles.addProductButton}
                                        onPress={() => setCurrentScreen('addProduct')}
                                  >
                                        <Text style={styles.addProductText}>+ ปล่อยเช่าของ</Text>
                                  </TouchableOpacity>
                              </View>
                          ) : userData.kyc_status === 'pending_approval' ? (
                              <View style={styles.pendingBox}>
                                  <Text style={styles.pendingText}>สถานะ: ⏳ กำลังรอแอดมินตรวจสอบ</Text>
                              </View>
                          ) : (
                              <TouchableOpacity 
                                  style={styles.kycButton}
                                  onPress={() => setMode('kyc')} 
                              >
                                  <Text style={styles.kycButtonText}>📸 ยืนยันตัวตนด้วยบัตรประชาชน</Text>
                                  <Text style={{color: '#fee2e2', fontSize: 12}}>(คลิกเพื่อเริ่มใช้งาน)</Text>
                              </TouchableOpacity>
                          )}
                      </View>

                      <Button title="ออกจากระบบ" onPress={handleLogout} color="red" />
                  </ScrollView>
              )}
          </View>

          {/* 🦶 Bottom Navigation Bar */}
          <View style={styles.bottomBar}>
              <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'market' && styles.activeTab]} 
                  onPress={() => setActiveTab('market')}
              >
                  <Text style={{fontSize: 24}}>🏠</Text>
                  <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>ตลาดเช่า</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'profile' && styles.activeTab]} 
                  onPress={() => setActiveTab('profile')}
              >
                  <Text style={{fontSize: 24}}>👤</Text>
                  <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>โปรไฟล์</Text>
              </TouchableOpacity>
          </View>

      </View>
    );
  }

  // 2️⃣ หน้า KYC
  if (userData && mode === 'kyc') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.header}>ยืนยันตัวตน (KYC) 📷</Text>
            
            <View style={styles.card}>
                <Text style={styles.label}>1. ถ่ายรูปบัตรประชาชน</Text>
                <TouchableOpacity style={styles.imageBox} onPress={() => pickImage(setIdCardImage)}>
                    {idCardImage ? (
                        <Image source={{ uri: idCardImage }} style={styles.preview} />
                    ) : (
                        <View style={{alignItems:'center'}}><Text style={{fontSize:40}}>📷</Text><Text>แตะเพื่อถ่ายรูปบัตร</Text></View>
                    )}
                </TouchableOpacity>

                <Text style={styles.label}>เลขบัตรประชาชน (13 หลัก)</Text>
                <TextInput 
                    style={styles.input}
                    placeholder="กรอกเลขบัตรประชาชน"
                    value={idNumber}
                    onChangeText={setIdNumber}
                    keyboardType="number-pad"
                    maxLength={13}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>2. ถ่ายรูปหน้าตัวเอง (Selfie)</Text>
                <TouchableOpacity style={styles.imageBox} onPress={() => pickImage(setFaceImage)}>
                    {faceImage ? (
                        <Image source={{ uri: faceImage }} style={styles.preview} />
                    ) : (
                        <View style={{alignItems:'center'}}><Text style={{fontSize:40}}>🤳</Text><Text>แตะเพื่อถ่ายรูปหน้า</Text></View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.btn, loading && { opacity: 0.7 }]} 
                onPress={handleKycSubmit}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ส่งข้อมูลยืนยันตัวตน</Text>}
            </TouchableOpacity>
            
            <View style={{marginTop: 20}}>
                <Button title="ย้อนกลับ" onPress={() => {
                    setMode('main_app');
                    setActiveTab('profile');
                }} color="gray" />
            </View>
        </ScrollView>
      );
  }

  // 3️⃣ หน้า Login / Register / OTP
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.header}>Product Rental App 🚜</Text>
      <View style={styles.card}>
        {isOtpStep ? (
            <>
                <Text style={styles.cardTitle}>ยืนยันรหัส OTP</Text>
                <Text style={{textAlign:'center', color:'#666', marginBottom:10}}>ส่งไปที่ {phone}</Text>
                <TextInput style={[styles.input, {textAlign:'center', fontSize:24, letterSpacing:5}]} 
                           placeholder="XXXXXX" keyboardType="number-pad" maxLength={6}
                           value={otp} onChangeText={setOtp} />
                <Button title="ยืนยัน OTP" onPress={handleVerifyOtp} color="#28a745" />
                <TouchableOpacity onPress={() => setIsOtpStep(false)} style={{marginTop:15}}>
                    <Text style={styles.switchText}>แก้ไขเบอร์โทร</Text>
                </TouchableOpacity>
            </>
        ) : (
            <>
                <Text style={styles.cardTitle}>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Text>
                {mode === 'register' && (
                <>
                    <TextInput style={styles.input} placeholder="ชื่อ-นามสกุล" value={fullName} onChangeText={setFullName} />
                    <TextInput style={styles.input} placeholder="เบอร์โทรศัพท์" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                </>
                )}
                <TextInput style={styles.input} placeholder="อีเมล" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <TextInput style={styles.input} placeholder="รหัสผ่าน" secureTextEntry value={password} onChangeText={setPassword} />

                <Button title={mode === 'login' ? "เข้าสู่ระบบ" : "ยืนยันการสมัคร"} 
                        onPress={mode === 'login' ? handleEmailLogin : handleRegister} />

                <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                    <Text style={styles.switchText}>{mode === 'login' ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}</Text>
                </TouchableOpacity>
            </>
        )}
      </View>

      {!isOtpStep && (
        <>
            <Text style={{textAlign: 'center', marginVertical: 10, color: '#888'}}>-- หรือล็อกอินด้วย --</Text>
            <View style={styles.socialContainer}>
                <View style={styles.btnWrapper}><Button title="Google" onPress={() => handleSocialLogin('google')} color="#DB4437" /></View>
                <View style={styles.btnWrapper}><Button title="Facebook" onPress={() => handleSocialLogin('facebook')} color="#4267B2" /></View>
                <View style={styles.btnWrapper}><Button title="Line" onPress={() => handleSocialLogin('line')} color="#00C300" /></View>
            </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  container: { flex: 1, alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: '#fff' },
  switchText: { marginTop: 15, color: '#007AFF', textAlign: 'center' },
  socialContainer: { gap: 10 },
  btnWrapper: { marginBottom: 10 },
  
  // KYC & Status
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
  imageBox: { height: 180, backgroundColor: '#E8E8E8', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', overflow: 'hidden' },
  preview: { width: '100%', height: '100%', resizeMode: 'contain' },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  verifiedBox: { backgroundColor: '#d1fae5', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#34d399', alignItems: 'center', width: '100%', marginBottom: 15 },
  verifiedText: { color: '#065f46', fontWeight: 'bold', fontSize: 16 },
  
  pendingBox: { backgroundColor: '#fef3c7', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#fbbf24', alignItems: 'center', width: '100%' },
  pendingText: { color: '#92400e', fontWeight: 'bold', fontSize: 16 },

  kycButton: { backgroundColor: '#EF4444', padding: 15, borderRadius: 8, alignItems: 'center', width: '100%', elevation: 5 },
  kycButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  addProductButton: { backgroundColor: '#FF385C', padding: 15, borderRadius: 10, alignItems: 'center', width: '100%', elevation: 3 },
  addProductText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  bottomBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff', height: 70 },
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  activeTab: { borderTopWidth: 3, borderTopColor: '#FF385C' },
  tabText: { fontSize: 12, color: '#888', marginTop: 2 },
  activeTabText: { color: '#FF385C', fontWeight: 'bold' }
});