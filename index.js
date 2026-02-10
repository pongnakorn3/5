require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http'); 
const { Server } = require("socket.io"); 

// ==========================================
// ⚠️ ตั้งค่าสำคัญ (ต้องเปลี่ยนทุกครั้งที่รันใหม่ หรือใช้ .env)
// ==========================================

// 1. Link Ngrok (เปลี่ยนเมื่อรัน ngrok ใหม่)
const PUBLIC_URL = process.env.PUBLIC_URL || "https://xxxx-xxxx-xxxx.ngrok-free.dev"; 

// 2. IPv4 ของเครื่องคอมคุณ (ดูจาก ipconfig)
const EXPO_IP = process.env.EXPO_IP || "192.168.1.XXX"; 

// ==========================================
// 🚀 Setup Server & Socket.io
// ==========================================
const app = express();
const server = http.createServer(app); 

// ตั้งค่า Socket.io สำหรับระบบ Chat
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
// รองรับการส่งข้อมูลแบบ Form-data (สำหรับ Multer)
app.use(express.urlencoded({ extended: true }));

app.use(session({ 
    secret: 'reset_secret', 
    resave: false, 
    saveUninitialized: true 
}));

app.use(passport.initialize());
app.use(passport.session());

// --- 📂 ตั้งค่าโฟลเดอร์เก็บรูป (Storage Configuration) ---
const uploadDir = 'uploads';
const slipDir = 'uploads/slips'; // สร้างโฟลเดอร์ย่อยสำหรับสลิป

