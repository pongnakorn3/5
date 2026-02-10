import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker'; // ✅ เพิ่มการนำเข้า

const BASE_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

export default function ChatScreen({ route, navigation, onBack, user_id, room_id, other_user_name, onSendImage }) {
  const currentRoomId = room_id || route?.params?.room_id;
  const currentUserId = user_id || route?.params?.user_id;
  const chatPartnerName = other_user_name || route?.params?.other_user_name || "Chat";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    const newSocket = io(BASE_URL);
    setSocket(newSocket);
    newSocket.emit('join_room', currentRoomId);

    fetch(`${BASE_URL}/chat/history/${currentRoomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setMessages(data.data);
      })
      .catch(err => console.log("Fetch error:", err));

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => newSocket.disconnect();
  }, [currentRoomId]);

  // ✅ ฟังก์ชันเลือกรูปภาพ
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      // ส่ง URI ไปอัปโหลดผ่าน Props ที่ App.js
      const uploadedUrl = await onSendImage(result.assets[0].uri);
      if (uploadedUrl) {
        handleFinalSend(uploadedUrl); // ส่ง URL รูปภาพผ่าน Socket
      }
    }
  };

  const sendMessage = () => {
    if (text.trim() === '') return;
    handleFinalSend(text);
    setText('');
  };

  // ✅ ฟังก์ชันกลางสำหรับส่งทั้งข้อความและรูปภาพ
  const handleFinalSend = async (content) => {
    const messageData = {
      room_id: currentRoomId,
      sender_id: currentUserId,
      message: content,
      time: new Date().toISOString(),
    };

    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, messageData]);

    try {
      await fetch(`${BASE_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
    } catch (error) {
      console.log("Send DB Error:", error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || navigation.goBack} style={styles.backBtn}>
          <Text style={{fontSize: 24}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatPartnerName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMyMessage = item.sender_id === currentUserId;
          // ✅ เช็คว่าเป็นรูปภาพหรือไม่
          const isImage = item.message.startsWith('http') && 
                          (item.message.match(/\.(jpeg|jpg|gif|png)$/) || item.message.includes('uploads/'));

          return (
            <View style={[styles.msgContainer, isMyMessage ? styles.myMsg : styles.otherMsg]}>
              {isImage ? (
                <Image source={{ uri: item.message }} style={styles.chatImage} />
              ) : (
                <Text style={[styles.msgText, isMyMessage ? {color:'white'} : {color:'black'}]}>
                  {item.message}
                </Text>
              )}
              <Text style={[styles.timeText, isMyMessage ? {color:'#ddd'} : {color:'#888'}]}>
                {new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        {/* ✅ เพิ่มปุ่มเลือกรูปภาพ 📷 */}
        <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
          <Text style={{fontSize: 24}}>📷</Text>
        </TouchableOpacity>

        <TextInput 
          style={styles.input} 
          value={text} 
          onChangeText={setText} 
          placeholder="พิมพ์ข้อความ..." 
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{color: 'white', fontWeight: 'bold'}}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, 
    backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', 
    borderBottomWidth: 1, borderColor: '#eee', elevation: 2 
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  msgContainer: { marginVertical: 5, marginHorizontal: 10, padding: 10, borderRadius: 10, maxWidth: '75%' },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  otherMsg: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA' },
  msgText: { fontSize: 16 },
  chatImage: { width: 200, height: 150, borderRadius: 10, marginVertical: 5 }, // ✅ สไตล์รูปภาพในแชท
  timeText: { fontSize: 10, marginTop: 5, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  imageBtn: { marginRight: 10, padding: 5 }, // ✅ สไตล์ปุ่มกล้อง
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendBtn: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 20, height: 40, justifyContent: 'center' }
});