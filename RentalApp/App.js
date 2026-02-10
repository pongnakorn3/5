import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, FlatList, RefreshControl, Platform, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useURL } from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';

// ✅ Import หน้าจอต่างๆ 
import AddProductScreen from './AddProductScreen';
import HomeScreen from './HomeScreen'; 
import ProductDetailScreen from './ProductDetailScreen';
import ManageBookingsScreen from './ManageBookingsScreen'; 
import MyBookingsScreen from './MyBookings'; // ชี้ไปที่ชื่อไฟล์ MyBookings.js จริงๆ
import ChatScreen from './ChatScreen'; 
import ProfileScreen from './ProfileScreen';
import PaymentSummary from './PaymentSummary'; // 👈 เพิ่มต่อจาก ProfileScreen (ประมาณบรรทัดที่ 14)


// 👇👇👇 1. เปลี่ยน Link Ngrok ล่าสุดของคุณที่นี่
const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

WebBrowser.maybeCompleteAuthSession();

// ==========================================
// 💰 0. หน้าจอจ่ายเงิน (PaymentScreen) - เพิ่มใหม่ ✅
// ==========================================
function PaymentScreen({ route, onBack, onComplete }) {
    const { bookingId, amount, userId } = route.params;
    const [slipImage, setSlipImage] = useState(null);
    const [loading, setLoading] = useState(false);
    

    // เลือกรูปสลิป
    const pickSlip = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) {
            setSlipImage(result.assets[0].uri);
        }
    };

    // กดยืนยันการโอน
    const handleConfirmPayment = async () => {
        if (!slipImage) {
            Alert.alert("แจ้งเตือน", "กรุณาแนบรูปสลิปการโอนเงิน");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('booking_id', bookingId);
            formData.append('user_id', userId);
            
            // แปลง path รูปเป็นไฟล์
            const filename = slipImage.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;
            
            formData.append('slip_image', { uri: slipImage, name: filename, type });

            const response = await fetch(`${BASE_URL}/confirm-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            const json = await response.json();

            if (json.success) {
                Alert.alert("สำเร็จ!", "ส่งหลักฐานเรียบร้อย รอแอดมินตรวจสอบ", [
                    { text: "ตกลง", onPress: () => onComplete() }
                ]);
            } else {
                Alert.alert("ผิดพลาด", json.message || "อัปโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "เชื่อมต่อ Server ไม่ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{flex:1, backgroundColor:'#fff'}}>
             <View style={styles.customHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                   <Text style={{fontSize: 22}}>⬅️</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ชำระเงิน</Text>
             </View>

             <ScrollView contentContainerStyle={{padding: 20, alignItems:'center'}}>
                
                {/* การ์ดสรุปยอด */}
                <View style={styles.paymentCard}>
                    <Text style={{fontSize:16, color:'#666'}}>รหัสการจอง: #{bookingId}</Text>
                    <Text style={{fontSize:30, fontWeight:'bold', color:'#FF385C', marginVertical:10}}>฿{Number(amount).toLocaleString()}</Text>
                    <Text style={{color:'#888'}}>กรุณาโอนเงินภายใน 15 นาที</Text>
                </View>

                {/* QR Code (จำลอง) */}
                <View style={styles.qrContainer}>
                    <Text style={{fontSize:18, fontWeight:'bold', marginBottom:10}}>สแกนจ่าย (PromptPay)</Text>
                    {/* ใช้ API สร้าง QR Code ฟรี หรือใส่รูป QR ของตัวเอง */}
                    <Image 
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0812345678` }} 
                        style={{width:200, height:200}} 
                    />
                    <Text style={{marginTop:10, color:'#555'}}>081-234-5678 (นายตัวอย่าง)</Text>
                </View>

                {/* อัปโหลดสลิป */}
                <View style={{width:'100%', marginTop:30}}>
                    <Text style={{fontSize:16, fontWeight:'bold', marginBottom:10}}>แนบหลักฐานการโอน</Text>
                    
                    <TouchableOpacity onPress={pickSlip} style={styles.uploadBox}>
                        {slipImage ? (
                            <Image source={{ uri: slipImage }} style={{width:'100%', height:'100%', resizeMode:'cover', borderRadius:10}} />
                        ) : (
                            <View style={{alignItems:'center'}}>
                                <Text style={{fontSize:30}}>📤</Text>
                                <Text style={{color:'#666'}}>แตะเพื่ออัปโหลดสลิป</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ปุ่มยืนยัน */}
                <TouchableOpacity 
                    style={[styles.confirmButton, loading && {opacity:0.7}]} 
                    onPress={handleConfirmPayment}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.confirmButtonText}>แจ้งชำระเงิน</Text>}
                </TouchableOpacity>

             </ScrollView>
        </SafeAreaView>
    );
}


