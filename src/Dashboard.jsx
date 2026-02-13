import React, { useState, useEffect } from "react";
import mqtt from "mqtt";
import "./App.css";

export default function DashboardPage() {
  const [client, setClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("Connecting...");
  
  const [systemData, setSystemData] = useState({
    battery: 85,
    isSafe: true,
    last_update: "-",
  });

  // ตั้งค่าเริ่มต้นเป็นพิกัด (เช่น ภูเก็ต)
  const [position, setPosition] = useState([7.885490, 98.377586]); 
  const [hasGPS, setHasGPS] = useState(false);
  
  // สถานะปุ่มกด (Start/Stop)
  const [findMeStatus, setFindMeStatus] = useState(false);

  useEffect(() => {
    // 🔥 แก้ไขจุดที่ 1: เชื่อมต่อ VPS ของคุณ (Port 9001)
    const mqttUrl = "wss://smartbag.cloud/mqtt";
    const clientId = 'WebClient_' + Math.random().toString(16).substr(2, 8);
    
    console.log(`📡 Connecting to ${mqttUrl} as ${clientId}...`);

    const mqttClient = mqtt.connect(mqttUrl, {
      clientId: clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    });

    mqttClient.on('connect', () => {
      setMqttStatus("ONLINE (VPS)");
      console.log("✅ MQTT Connected to VPS Success!");
      
      // 🔥 แก้ไขจุดที่ 2: Subscribe หัวข้อรับข้อมูลให้ตรงกับ ESP32
      mqttClient.subscribe('smartbag/gps', (err) => {
        if (!err) console.log("✅ Subscribed to smartbag/gps");
      });
    });

    mqttClient.on('error', (err) => {
      console.error("❌ MQTT Connection Error:", err);
      setMqttStatus("ERROR");
      mqttClient.end();
    });

    mqttClient.on('offline', () => {
      console.log("⚠️ MQTT Offline");
      setMqttStatus("OFFLINE");
    });

    mqttClient.on('message', (topic, message) => {
      // 🔥 แก้ไขจุดที่ 3: เช็คหัวข้อให้ถูกต้อง
      if (topic === 'smartbag/gps') {
        try {
          const msgString = message.toString();
          console.log("📥 New Data Received:", msgString);
          const data = JSON.parse(msgString);

          // 1. อัปเดตข้อมูลทั่วไป
          setSystemData(prev => ({
            ...prev,
            isSafe: data.state === "SAFE",
            last_update: new Date().toLocaleTimeString("th-TH")
          }));

          // 2. อัปเดตพิกัด GPS
          if (data.lat && data.lng) {
            setPosition([data.lat, data.lng]);
            setHasGPS(true);
          }

          // 3. Real-time Sync ปุ่ม
          if (data.buzzer !== undefined) {
          console.log("🔄 Sync Buzzer Status:", data.buzzer);
          setFindMeStatus(data.buzzer); 
           }

        } catch (e) {
          console.error("❌ Parse Error:", e);
        }
      }
    });

    setClient(mqttClient);

    return () => {
      if (mqttClient) {
        console.log("🔌 Disconnecting MQTT...");
        mqttClient.end();
      }
    };
  }, []);

  const toggleFindMe = () => {
    if (!client || !client.connected) {
      alert("⚠️ ยังไม่เชื่อมต่อ MQTT กรุณารอสักครู่...");
      return;
    }

    // Logic: ถ้าปุ่มแดง หรือ ไม่ปลอดภัย -> ส่งปิด (CMD_CLOSE)
   // Logic: กดเพื่อสลับสถานะ (Toggle)
    const cmd = findMeStatus ? "CMD_CLOSE" : "CMD_OPEN";
    
    // ส่งคำสั่งไปที่ topic 'smartbag/alert'
    client.publish('smartbag/alert', cmd, { qos: 0, retain: false });
    
    console.log("📤 Sent Command:", cmd);

    // อัปเดตสถานะปุ่มทันที
    setFindMeStatus(!findMeStatus);
  };

  return (
    <div className="page-content">
      <div className="header">
        <div>
          <h1>ศูนย์ควบคุมอัจฉริยะ</h1>
          <h2>Smart Bag Monitoring System Dashboard</h2>
        </div>

        <div className="status-container">
          <div
            className={`status ${mqttStatus.includes("ONLINE") ? "is-success" : "is-error"}`}
            style={{
              backgroundColor: mqttStatus.includes("ONLINE") ? "#d1fae5" : "#fee2e2",
              color: mqttStatus.includes("ONLINE") ? "#065f46" : "#991b1b",
              border: mqttStatus.includes("ONLINE") ? "1px solid #10b981" : "1px solid #ef4444",
            }}
          >
            {mqttStatus}
          </div>
          <span className="status-detail">
            {hasGPS ? "Receiving GPS Data..." : "Waiting for GPS..."}
          </span>
        </div>
      </div>

      <div className="dashboard">
        <div className="card main-status-card">
          <div className="card-title">⚙️ สรุปสถานะโดยรวม</div>
          <div className="main-stats-row">
            <div>
              <div className="big">{systemData.battery}%</div>
              <div className="sub-detail-row">แบตเตอรี่ </div>
            </div>
            <div
              className="safety-status-value"
              style={{
                color: systemData.isSafe ? "#10b981" : "#ef4444",
                fontWeight: "bold"
              }}
            >
              {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
            </div>
          </div>
          <div className="sub-stats-row">
            <div className="sub-stat-item">
              <span className="sub-label">อัปเดตล่าสุด</span>
              <span className="sub-value">{systemData.last_update}</span>
            </div>
            <div className="sub-stat-item">
              <span className="sub-label">การเชื่อมต่อ</span>
              <span className="sub-value" style={{ fontWeight: 'bold', color: '#0284c7' }}>
                4G System
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔊 Find Me (ค้นหากระเป๋า)</div>
          <button
            className="btn"
            style={{ 
              backgroundColor: findMeStatus ? "#ef4444" : "#3b82f6",
              color: "white",
              fontWeight: "bold",
              padding: "15px",
              fontSize: "1.1rem",
              cursor: "pointer",
              border: "none",
              borderRadius: "8px",
              width: "100%"
            }}
            onClick={toggleFindMe}
          >
            {findMeStatus ? "⏹ หยุดส่งเสียง (STOP)" : "🔊 สั่งให้ส่งเสียง (START)"}
          </button>
        </div>

        <div className="card map-card" style={{ padding: 0, overflow: "hidden" }}>
          <iframe
            title="Realtime Map"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 400 }}
            loading="lazy"
            // 🔥 แก้ไขจุดที่ 5: ใช้ Link Google Maps Embed ที่ถูกต้อง
            src={`https://maps.google.com/maps?q=${position[0]},${position[1]}&z=15&output=embed`}
          />
        </div>
      </div>
    </div>
  );
}