import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

/* =========================
   SETUP ENV & PATHS
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ให้ Server นี้ทำหน้าที่เปิดหน้าเว็บที่ Build แล้วด้วย (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

/* =========================
   CONFIG LINE OA (แจ้งเตือนไลน์)
========================= */
const LINE_OA_TOKEN = 'w3IQ6GcROqOxzJ+JYmhH17bcWc7hkThiwrFxm6LbrA0v915DNWjHI0xkU9nQqTHBiJsTVs+oqX6AqKOyGA8WuaNZ7x8thmL1W3J9N7xuNxmljDyk8mBrmmapUQdA6+3GyaEiztqXqp5C0XdGWbl8FQdB04t89/1O/w1cDnyilFU=';
const MY_USER_ID = 'U3c348ad3d07006159e2e6314f18b83c8'; 

let lastLineState = "NORMAL"; 

/* =========================
   MySQL CONFIG (ปรับเพื่อรันบน VPS) ☁️
========================= */
const db = mysql.createPool({
  host: 'db',    
  user: 'admin',       
  password: '1234',    
  database: 'smartbag_db', 
  waitForConnections: true,
  connectionLimit: 10
});

// ส่วน MQTT ให้เปลี่ยนเป็น localhost เพื่อความเสถียร
const MQTT_BROKER = 'mqtt://mqtt';
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('✅ MQTT Connected locally on VPS');
  client.subscribe('smartbag/gps', (err) => {
    if (!err) console.log("📡 Subscribed to smartbag/gps");
  });
});

client.on('message', (topic, message) => {
  if (topic === 'smartbag/gps') {
    const msgString = message.toString();
    console.log('📥 Data Received:', msgString);

    try {
      const data = JSON.parse(msgString);
      const state = data.state || 'SAFE'; 
      const rssi = -65; 

      if (state !== lastLineState) {
          let messageText = "";
          if (state === 'ALERT') {
              messageText = `⚠️ ALERT! \nกระเป๋าถูกตัดขาด!\nพิกัดล่าสุด: https://www.google.com/maps?q=${data.lat},${data.lng}`;
          } else if (state === 'SAFE' && lastLineState === 'ALERT') {
              messageText = `✅ SAFE \nกระเป๋ากลับมาปลอดภัยแล้ว`;
          }

          if (messageText !== "") {
            sendLineMessage(messageText);
            lastLineState = state;
          }
      }

      // บันทึกลงฐานข้อมูล MariaDB บน VPS
      const sql = `INSERT INTO tracking (lat, lng, rssi, state) VALUES (?, ?, ?, ?)`;
      db.query(sql, [data.lat, data.lng, rssi, state], (err) => {
        if (err) console.error('❌ DB Insert Error:', err);
        else console.log('💾 Data Saved to VPS MariaDB');
      });

    } catch (e) {
      console.error('❌ Error parsing MQTT JSON:', e);
    }
  }
});

const sendLineMessage = (text) => {
    axios.post('https://api.line.me/v2/bot/message/push', {
        to: MY_USER_ID,
        messages: [{ type: 'text', text: text }]
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_OA_TOKEN}`
        }
    }).then(() => {
        console.log(`>> LINE SENT: ${text.split('\n')[0]}`);
    }).catch(err => console.error('>> LINE Error:', err.message));
};

/* =========================
   API FOR WEB DASHBOARD
========================= */
app.get('/api/history', (req, res) => {
  const sql = `SELECT * FROM tracking ORDER BY id DESC LIMIT 100`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/start', (req, res) => {
  client.publish('smartbag/alert', 'CMD_OPEN'); 
  res.json({ status: 'OPEN SENT' });
});

app.post('/api/stop', (req, res) => {
  client.publish('smartbag/alert', 'CMD_CLOSE'); 
  res.json({ status: 'CLOSE SENT' });
});

/* =========================
   SERVER START & FRONTEND
========================= */
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000; 
app.listen(PORT, () => {
  console.log(`🚀 VPS Cloud Server running on Port ${PORT}`);
});