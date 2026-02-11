import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
    KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert 
} from 'react-native';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

// ✅ ตรวจสอบว่า BASE_URL ตรงกับที่ใช้ใน App.js
const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev";

export default function ChatScreen({ route, navigation, onBack, user_id, room_id, other_user_name }) {
  
  // ✅ เลือกใช้ค่าจาก Props (ที่ส่งมาจาก App.js) เป็นอันดับแรก
  const currentRoomId = room_id || route?.params?.room_id;
  const currentUserId = user_id || route?.params?.user_id;
  const chatPartnerName = other_user_name || route?.params?.other_user_name || "ห้องแชท";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true); 
  const flatListRef = useRef();

  useEffect(() => {
    if (!currentRoomId || !currentUserId) {
        console.error("❌ ข้อมูลไม่ครบ: room_id หรือ user_id หายไป");
        setLoading(false); 
        return;
    }

    // ✅ เชื่อมต่อ Socket
    const newSocket = io(BASE_URL);
    setSocket(newSocket);
    newSocket.emit('join_room', currentRoomId);

    // ✅ ดึงประวัติแชทจาก Database
    fetch(`${BASE_URL}/chat/history/${currentRoomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setMessages(data.data);
            scrollToBottom();
        }
      })
      .catch(err => console.log("❌ Fetch history error:", err))
      .finally(() => setLoading(false));

    // ✅ รอรับข้อความใหม่
    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    return () => { if (newSocket) newSocket.disconnect(); };
  }, [currentRoomId, currentUserId]);

  const scrollToBottom = () => {
      if (flatListRef.current) {
          setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 200);
      }
  };

  const uploadImageToServer = async (uri) => {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('chat_image', { uri, name: filename, type });

      try {
          const response = await fetch(`${BASE_URL}/chat/upload`, {
              method: 'POST',
              body: formData,
              headers: { 'Content-Type': 'multipart/form-data' },
          });
          const result = await response.json();
          return result.image_url || result.url; 
      } catch (error) {
          console.error("Upload Error:", error);
          return null;
      }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      const uploadedUrl = await uploadImageToServer(result.assets[0].uri);
      if (uploadedUrl) handleFinalSend(uploadedUrl); 
    }
  };

  const sendMessage = () => {
    if (text.trim() === '') return;
    handleFinalSend(text.trim());
    setText('');
  };

  const handleFinalSend = async (content) => {
    if (!socket || !content) return;
    
    const messageData = {
      room_id: currentRoomId,
      sender_id: currentUserId,
      message: content,
      time: new Date().toISOString(),
    };

    // ส่งผ่าน Socket เพื่อให้เห็นทันที
    socket.emit('send_message', messageData);
    scrollToBottom();

    // บันทึกลง Database
    try {
      await fetch(`${BASE_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
    } catch (error) {
      console.log("❌ Save to DB Error:", error);
    }
  };

  // ✅ ปรับการเช็คว่าเป็นรูปภาพหรือไม่ให้แม่นยำขึ้น
  const isImageMessage = (msg) => {
      return typeof msg === 'string' && (msg.startsWith('http') || msg.includes('uploads/') || msg.includes('storage'));
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
        style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
  {/* ปรับให้เรียกใช้ onBack เป็นอันดับแรก */}
  <TouchableOpacity onPress={onBack} style={styles.backBtn}>
    <Text style={{fontSize: 20, color: '#FF385C'}}>⬅️ กลับ</Text>
  </TouchableOpacity>
  <Text style={styles.headerTitle}>{chatPartnerName}</Text>
  <View style={{width: 50}} />
</View>

      {loading ? (
          <View style={{flex:1, justifyContent:'center'}}>
              <ActivityIndicator size="large" color="#FF385C" />
          </View>
      ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ paddingVertical: 10 }}
            renderItem={({ item }) => {
              const isMyMessage = String(item.sender_id) === String(currentUserId);
              const isImg = isImageMessage(item.message);
              const displayTime = item.created_at || item.time;

              return (
                <View style={[styles.msgContainer, isMyMessage ? styles.myMsg : styles.otherMsg]}>
                  {isImg ? (
                    <Image source={{ uri: item.message }} style={styles.chatImage} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.msgText, {color: isMyMessage ? 'white' : 'black'}]}>
                      {item.message}
                    </Text>
                  )}
                  <Text style={[styles.timeText, {color: isMyMessage ? '#eee' : '#888'}]}>
                    {displayTime ? new Date(displayTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={() => (
                <Text style={styles.emptyText}>เริ่มการสนทนาได้เลย</Text>
            )}
          />
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
            <Text style={{fontSize: 24}}>📷</Text>
        </TouchableOpacity>
        <TextInput 
            style={styles.input} 
            value={text} 
            onChangeText={setText} 
            placeholder="พิมพ์ข้อความ..." 
            multiline={false}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { 
        paddingTop: Platform.OS === 'ios' ? 50 : 20, 
        paddingBottom: 15, 
        paddingHorizontal: 15, 
        backgroundColor: 'white', 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderColor: '#eee',
        elevation: 2
    },
    backBtn: { minWidth: 60 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    msgContainer: { marginVertical: 4, marginHorizontal: 12, padding: 10, borderRadius: 15, maxWidth: '75%' },
    myMsg: { alignSelf: 'flex-end', backgroundColor: '#FF385C', borderBottomRightRadius: 2 },
    otherMsg: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA', borderBottomLeftRadius: 2 },
    msgText: { fontSize: 16 },
    chatImage: { width: 200, height: 150, borderRadius: 10, marginVertical: 5 }, 
    timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    inputContainer: { 
        flexDirection: 'row', 
        padding: 10, 
        backgroundColor: 'white', 
        borderTopWidth: 1, 
        borderColor: '#eee', 
        alignItems: 'center', 
        paddingBottom: Platform.OS === 'ios' ? 25 : 10 
    },
    imageBtn: { paddingHorizontal: 10 },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, maxHeight: 100 },
    sendBtn: { backgroundColor: '#FF385C', borderRadius: 20, paddingHorizontal: 20, height: 40, justifyContent: 'center' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999' }
});