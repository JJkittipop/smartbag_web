import React, { useState, useEffect } from "react";
import mqtt from "mqtt";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// -------------------------------------------------------------------
// 🔴 1. สร้างตัวแปรดึงรูป "หมุดสีแดง" (Red Marker)
// -------------------------------------------------------------------
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ฟังก์ชันสั่งให้แผนที่ขยับตามเวลาเลขพิกัดเปลี่ยน (Real-time)
function MapRecenter({ position, isAutoPan }) {
  const map = useMap();
  useEffect(() => {
    if (isAutoPan) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, isAutoPan, map]);
  return null;
}

export default function DashboardPage() {
  const [client, setClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("Connecting...");

  const [systemData, setSystemData] = useState({
    battery: 85,
    isSafe: true,
    last_update: "-",
    signal: 80, 
  });

  const [position, setPosition] = useState([7.885490, 98.377586]);
  const [hasGPS, setHasGPS] = useState(false);
  const [findMeStatus, setFindMeStatus] = useState(false);
  const [volume, setVolume] = useState(50);
  
  const [isAutoPan, setIsAutoPan] = useState(true); 

  useEffect(() => {
    const mqttUrl = "wss://smartbag.cloud/mqtt";
    const clientId = "WebClient_" + Math.random().toString(16).substr(2, 8);

    const mqttClient = mqtt.connect(mqttUrl, {
      clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    });

    mqttClient.on("connect", () => {
      setMqttStatus("ONLINE (VPS)");
      mqttClient.subscribe("smartbag/gps");
    });

    mqttClient.on("error", () => {
      setMqttStatus("ERROR");
      mqttClient.end();
    });

    mqttClient.on("offline", () => {
      setMqttStatus("OFFLINE");
    });

    mqttClient.on("message", (topic, message) => {
      if (topic === "smartbag/gps") {
        try {
          const data = JSON.parse(message.toString());

          setSystemData((prev) => ({
            ...prev,
            isSafe: data.state === "SAFE",
            last_update: new Date().toLocaleTimeString("th-TH"),
            battery: data.battery !== undefined ? data.battery : prev.battery,
            signal: data.signal !== undefined ? data.signal : prev.signal,
          }));

          if (data.lat && data.lng) {
            setPosition([data.lat, data.lng]);
            setHasGPS(true);
          }

          if (data.buzzer !== undefined) {
            setFindMeStatus(data.buzzer);
          }
        } catch (e) {
          console.error("Parse Error:", e);
        }
      }
    });

    setClient(mqttClient);

    return () => mqttClient.end();
  }, []);

  const toggleFindMe = () => {
    if (!client || !client.connected) {
      alert("⚠️ ยังไม่เชื่อมต่อ MQTT");
      return;
    }

    const cmd = findMeStatus ? "CMD_CLOSE" : "CMD_OPEN";
    client.publish("smartbag/alert", cmd);
    setFindMeStatus(!findMeStatus);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);

    if (client && client.connected) {
      client.publish("smartbag/alert", `VOL:${newVol}`);
    }
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
            className={`status ${
              mqttStatus.includes("ONLINE") ? "is-success" : "is-error"
            }`}
          >
            {mqttStatus}
          </div>

          {/* 🔴 ปรับจุดที่ 1: แถบสถานะมุมขวาบนให้ชัดเจนขึ้น */}
          <span className="status-detail" style={{ 
            color: hasGPS ? '#22c55e' : '#eab308',
            fontWeight: 'bold',
            background: hasGPS ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            padding: '4px 10px',
            borderRadius: '15px',
            marginLeft: '10px'
          }}>
            {hasGPS ? "📍 GPS Fixed (พร้อมใช้งาน)" : "⏳ กำลังค้นหาดาวเทียม..."}
          </span>
        </div>
      </div>

      <div className="dashboard">
        {/* เลนซ้าย: สรุปสถานะ & Find Me */}
        <div>
          {/* STATUS CARD */}
          <div className="card main-status-card" style={{ marginBottom: '20px' }}>
            <div className="card-title">⚙ สรุปสถานะโดยรวม</div>

            <div className="main-stats-row">
              <div>
                <div className="big" style={{
                  color: '#22c55e',
                  WebkitTextFillColor: '#22c55e',
                  textShadow: '0 0 15px rgba(34, 197, 94, 0.8)',
                  fontWeight: 'bold'
                }}>
                  {systemData.battery}%
                </div>
                <div className="sub-detail-row">แบตเตอรี่</div>
              </div>

              <div
                className="safety-status-value"
                style={{
                  color: systemData.isSafe ? "#22d3ee" : "#ef4444"
                }}
              >
                {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
              </div>
            </div>

            {/* 🔴 ปรับจุดที่ 2: เพิ่มช่องสถานะ GPS ลงในการ์ดสรุป */}
            <div className="sub-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <div className="sub-label">อัปเดตล่าสุด</div>
                <div className="sub-value">{systemData.last_update}</div>
              </div>

              <div>
                <div className="sub-label">สัญญาณ 4G</div>
                <div className="sub-value">
                  <span style={{
                    color: systemData.signal > 60 ? '#22c55e' : systemData.signal > 20 ? '#eab308' : '#ef4444',
                    textShadow: systemData.signal > 60 ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none'
                  }}>
                    {systemData.signal > 60 ? '📶 สัญญาณดี' : systemData.signal > 20 ? '📶 ปานกลาง' : '📵 อ่อน'}
                  </span>
                </div>
              </div>

              <div>
                <div className="sub-label">สัญญาณ GPS</div>
                <div className="sub-value">
                  <span style={{ color: hasGPS ? '#22c55e' : '#eab308' }}>
                    {hasGPS ? '🛰️ 3D Fix' : '🔍 No Fix'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FIND ME CARD */}
          <div className="card">
            <div className="card-title">🔊 Find Me (ค้นหากระเป๋า)</div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "0.9rem" }}>
                ระดับเสียง: <b>{volume}%</b>
              </label>

              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                style={{ width: "100%" }}
              />
            </div>

            <button
              className="btn"
              style={{
                background: findMeStatus
                  ? "linear-gradient(135deg,#ef4444,#dc2626)"
                  : undefined,
              }}
              onClick={toggleFindMe}
            >
              {findMeStatus
                ? "⏹ หยุดส่งเสียง (STOP)"
                : "🔊 สั่งให้ส่งเสียง (START)"}
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* MAP CARD */}
        {/* ----------------------------------------------------------- */}
        <div className="card map-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '500px' }}>
          
          <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000 }}>
            <button 
              onClick={() => setIsAutoPan(!isAutoPan)}
              style={{
                background: isAutoPan ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#4b5563',
                color: 'white', border: 'none', padding: '10px 18px', borderRadius: '30px',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              {isAutoPan ? "✅ ล็อกเป้าหมาย (Live)" : "📍 เลื่อนแผนที่อิสระ"}
            </button>
          </div>

          <MapContainer center={position} zoom={16} style={{ flex: 1, width: "100%", height: "100%", borderRadius: '10px', zIndex: 1 }}>
            
            <TileLayer 
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
              attribution="&copy; Google Maps"
            />
            
            <MapRecenter position={position} isAutoPan={isAutoPan} />
            
            <Marker position={position} icon={redIcon}>
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '180px' }}>
                  <b style={{ fontSize: '1.1em' }}>🎒 กระเป๋าของเจ</b><br/>
                  <hr style={{ margin: '5px 0', borderColor: '#eee' }} />
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✓ พิกัดดาวเทียม (Fixed)</span><br/>
                  <span style={{ fontSize: '0.85em', color: '#666' }}>
                    เวลา: {systemData.last_update}<br/>
                    Lat: {position[0].toFixed(5)}<br/>
                    Lng: {position[1].toFixed(5)}
                  </span>
                  
                  {/* 🔴 เพิ่มปุ่มวาร์ปไปดู Street View ตรงนี้! */}
                  <a 
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position[0]},${position[1]}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      marginTop: '10px',
                      padding: '8px 10px',
                      backgroundColor: '#4285F4',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    🚶‍♂️ ดูภาพสถานที่จริง (Street View)
                  </a>
                </div>
              </Popup>
            </Marker>

          </MapContainer>
        </div>
      </div>
    </div>
  );
}