// ==========================================
// 💬 1. หน้าจอรายการแชท (ChatListScreen)
// ==========================================
function ChatListScreen({ user, onChatPress }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await fetch(`${BASE_URL}/chat/list/${user.id}`);
      const json = await response.json();
      if (json.success) {
        setChats(json.data);
      }
    } catch (error) {
      console.log("Fetch chat error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <ActivityIndicator size="large" color="#FF385C" style={{marginTop: 50}} />;

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.customHeader}>
         <Text style={styles.headerTitle}>ข้อความ 💬</Text>
      </View>

      {chats.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5}}>
           <Text style={{fontSize: 50}}>📭</Text>
           <Text>ยังไม่มีการสนทนา</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => String(item.room_id)} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatItem} 
              onPress={() => onChatPress(item.other_user_id, item.other_user_name)}
            >
              <Image 
                source={{ uri: item.other_user_pic || 'https://via.placeholder.com/100' }} 
                style={styles.chatAvatar} 
              />
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                   <Text style={styles.chatName}>{item.other_user_name}</Text>
                   <Text style={styles.chatTime}>{formatTime(item.time)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.chatMessage}>
                    {item.last_message ? item.last_message : 'ส่งรูปภาพ/ข้อความ'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ==========================================
// 📱 Main App Component
// ==========================================
export default function App() {
  const url = useURL();
  const [address, setAddress] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State สำหรับควบคุมหน้าจอ
  const [mode, setMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('market'); 
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [bookingDate, setBookingDate] = useState({ start: null, end: null });
    
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [chatParams, setChatParams] = useState(null);

  // ✅ เพิ่ม State สำหรับ Payment
  const [paymentData, setPaymentData] = useState(null);

  // State สำหรับ Auth
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // 📷 State สำหรับ KYC
  const [idCardImage, setIdCardImage] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [idNumber, setIdNumber] = useState('');

  // ✅ ตรวจสอบ Deep Link (Social Login)
  useEffect(() => {
    if (url) {
      const { queryParams } = WebBrowser.maybeCompleteAuthSession();
      if (queryParams?.data) {
        const data = JSON.parse(decodeURIComponent(queryParams.data));
        handleLoginSuccess(data);
      }
    }
  }, [url]);

  const handleLoginSuccess = (user) => {
      console.log("User Status:", user.kyc_status);
      setUserData(user);
      setMode('main_app'); 
      setActiveTab('market'); 
      setCurrentScreen('home');
  };

  const handleSocialLogin = async (provider) => {
    try {
        const authUrl = `${BASE_URL}/auth/${provider}`;
        await WebBrowser.openAuthSessionAsync(authUrl);
    } catch (error) {
        console.log(error);
        Alert.alert("Error", "ไม่สามารถเปิดหน้า Login ได้");
    }
  };

  // ✅ ฟังก์ชันเริ่มแชท
  const handleStartChat = (otherUserId, otherUserName) => {
    if (!userData) return;
    
    const userId1 = userData.id < otherUserId ? userData.id : otherUserId;
    const userId2 = userData.id > otherUserId ? userData.id : otherUserId;
    const roomId = `chat_${userId1}_${userId2}`;

    setChatParams({
        room_id: roomId,
        user_id: userData.id,
        other_user_name: otherUserName || 'คู่สนทนา'
    });
    setCurrentScreen('chat'); 
  };

  const pickImage = async (setImageFunc) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('ขออภัย', 'ต้องอนุญาตให้ใช้กล้อง');
        return;
    }
    let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,    
        quality: 0.5,            
    });
    if (!result.canceled) setImageFunc(result.assets[0].uri);
  };

  const handleKycSubmit = async () => {
    if (!idCardImage || !faceImage || !idNumber) {
        Alert.alert("ข้อมูลไม่ครบ", "กรุณาถ่ายรูปให้ครบและกรอกเลขบัตร");
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
            Alert.alert("สำเร็จ!", "ส่งข้อมูลเรียบร้อย");
            setUserData(json.data); 
            setMode('main_app'); 
            setActiveTab('profile'); 
        } else {
            Alert.alert("ผิดพลาด", json.message);
        }
    } catch (error) {
        Alert.alert("Error", "ส่งข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone || !address) { Alert.alert("แจ้งเตือน", "กรอกให้ครบ"); return; }
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'},
       body: JSON.stringify({ email, password, fullName, phone, address }),
      });
      const json = await res.json();
      if (json.success) {
         Alert.alert("สำเร็จ", "ส่ง OTP แล้ว");
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
        Alert.alert("สำเร็จ!", "กรุณาล็อกอิน");
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
    setIsOtpStep(false);
  };

  // ==========================================
  // 🖥️ ส่วนแสดงผลหน้าจอ (UI Navigation)
  // ==========================================

  // 1. หน้าแชท (ใน App.js ตามรูป image_921d27.png)
