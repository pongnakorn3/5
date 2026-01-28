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

// 👇👇 ใส่ลิงก์ Ngrok ของคุณตรงนี้ (อย่าลืมเปลี่ยนทุกครั้งที่รัน ngrok ใหม่)
const PUBLIC_URL = "https://uncookable-ross-nonabusively.ngrok-free.dev"; 

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({ secret: 'reset_secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// --- 📂 ตั้งค่าโฟลเดอร์เก็บรูป ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    // ✅ แก้ไข: เปลี่ยนชื่อไฟล์ให้เป็นกลางๆ (ใช้ได้ทั้ง kyc และ product)
    filename: (req, file, cb) => cb(null, `file_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });

// เปิดให้เข้าถึงรูปภาพผ่าน URL
app.use('/uploads', express.static('uploads'));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ==========================================
// 1. Social Login Strategies
// ==========================================

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${PUBLIC_URL}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const checkUser = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      if (checkUser.rows.length > 0) return done(null, checkUser.rows[0]);

      const email = profile.emails[0].value;
      const checkEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (checkEmail.rows.length > 0) {
        const updated = await pool.query('UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *', [profile.id, email]);
        return done(null, updated.rows[0]);
      }

      const newUser = await pool.query(
        `INSERT INTO users (google_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
        [profile.id, email, profile.displayName, profile.photos[0].value]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${PUBLIC_URL}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const checkUser = await pool.query('SELECT * FROM users WHERE facebook_id = $1', [profile.id]);
      if (checkUser.rows.length > 0) return done(null, checkUser.rows[0]);
      
      let email = (profile.emails && profile.emails.length > 0) ? profile.emails[0].value : null;
      if (email) {
          const checkEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          if (checkEmail.rows.length > 0) {
              const updatedUser = await pool.query('UPDATE users SET facebook_id = $1 WHERE email = $2 RETURNING *', [profile.id, email]);
              return done(null, updatedUser.rows[0]);
          }
      }

      const photo = (profile.photos && profile.photos[0]) ? profile.photos[0].value : null;
      const newUser = await pool.query(
        `INSERT INTO users (facebook_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
        [profile.id, email, profile.displayName, photo]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// Line
passport.use(new LineStrategy({
    channelID: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    callbackURL: process.env.LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email'],
    botPrompt: 'normal'
  },
  async (accessToken, refreshToken, params, profile, done) => {
    try {
      const email = profile.email || null;
      const lineId = profile.id;
      const checkUser = await pool.query('SELECT * FROM users WHERE line_id = $1', [lineId]);
      if (checkUser.rows.length > 0) return done(null, checkUser.rows[0]);

      if (email) {
          const checkEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          if (checkEmail.rows.length > 0) {
              const updated = await pool.query('UPDATE users SET line_id = $1 WHERE email = $2 RETURNING *', [lineId, email]);
              return done(null, updated.rows[0]);
          }
      }

      const newUser = await pool.query(
          `INSERT INTO users (line_id, email, full_name, profile_picture, kyc_status) VALUES ($1, $2, $3, $4, 'pending_kyc') RETURNING *`,
          [lineId, email, profile.displayName, profile.pictureUrl]
      );
      return done(null, newUser.rows[0]);
    } catch (err) { return done(err, null); }
  }
));

// ==========================================
// 📸 API สำหรับรับรูป KYC
// ==========================================
app.post('/kyc/submit', upload.fields([{ name: 'id_card_image' }, { name: 'face_image' }]), async (req, res) => {
    try {
        console.log("📷 Receiving KYC Data...");
        const { user_id, id_card_number } = req.body;

        if (!req.files || !req.files['id_card_image'] || !req.files['face_image']) {
             return res.status(400).json({ success: false, message: 'กรุณาส่งรูปให้ครบทั้ง 2 รูป' });
        }

        const idCardPath = req.files['id_card_image'][0].filename;
        const facePath = req.files['face_image'][0].filename;

        const result = await pool.query(
            `UPDATE users 
             SET id_card_number = $1, 
                 id_card_image = $2, 
                 face_image = $3, 
                 kyc_status = 'pending_approval' 
             WHERE id = $4 RETURNING *`,
            [id_card_number, idCardPath, facePath, user_id]
        );

        res.json({ success: true, message: 'ส่งข้อมูลเรียบร้อย รอตรวจสอบ', data: result.rows[0] });

    } catch (err) {
        console.error("KYC Error:", err);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
    }
});

// ==========================================
// 🛍️ API สำหรับสินค้า (Product Rental) - เพิ่มใหม่ ✅
// ==========================================

// 1. ลงประกาศสินค้าใหม่ (Upload รูป 1 รูป)
app.post('/products', upload.single('image'), async (req, res) => {
    try {
        console.log("🛍️ Adding new product...");
        const { name, description, price, owner_id } = req.body;
        
        // เช็คว่ามีรูปส่งมาไหม
        const image_url = req.file ? req.file.filename : null; 

        if (!name || !price || !owner_id) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const newProduct = await pool.query(
            `INSERT INTO products (name, description, price_per_day, image_url, owner_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, price, image_url, owner_id]
        );

        res.json({ success: true, product: newProduct.rows[0] });

    } catch (err) {
        console.error("Product Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// 2. ดึงรายการสินค้าทั้งหมด (สำหรับหน้า Home)
app.get('/products', async (req, res) => {
    try {
        // ดึงข้อมูลสินค้า + ข้อมูลเจ้าของ (ชื่อ, รูปโปรไฟล์) มาแสดงด้วย
        const allProducts = await pool.query(`
            SELECT p.*, u.full_name as owner_name, u.profile_picture as owner_pic 
            FROM products p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(allProducts.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});


// ==========================================
// 📝 Register & OTP
// ==========================================
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        if (!email || !password || !full_name || !phone) return res.status(400).json({ success: false, message: "กรอกข้อมูลไม่ครบ" });

        const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkUser.rows.length > 0) return res.status(400).json({ success: false, message: "อีเมลนี้ใช้แล้ว" });

        const hashedPassword = await bcrypt.hash(password, 10);
        let otpCode = phone === "0999999999" ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();

        console.log(`\n=== 📲 OTP for ${phone}: ${otpCode} ===\n`);

        const newUser = await pool.query(
            `INSERT INTO users (email, password, full_name, phone, kyc_status, otp_code) 
             VALUES ($1, $2, $3, $4, 'pending_otp', $5) RETURNING *`,
            [email, hashedPassword, full_name, phone, otpCode]
        );
        res.json({ success: true, message: "ส่ง OTP แล้ว" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post('/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: "ไม่พบผู้ใช้" });
        if (user.rows[0].otp_code !== otp) return res.status(400).json({ success: false, message: "รหัส OTP ไม่ถูกต้อง" });

        await pool.query("UPDATE users SET otp_code = NULL, kyc_status = 'pending_kyc' WHERE email = $1", [email]);
        res.json({ success: true, message: "ยืนยัน OTP สำเร็จ กรุณายืนยันตัวตนต่อ" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ==========================================
// 🔑 Login
// ==========================================
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) return res.status(400).json({ success: false, message: "ไม่พบข้อมูล" });
        if (!user.rows[0].password) return res.status(400).json({ success: false, message: "กรุณา Login ผ่าน Social Media" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(400).json({ success: false, message: "รหัสผ่านผิด" });

        res.json({ success: true, user: user.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ==========================================
// 🛣️ Social Routes & Callback
// ==========================================
app.get('/', (req, res) => res.send('Server Online ✅'));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), handleAuthCallback);
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), handleAuthCallback);
app.get('/auth/line', passport.authenticate('line'));
app.get('/auth/line/callback', passport.authenticate('line', { failureRedirect: '/' }), handleAuthCallback);

function handleAuthCallback(req, res) {
    // ⚠️ อย่าลืมแก้ IP ตรงนี้ให้เป็น IP ของ Expo เครื่องคุณ
    const EXPO_IP = "172.25.2.211"; // หรือ IP ที่ใช้อยู่ตอนนี้
    const EXPO_URL = `exp://${EXPO_IP}:8082/--/`;

    if (!req.user) return res.redirect(`${EXPO_URL}?error=no_user`);
    
    const cleanUser = {
        id: req.user.id || req.user.user_id,
        full_name: req.user.full_name,
        email: req.user.email,
        profile_picture: req.user.profile_picture,
        provider: req.user.facebook_id ? 'facebook' : (req.user.google_id ? 'google' : 'line'),
        kyc_status: req.user.kyc_status
    };
    
    const userData = JSON.stringify(cleanUser);
    res.redirect(`${EXPO_URL}?data=${encodeURIComponent(userData)}`);
}

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});