// ตรวจสอบว่ามีโฟลเดอร์ไหม ถ้าไม่มีให้สร้าง
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // แยกโฟลเดอร์ถ้าเป็นสลิปโอนเงิน
        if (file.fieldname === 'slip_image') {
            cb(null, 'uploads/slips/');
        } else {
            cb(null, 'uploads/');
        }
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์: file_เวลา_เลขสุ่ม.นามสกุล
        cb(null, `file_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// เปิดให้เข้าถึงไฟล์รูปผ่าน URL ได้ (e.g. http://localhost:3000/uploads/xxx.jpg)
app.use('/uploads', express.static('uploads'));

// --- 🐘 Database Connection (PostgreSQL) ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// ==========================================
// 🛠️ สร้างตารางใน Database (Auto Create Tables)
// ==========================================

const createTables = async () => {
    try {
        // 1. ตารางผู้ใช้งาน
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255),
                facebook_id VARCHAR(255),
                line_id VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                full_name VARCHAR(255),
                phone VARCHAR(50),
                profile_picture TEXT,
                kyc_status VARCHAR(50) DEFAULT 'pending_kyc',
                otp_code VARCHAR(10),
                id_card_number VARCHAR(20),
                id_card_image TEXT,
                face_image TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. ตารางสินค้า
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                description TEXT,
                price_per_day DECIMAL(10,2),
                image_url TEXT,
                owner_id INTEGER,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. ตารางการจอง (Bookings)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                renter_id INTEGER,
                status VARCHAR(50) DEFAULT 'pending',
                payment_status VARCHAR(50) DEFAULT 'pending',
                slip_image TEXT,
                total_price DECIMAL(10,2),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. ตารางข้อความแชท (Messages)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room_id VARCHAR(255),
                sender_id INTEGER,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Database tables checked/created.");
    } catch (err) {
        console.error("❌ Error creating tables:", err);
    }
};
createTables();

// Passport Serialization (เก็บข้อมูล User ใน Session)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ==========================================
// 🔑 Social Login Strategies
// ==========================================

// --- Google Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${PUBLIC_URL}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const checkUser = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, email]);
      
      if (checkUser.rows.length > 0) {
        // ถ้ามี User แล้วแต่ยังไม่มี google_id ให้ Update
        if (!checkUser.rows[0].google_id) {
            const updated = await pool.query('UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *', [profile.id, email]);
            return done(null, updated.rows[0]);
        }
        return done(null, checkUser.rows[0]);
      }

      const newUser = await pool.query(
        `INSERT INTO users (google_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
        [profile.id, email, profile.displayName, profile.photos[0].value]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// --- Facebook Strategy ---
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${PUBLIC_URL}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let email = (profile.emails && profile.emails.length > 0) ? profile.emails[0].value : null;
      const checkUser = await pool.query('SELECT * FROM users WHERE facebook_id = $1 OR (email IS NOT NULL AND email = $2)', [profile.id, email]);
      
      if (checkUser.rows.length > 0) return done(null, checkUser.rows[0]);

      const photo = (profile.photos && profile.photos[0]) ? profile.photos[0].value : null;
      const newUser = await pool.query(
        `INSERT INTO users (facebook_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
        [profile.id, email, profile.displayName, photo]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// --- Line Strategy ---
passport.use(new LineStrategy({
    channelID: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    callbackURL: process.env.LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email']
  },
  async (accessToken, refreshToken, params, profile, done) => {
    try {
      const email = profile.email || null;
      const lineId = profile.id;
      const checkUser = await pool.query('SELECT * FROM users WHERE line_id = $1 OR (email IS NOT NULL AND email = $2)', [lineId, email]);
      
      if (checkUser.rows.length > 0) return done(null, checkUser.rows[0]);

      const newUser = await pool.query(
          `INSERT INTO users (line_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
          [lineId, email, profile.displayName, profile.pictureUrl]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// ==========================================
// 💰 Payment & Booking API
// ==========================================

// ✅ 1. สร้างการจองใหม่ (Create Booking)
app.post('/create-booking', async (req, res) => {
    const client = await pool.connect(); // ใช้ client สำหรับ Transaction
    try {
        const { user_id, product_id, start_date, end_date, total_price } = req.body;

        await client.query('BEGIN'); // เริ่มต้น Transaction

        // ตรวจสอบสต็อกสินค้าก่อนจอง
        const productRes = await client.query('SELECT quantity FROM products WHERE id = $1 FOR UPDATE', [product_id]);
        if (productRes.rows.length === 0 || productRes.rows[0].quantity < 1) {
            throw new Error("สินค้าไม่พอสำหรับการจอง");
        }

        const sql = `INSERT INTO bookings 
                     (renter_id, product_id, start_date, end_date, total_price, status, payment_status) 
                     VALUES ($1, $2, $3, $4, $5, 'pending', 'pending') RETURNING id`;

        const result = await client.query(sql, [user_id, product_id, start_date, end_date, total_price]);
        
        // ตัดสต็อกสินค้าทันทีเมื่อมีการจอง
        await client.query('UPDATE products SET quantity = quantity - 1 WHERE id = $1', [product_id]);

        await client.query('COMMIT'); // ยืนยัน Transaction
        res.json({ success: true, booking_id: result.rows[0].id, message: 'จองสำเร็จและตัดสต็อกแล้ว' });
    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิกข้อมูลถ้าเกิด Error
        console.error("Booking Error:", err);
        res.status(500).json({ success: false, message: err.message || 'Database Error' });
    } finally {
        client.release();
    }
});

// ✅ 2. ยืนยันการชำระเงิน (Confirm Payment)
app.post('/confirm-payment', upload.single('slip_image'), async (req, res) => {
    try {
        const { booking_id, user_id } = req.body;
        const filename = req.file ? req.file.filename : null;

        if (!booking_id || !filename) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/slips/${filename}`;

        // ⚠️ แก้ไขตรงนี้: เปลี่ยนจาก 'paid' เป็น 'waiting_verification' (หรือชื่ออะไรก็ได้ที่สื่อว่ารอตรวจสอบ)
        await pool.query(
            `UPDATE bookings 
             SET status = 'waiting_verification', 
                 payment_status = 'pending_approval', 
                 slip_image = $1 
             WHERE id = $2`,
            [fileUrl, booking_id]
        );

        res.json({ 
            success: true, 
            message: 'ส่งสลิปแล้ว รอเจ้าของร้านตรวจสอบยอดเงิน',
            data: { slip_url: fileUrl }
        });

    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

//การแจ้งชำรุด เพื่อเปรียบเทียบรูปภาพ
app.post('/booking/report-damage', upload.array('damage_images', 2), async (req, res) => {
    try {
        const { booking_id, description } = req.body;
        const images = req.files.map(f => f.filename); // จะได้รูปเก่าและรูปใหม่

        // อัปเดตสถานะใน DB และรอ Admin ตัดสินหรือคำนวณเงินหักมัดจำ
        await pool.query(
            'UPDATE bookings SET status = $1, damage_report = $2, damage_images = $3 WHERE id = $4',
            ['damaged', description, images, booking_id]
        );

        res.json({ success: true, message: "ส่งรายงานชำรุดเรียบร้อย" });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

//เมื่อผู้เช่ากดปุ่มยืนยัน คุณต้องส่งค่าพวกนี้ไปบันทึกในตาราง bookings
app.post('/booking/create', async (req, res) => {
    try {
        const { 
            product_id, renter_id, start_date, end_date, 
            rental_fee, deposit_fee, shipping_fee, total_price 
        } = req.body;

        const result = await pool.query(
            `INSERT INTO bookings 
            (product_id, renter_id, start_date, end_date, rental_fee, deposit_fee, shipping_fee, total_price, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment') 
            RETURNING id`,
            [product_id, renter_id, start_date, end_date, rental_fee, deposit_fee, shipping_fee, total_price]
        );

        res.json({ success: true, booking_id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'บันทึกการจองล้มเหลว' });
    }
});

// API สำหรับรับรูปสลิปการโอนเงิน
app.post('/booking/upload-slip', upload.single('slip_image'), async (req, res) => {
    try {
        const { booking_id } = req.body; // รับ ID ของการจองจาก App
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "ไม่พบไฟล์รูปสลิป" });
        }

        const slip_filename = req.file.filename; // ชื่อไฟล์ที่ multer ตั้งให้

        // อัปเดตตาราง bookings: เก็บชื่อไฟล์สลิป และเปลี่ยนสถานะเป็น 'pending_verification'
        const query = `
            UPDATE bookings 
            SET slip_image = $1, 
                payment_status = $2, 
                status = $3 
            WHERE id = $4 
            RETURNING *`;
        
        const values = [slip_filename, 'paid', 'pending_verification', booking_id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "ไม่พบข้อมูลการจอง" });
        }

        res.json({ 
            success: true, 
            message: "อัปโหลดสลิปเรียบร้อย ระบบกำลังตรวจสอบ", 
            data: result.rows[0] 
        });
    } catch (err) {
        console.error("Upload Slip Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ==========================================
// 💬 Chat System (Socket.io & API) 
// ==========================================

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // เมื่อ User เข้าสู่ห้องแชท
    socket.on('join_room', (room_id) => {
        socket.join(room_id);
        console.log(`User joined room: ${room_id}`);
    });

    // เมื่อมีการส่งข้อความ
    socket.on('send_message', async (data) => {
        // ส่งข้อความหาทุกคนในห้อง (รวมถึงคนส่งถ้าต้องการอัปเดต UI)
        io.to(data.room_id).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
});

// --- Chat APIs ---

// 1. ดึงประวัติข้อความในห้อง
app.get('/chat/history/:room_id', async (req, res) => {
    try {
        const { room_id } = req.params;
        const result = await pool.query(
            `SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC`,
            [room_id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. ส่งข้อความ (Save ลง DB)
app.post('/chat/send', async (req, res) => {
    try {
        const { room_id, sender_id, message } = req.body;
        
        await pool.query(
            `INSERT INTO messages (room_id, sender_id, message) VALUES ($1, $2, $3)`,
            [room_id, sender_id, message]
        );

        res.json({ success: true, message: "Saved to DB" });
    } catch (err) {
        console.error("Save msg error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}); // ปิดก้อน /chat/send ให้เรียบร้อยที่นี่

// ✅ แยก /update-address ออกมาเป็นอิสระ (ไม่ซ้อนกัน)
app.post('/chat/upload', upload.single('chat_image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'ไม่ได้เลือกรูปภาพ' });
        }
        // สร้าง URL ของรูปภาพเพื่อให้แอปเข้าถึงได้
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ success: true, image_url: imageUrl });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});
app.post('/update-address', async (req, res) => {
    try {
        const { user_id, address } = req.body;
        if (!user_id || !address) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const result = await pool.query(
            'UPDATE users SET address = $1 WHERE id = $2 RETURNING *',
            [address, user_id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, message: 'อัปเดตที่อยู่สำเร็จ', user: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }
    } catch (err) {
        console.error("Update Address Error:", err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});
// 3. ดึงรายชื่อคนที่เราเคยคุยด้วย
app.get('/chat/list/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // SQL ดึงข้อความล่าสุดของแต่ละห้องที่ User เกี่ยวข้อง
        const sql = `
            SELECT DISTINCT ON (room_id) 
                room_id, message as last_message, created_at as time
            FROM messages
            WHERE room_id LIKE $1
            ORDER BY room_id, created_at DESC
        `;

        const chatRooms = await pool.query(sql, [`%${userId}%`]);

        const chatList = await Promise.all(chatRooms.rows.map(async (row) => {
            const roomId = row.room_id;
            // แยก ID เพื่อนออกมาจาก room_id (e.g. chat_1_2 -> [1, 2])
            const parts = roomId.replace('chat_', '').split('_'); 
            const otherUserId = parts.find(id => id !== userId);

            if (!otherUserId) return null;

            const userRes = await pool.query("SELECT id, full_name, profile_picture FROM users WHERE id = $1", [otherUserId]);
            const otherUser = userRes.rows[0];

            if (!otherUser) return null;

            return {
                room_id: roomId,
                other_user_id: otherUserId,
                other_user_name: otherUser.full_name,
                other_user_pic: otherUser.profile_picture,
                last_message: row.last_message,
                time: row.time
            };
        }));

        const validChats = chatList.filter(c => c !== null);
        validChats.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        res.json({ success: true, data: validChats });

    } catch (err) {
        console.error("Chat List Error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// ==========================================
// 📸 KYC API
// ==========================================
app.post('/kyc/submit', upload.fields([{ name: 'id_card_image' }, { name: 'face_image' }]), async (req, res) => {
    try {
        const { user_id, id_card_number } = req.body;

        if (!req.files || !req.files['id_card_image'] || !req.files['face_image']) {
             return res.status(400).json({ success: false, message: 'กรุณาส่งรูปให้ครบทั้ง 2 รูป' });
        }

        const idCardPath = req.files['id_card_image'][0].filename;
        const facePath = req.files['face_image'][0].filename;

        const result = await pool.query(
            `UPDATE users 
             SET id_card_number = $1, id_card_image = $2, face_image = $3, kyc_status = 'pending_approval' 
             WHERE id = $4 RETURNING *`,
            [id_card_number, idCardPath, facePath, user_id]
        );

        res.json({ success: true, message: 'ส่งข้อมูลเรียบร้อย รอตรวจสอบ', data: result.rows[0] });
    } catch (err) {
        console.error("KYC Error:", err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// ==========================================
// 🛍️ Product & Management API
// ==========================================

// ลงประกาศสินค้าใหม่
app.post('/products', upload.single('image'), async (req, res) => {
    try {
        // 1. รับค่า deposit เพิ่มจาก req.body
        const { name, description, price, owner_id, quantity, deposit } = req.body; 
        const image_url = req.file ? req.file.filename : null;
        
        // 2. แปลงค่าเป็นตัวเลขให้ถูกต้อง
        const qty = quantity ? parseInt(quantity) : 1;
        const dep = deposit ? parseInt(deposit) : 0; 

        // 3. แก้ไข SQL Query เพื่อเพิ่มคอลัมน์ deposit
        const newProduct = await pool.query(
            `INSERT INTO products (name, description, price_per_day, image_url, owner_id, quantity, deposit) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, 
            [name, description, price, image_url, owner_id, qty, dep] // 4. ส่งค่า dep เข้าไปที่ $7
        );

        res.json({ success: true, product: newProduct.rows[0] });
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
// ดึงสินค้าทั้งหมดพร้อมชื่อเจ้าของ
app.get('/products', async (req, res) => {
    try {
        const allProducts = await pool.query(`
           SELECT p.*, u.full_name as owner_name, u.profile_picture as owner_pic 
            FROM products p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(allProducts.rows);
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ดึงรายการจอง (ฝั่งเจ้าของร้าน)
app.get('/bookings/owner/:owner_id', async (req, res) => {
    try {
        const { owner_id } = req.params;
        const query = `
            SELECT b.id, b.status, b.payment_status, b.created_at, b.slip_image, 
                   b.total_price, b.start_date, b.end_date,
                   p.name as product_name, p.image_url,
                   u.full_name as renter_name, u.phone as renter_phone, u.address as renter_address  
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.renter_id = u.id
            WHERE p.owner_id = $1 ORDER BY b.created_at DESC
        `;
        const result = await pool.query(query, [owner_id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ดึงรายการจอง (ฝั่งผู้เช่า) - เพิ่มส่วนนี้เข้าไปครับ
app.get('/bookings/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const query = `
            SELECT b.id, b.status, b.payment_status, b.created_at, b.slip_image, 
                   b.total_price, b.start_date, b.end_date,
                   p.name as product_name, p.image_url,
                   u.full_name as owner_name, u.phone as owner_phone, u.address as owner_address
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON p.owner_id = u.id
            WHERE b.renter_id = $1 
            ORDER BY b.created_at DESC
        `;
        const result = await pool.query(query, [user_id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Renter Booking Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});


// 👇 อัปเดต API update-status (วางทับตัวเดิมใน index.js)
app.post('/bookings/update-status', async (req, res) => {
    const { booking_id, status } = req.body;

    if (!booking_id || !status) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // 1. ขอ Client จาก Pool (สำหรับ PostgreSQL)
    const client = await pool.connect(); 

    try {
        // 2. เริ่ม Transaction
        await client.query('BEGIN'); 

        // ดึงข้อมูล Booking (ใช้ $1 แทน ?)
        const bookingRes = await client.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
        
        if (bookingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const currentBooking = bookingRes.rows[0]; // PostgreSQL ข้อมูลจะอยู่ใน .rows
        const ownerId = currentBooking.owner_id;
        const renterId = currentBooking.renter_id;

        // คำนวณยอดเงิน
        const totalPrice = Number(currentBooking.total_price);
        const deposit = Number(currentBooking.deposit) || 0;
        const income = totalPrice - deposit;

        // 3. อัปเดตสถานะ (ใช้ $1, $2)
        await client.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, booking_id]);

        // -------------------------------------------------------
        // 💰 LOGIC การจัดการเงิน (PostgreSQL Syntax)
        // -------------------------------------------------------

        // CASE A: ผู้เช่ากดรับสินค้า (active) -> โอนค่าเช่าให้เจ้าของ
        if (status === 'active') {
            await client.query(
                'UPDATE users SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2', 
                [income, ownerId]
            );
        }
        
        // CASE B: จบงานปกติ (completed) -> คืนมัดจำให้ผู้เช่า
        else if (status === 'completed') {
            await client.query(
                'UPDATE users SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2', 
                [deposit, renterId]
            );
        }

        // CASE C: สินค้าเสียหาย (damaged) -> โอนมัดจำให้เจ้าของร้าน
        else if (status === 'damaged') {
            await client.query(
                'UPDATE users SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2', 
                [deposit, ownerId]
            );
        }

        // -------------------------------------------------------

        await client.query('COMMIT'); // ✅ ยืนยันการทำงาน
        res.json({ success: true, message: 'Status updated and wallet adjusted' });

    } catch (error) {
        await client.query('ROLLBACK'); // ❌ ยกเลิกถ้ามีปัญหา
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release(); // 🔓 คืน Connection ให้ระบบ
    }
});
// ==========================================
// 📝 Local Authentication API
// ==========================================

// Register (สมัครสมาชิก)
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkUser.rows.length > 0) return res.status(400).json({ success: false, message: "อีเมลนี้ใช้แล้ว" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        console.log(`\n=== 📲 OTP for ${phone}: ${otpCode} ===\n`);

        await pool.query(
            `INSERT INTO users (email, password, full_name, phone, kyc_status, otp_code, address) 
 VALUES ($1, $2, $3, $4, 'pending_otp', $5, $6)`,
            [email, hashedPassword, full_name, phone, otpCode, address]
        );
        res.json({ success: true, message: "สมัครเบื้องต้นสำเร็จ และส่ง OTP แล้ว" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Verify OTP (ยืนยันเบอร์โทร)
app.post('/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: "ไม่พบผู้ใช้" });
        if (user.rows[0].otp_code !== otp) return res.status(400).json({ success: false, message: "OTP ผิด" });

        await pool.query("UPDATE users SET otp_code = NULL, kyc_status = 'pending_kyc' WHERE email = $1", [email]);
        res.json({ success: true, message: "ยืนยัน OTP สำเร็จ กรุณาทำ KYC ต่อ" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Login (เข้าสู่ระบบ)
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) return res.status(400).json({ success: false, message: "ไม่พบข้อมูลผู้ใช้" });
        if (!user.rows[0].password) return res.status(400).json({ success: false, message: "กรุณาเข้าสู่ระบบผ่าน Social ที่ท่านใช้สมัคร" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(400).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });

        res.json({ success: true, user: user.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// --- วางไว้ล่างสุดของไฟล์ (ก่อน app.listen) ---

// ระบบแจ้งชำระเงินและอัปโหลดสลิป
app.post('/bookings/confirm-payment', upload.single('slip_image'), async (req, res) => {
    try {
        const { booking_id, total_price } = req.body; // รับ ID การจองและยอดเงิน
        const slip_image = req.file ? req.file.filename : null; // รับชื่อไฟล์สลิป

        if (!booking_id || !slip_image) {
            return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบหรือไม่มีรูปสลิป" });
        }

        const query = `
            UPDATE bookings 
            SET status = 'waiting_verification', 
                slip_image = $1, 
                total_price = $2,
                payment_status = 'paid' 
            WHERE id = $3 
            RETURNING *`;
        
        const result = await pool.query(query, [slip_image, total_price, booking_id]);

        if (result.rowCount > 0) {
            res.json({ success: true, message: "แจ้งโอนสำเร็จ รอตรวจสอบครับ" });
        } else {
            res.status(404).json({ success: false, message: "ไม่พบข้อมูลการจองในระบบ" });
        }
    } catch (err) {
        console.error("Payment Confirmation Error:", err);
        // ส่งกลับเป็น JSON เสมอเพื่อป้องกัน Error < ในแอป
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดที่ระบบฐานข้อมูล" }); 
    }
});

// ดึงยอดเงินในกระเป๋า
app.get('/wallet/:userId', async (req, res) => {
    try {
        // ❌ ของเดิม (ผิดชื่อ): SELECT wallet_balance ...
        // ✅ ของใหม่ (แก้ให้ตรง DB คุณ): เลือก 'wallet'
        const [rows] = await db.execute('SELECT wallet FROM users WHERE id = ?', [req.params.userId]);
        
        if (rows.length > 0) {
            // ส่งค่ากลับไป โดยเช็คว่าถ้าเป็น null ให้เป็น 0
            res.json({ success: true, balance: rows[0].wallet || 0 }); 
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 🔗 Social Routes & Redirects
// ==========================================

app.get('/', (req, res) => res.send('Backend Server is Online ✅'));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), handleAuthCallback);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), handleAuthCallback);

app.get('/auth/line', passport.authenticate('line'));
app.get('/auth/line/callback', passport.authenticate('line', { failureRedirect: '/' }), handleAuthCallback);

// ฟังก์ชันกลางสำหรับจัดการหลังจาก Social Login สำเร็จ
function handleAuthCallback(req, res) {
    const EXPO_URL = `exp://${EXPO_IP}:8082/--/`;

    if (!req.user) return res.redirect(`${EXPO_URL}?error=no_user`);
    
    // คลีนข้อมูลส่งกลับไปที่ Expo App
    const cleanUser = {
        id: req.user.id,
        full_name: req.user.full_name,
        email: req.user.email,
        profile_picture: req.user.profile_picture,
        kyc_status: req.user.kyc_status
    };
    
    const userData = JSON.stringify(cleanUser);
    res.redirect(`${EXPO_URL}?data=${encodeURIComponent(userData)}`);
}

// ==========================================
// 🚀 รัน Server
// ==========================================
const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 EXPO Redirect IP: ${EXPO_IP}`);
});