if (userData && currentScreen === 'chat' && chatParams) {
    return (
        <ChatScreen
            route={{ params: chatParams }}
            user_id={userData.id}
            room_id={chatParams.room_id}
            other_user_name={chatParams.other_user_name}
            navigation={{ goBack: () => setCurrentScreen('home') }}
            onBack={() => setCurrentScreen('home')}
            
            // ✅ เพิ่มส่วนนี้เข้าไปเพื่อให้หน้า ChatScreen ส่งรูปได้
            onSendImage={async (uri) => {
                const formData = new FormData();
                formData.append('chat_image', {
                    uri: uri,
                    name: `chat_${Date.now()}.jpg`,
                    type: 'image/jpeg',
                });

                try {
                    const response = await fetch(`${BASE_URL}/chat/upload`, {
                        method: 'POST',
                        body: formData,
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    const data = await response.json();
                    if (data.success) {
                        // เมื่ออัปโหลดเสร็จ ให้ส่ง URL รูปผ่าน Socket.io 
                        // (ชื่อฟังก์ชัน handleSendMessage ต้องตรงกับที่คุณใช้ใน ChatScreen)
                    
                        return data.image_url; 
                    }
                } catch (error) {
                    console.error("Upload error:", error);
                    alert("ไม่สามารถอัปโหลดรูปภาพได้");
                }
            }}
        />
    );
}

// 1. วางหน้าสรุปยอดเงิน (PaymentSummary)
if (userData && currentScreen === 'paymentSummary' && selectedProduct) {
    return (
        <PaymentSummary
            product={paymentData}
            // ✅ แก้ "ไม่พบหมายเลขการจอง": ส่ง ID ที่ได้มาจากการจอง
            bookingId={paymentData?.bookingId} 
            startDate={bookingDate?.start}
            endDate={bookingDate?.end}
            
            // ✅ แก้ "กดย้อนกลับไม่ได้": ระบุหน้าที่จะให้กลับไป
            onBack={() => setCurrentScreen('productDetail')} 
            
            // ✅ แก้ "onComplete is not a function": 
            // ฟังก์ชันนี้จะทำงานหลังจากอัปโหลดสลิปสำเร็จ
            onComplete={() => {
                setPaymentData(null);
                setSelectedProduct(null);
                setCurrentScreen('myBookings'); // ย้ายไปหน้า "รายการเช่าของฉัน"
            }}

            onConfirm={(amounts) => {
                // รักษา bookingId เดิมไว้ และเติมยอดเงิน (amounts) เข้าไป
                setPaymentData({ ...paymentData, ...amounts });
                
                // 🚩 เช็คชื่อหน้าถัดไปให้ตรง (เช่น 'paymentQR' หรือ 'payment')
                setCurrentScreen('paymentQR'); 
            }}
        />
    );
}

// 2. วางหน้าจ่ายเงิน (PaymentScreen)
if (userData && currentScreen === 'paymentQR' && paymentData) {
    return (
        <PaymentScreen 
            // ... props อื่นๆ ตามเดิมของคุณ ...
        />
    );
}

// ✅ เพิ่มก้อนนี้ลงไปใน App.js
if (userData && currentScreen === 'paymentSummary' && paymentData) {
    return (
        <PaymentSummary
            user={userData}
            product={paymentData}       // ข้อมูลสินค้า มัดจำ ค่าส่ง ที่เก็บไว้ใน paymentData
            bookingId={paymentData.bookingId} // ✅ ส่ง ID การจองที่ได้รับมาจากหน้า Detail
            bookingDate={bookingDate}   // ส่งวันที่เพื่อเอาไปคำนวณจำนวนวัน
            onBack={() => setCurrentScreen('productDetail')} // ✅ แก้ให้กดย้อนกลับได้
            onComplete={() => {         // ✅ เพิ่มฟังก์ชันเมื่อจ่ายเงินสำเร็จ (แก้ Error onComplete)
                setPaymentData(null);    // ล้างข้อมูลการจ่ายเงิน
                setCurrentScreen('myBookings'); // ส่งผู้ใช้ไปหน้า "รายการเช่าของฉัน"
            }}
        />
    );
}

  // 2. หน้าลงสินค้า
  if (userData && currentScreen === 'addProduct') {
    return (
        <AddProductScreen 
            user={userData} 
            onBack={() => setCurrentScreen('home')}
            navigation={{ goBack: () => setCurrentScreen('home') }} 
        />
    );
  }

  // 3. หน้าดูรายละเอียดสินค้า
  if (userData?.id && currentScreen === 'productDetail' && selectedProduct) {
      return (
        <ProductDetailScreen
    product={selectedProduct}
    user={userData}         // ✅ ส่งก้อนข้อมูลที่มี address ไปเช็ค
    user_id={userData.id}   // ✅ ส่ง ID คนเช่า
    onBack={() => { setSelectedProduct(null); setCurrentScreen('home'); }}
    onChatPress={() => handleStartChat(selectedProduct.owner_id, selectedProduct.owner_name)}
     onGoToPayment={(bookingId, productWithFees) => { 
    // productWithFees คือก้อนข้อมูลที่เราส่งมาจากหน้า Detail ที่มีค่า deposit และ shipping_fee
    setPaymentData({ 
        bookingId: bookingId, 
        ...productWithFees, // กระจายข้อมูลสินค้า มัดจำ และค่าส่งลงใน paymentData
        userId: userData.id 
    }); 
    setCurrentScreen('paymentSummary'); // เปลี่ยนจาก 'payment' เป็น 'paymentSummary' เพื่อไปหน้าสรุปยอดก่อน
}}
        />
      );
  }

  // 4. หน้าจ่ายเงิน (เพิ่มใหม่) ✅
  if (userData && currentScreen === 'payment' && paymentData) {
      return (
          <PaymentScreen 
              route={{ params: paymentData }}
              onBack={() => setCurrentScreen('productDetail')}
              onComplete={() => {
                  setPaymentData(null);
                  setSelectedProduct(null);
                  setCurrentScreen('myBookings'); // จ่ายเสร็จไปดูรายการเช่าของฉัน
              }}
          />
      );
  }

 // 5. หน้าดูรายการที่ฉันขอเช่า (My Bookings)
if (userData && currentScreen === 'myBookings') {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.backButton}>
          <Text style={{ fontSize: 22 }}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายการเช่าของฉัน</Text>
      </View>
      <MyBookingsScreen 
        user={userData} 
        setCurrentScreen={setCurrentScreen} 
        setSelectedProduct={setSelectedProduct} 
        setBookingDate={setBookingDate} 
      />
    </View>
  );
}

  // 6. หน้าจัดการคำสั่งเช่า (Manage Bookings)
  if (userData && currentScreen === 'manageBookings') {
      return (
          <View style={{flex:1, backgroundColor: '#f5f5f5'}}>
              <View style={styles.customHeader}>
                  <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.backButton}>
                      <Text style={{fontSize: 22}}>⬅️</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.headerTitle}>จัดการคำสั่งเช่า (Owner)</Text>
              </View>
              <ManageBookingsScreen 
                route={{ params: { user: userData } }}
                 navigation={{ goBack: () => setCurrentScreen('home') }} 
              /> 
          </View>
      );
  }
// 6.5 หน้าแก้ไขที่อยู่ (ใน App.js)
if (userData && currentScreen === 'editAddress') {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50 }}>
      {/* Header ของหน้าแก้ไข */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')}>
          <Text style={{ fontSize: 18, color: '#FF385C' }}>⬅️ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 20 }}>แก้ไขที่อยู่จัดส่ง</Text>
      </View>

      <View style={{ padding: 20 }}>
        <Text style={{ marginBottom: 10, color: '#666' }}>ระบุที่อยู่ปัจจุบันของคุณ:</Text>
        <TextInput
          style={{
            backgroundColor: '#f3f4f6',
            padding: 15,
            borderRadius: 10,
            height: 120,
            textAlignVertical: 'top',
            color: '#000'
          }}
          multiline
          placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล..."
          value={address} // เชื่อมกับ State address
          onChangeText={setAddress} // อัปเดตค่า State เมื่อพิมพ์
        />

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#28a745', 
            padding: 15, 
            borderRadius: 10, 
            alignItems: 'center', 
            marginTop: 20 
          }}
          onPress={async () => {
            // 1. ตรวจสอบว่ากรอกข้อมูลหรือยัง
            if (!address.trim()) {
              alert('กรุณากรอกที่อยู่ก่อนบันทึก');
              return;
            }

            try {
              // 2. ส่งข้อมูลไปที่ Backend (ตรวจสอบ BASE_URL ว่าตรงกับ Ngrok ปัจจุบัน)
              const response = await fetch(`${BASE_URL}/update-address`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userData.id, // ส่ง ID ของผู้ใช้
                  address: address.trim() // ส่งที่อยู่ที่พิมพ์ใหม่
                })
              });

              const data = await response.json();

              if (data.success) {
                // 3. อัปเดตข้อมูลในแอปทันทีเพื่อให้หน้า Profile เปลี่ยนตาม
                setUserData({ ...userData, address: address.trim() });
                
                alert('บันทึกที่อยู่เรียบร้อยแล้ว');
                setCurrentScreen('home'); // กลับหน้าหลัก
              } else {
                alert('บันทึกไม่สำเร็จ: ' + data.message);
              }
            } catch (error) {
              console.error(error);
              alert('เกิดข้อผิดพลาด: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>💾 บันทึกที่อยู่</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
  // 7. หน้าจอหลัก (Main App) & Profile
  if (userData && (mode === 'main_app')) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={{flex: 1}}>
              {activeTab === 'market' && (
                  <HomeScreen 
                      navigation={{ navigate: (screenName) => { if (screenName === 'ManageBookings') setCurrentScreen('manageBookings'); } }}
                      onProductPress={(item) => { setSelectedProduct(item); setCurrentScreen('productDetail'); }} 
                  />
              )}

              {activeTab === 'chat_list' && (
                  <ChatListScreen 
                      user={userData} 
                      onChatPress={(otherId, otherName) => handleStartChat(otherId, otherName)} 
                  />
              )}

              {activeTab === 'profile' && (
                  <ProfileScreen 
                      route={{ params: { user: userData } }} 
                      navigation={{ 
                          navigate: (screenName) => {
                              if (screenName === 'EditAddress') {
                                  setAddress(userData?.address || "");
                                  setCurrentScreen('editAddress');
                              }
                              if (screenName === 'ManageBookings') setCurrentScreen('manageBookings');
                              if (screenName === 'AddProduct') setCurrentScreen('addProduct');
                              if (screenName === 'myBookings') setCurrentScreen('myBookings');
                              if (screenName === 'Login') handleLogout();
                          },
                          reset: (config) => {
                  if (config.routes[0].name === 'Login') handleLogout();
                }
              }}
            />
          )}
        </View>

        {/* Bottom Bar - แถบเมนูด้านล่าง */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'market' && styles.activeTab]} 
            onPress={() => setActiveTab('market')}
          >
            <Text style={{ fontSize: 24 }}>🏠</Text>
            <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>ตลาดเช่า</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'chat_list' && styles.activeTab]} 
            onPress={() => setActiveTab('chat_list')}
          >
            <Text style={{ fontSize: 24 }}>💬</Text>
            <Text style={[styles.tabText, activeTab === 'chat_list' && styles.activeTabText]}>แชท</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTab]} 
            onPress={() => setActiveTab('profile')}
          >
            <Text style={{ fontSize: 24 }}>👤</Text>
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>โปรไฟล์</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 8. หน้า KYC Form
  if (userData && mode === 'kyc') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.header}>ยืนยันตัวตน (KYC) 📷</Text>
            <View style={styles.card}>
                <Text style={styles.label}>1. ถ่ายรูปบัตรประชาชน</Text>
                <TouchableOpacity style={styles.imageBox} onPress={() => pickImage(setIdCardImage)}>
                    {idCardImage ? <Image source={{ uri: idCardImage }} style={styles.preview} /> : <View style={{alignItems:'center'}}><Text style={{fontSize:40}}>📷</Text><Text>ถ่ายบัตร</Text></View>}
                </TouchableOpacity>
                <Text style={styles.label}>เลขบัตรประชาชน</Text>
                <TextInput style={styles.input} placeholder="เลขบัตร 13 หลัก" value={idNumber} onChangeText={setIdNumber} keyboardType="number-pad" maxLength={13} />
            </View>
            <View style={styles.card}>
                <Text style={styles.label}>2. ถ่ายรูปหน้าตัวเอง</Text>
                <TouchableOpacity style={styles.imageBox} onPress={() => pickImage(setFaceImage)}>
                    {faceImage ? <Image source={{ uri: faceImage }} style={styles.preview} /> : <View style={{alignItems:'center'}}><Text style={{fontSize:40}}>🤳</Text><Text>ถ่ายหน้า</Text></View>}
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleKycSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ส่งข้อมูลยืนยันตัวตน</Text>}
            </TouchableOpacity>
            <View style={{marginTop: 20}}>
                <Button title="ย้อนกลับ" onPress={() => { setMode('main_app'); setActiveTab('profile'); }} color="gray" />
            </View>
        </ScrollView>
      );
  }
  // 9. หน้า Auth (Login / Register / OTP)
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.header}>Product Rental App 🚜</Text>
      <View style={styles.card}>
        {isOtpStep ? (
            <>
                <Text style={styles.cardTitle}>ยืนยันรหัส OTP</Text>
                <Text style={{textAlign:'center', color:'#666', marginBottom:10}}>ส่งไปที่ {phone}</Text>
                <TextInput style={[styles.input, {textAlign:'center', fontSize:24, letterSpacing:5}]} placeholder="XXXXXX" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />
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
            {/* เพิ่มช่องที่อยู่ตรงนี้ครับ */}
            <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="ที่อยู่สำหรับจัดส่ง/คืนสินค้า" 
                value={address} 
                onChangeText={setAddress} 
                multiline={true}
                numberOfLines={3}
            />
        </>
    )}
    
    <TextInput style={styles.input} placeholder="อีเมล" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
    <TextInput style={styles.input} placeholder="รหัสผ่าน" secureTextEntry value={password} onChangeText={setPassword} />

    <Button title={mode === 'login' ? "เข้าสู่ระบบ" : "ยืนยันการสมัคร"} 
            onPress={mode === 'login' ? handleEmailLogin : handleRegister} />

    <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switchText}>{mode === 'login' ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}</Text>
    </TouchableOpacity>

    <View style={styles.socialContainer}>
        <Text style={styles.socialDividerText}>──── หรือเข้าสู่ระบบด้วย ────</Text>
        <View style={styles.socialBtnWrapper}>
            <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#1877F2'}]} onPress={() => handleSocialLogin('facebook')}>
                <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#06C755'}]} onPress={() => handleSocialLogin('line')}>
                <Text style={styles.socialBtnText}>LINE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#DB4437'}]} onPress={() => handleSocialLogin('google')}>
                <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
        </View>
    </View>
</>
        )}
      </View>
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
  activeTabText: { color: '#FF385C', fontWeight: 'bold' },

  customHeader: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
  backButton: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  socialContainer: { marginTop: 25, alignItems: 'center' },
  socialDividerText: { color: '#aaa', fontSize: 12, marginBottom: 15 },
  socialBtnWrapper: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  socialBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 5, minWidth: 80, alignItems: 'center' },
  socialBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee' },
  chatName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  chatMessage: { color: '#777', fontSize: 14, marginTop: 2 },
  chatTime: { fontSize: 12, color: '#999' },

  // Styles สำหรับ Payment Screen
  paymentCard: { width: '100%', backgroundColor: '#F8F9FA', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E9ECEF' },
  qrContainer: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2} },
  uploadBox: { height: 150, borderStyle: 'dashed', borderWidth: 1, borderColor: '#aaa', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  confirmButton: { width:'100%', padding:15, backgroundColor:'#28A745', borderRadius:10, alignItems:'center', marginTop:30 },
  confirmButtonText: { color:'#fff', fontWeight:'bold', fontSize:18 }
});