import React, { useEffect, useState } from 'react';

function HistoryPage() {
  const [logs, setLogs] = useState([]);

  /* =========================
      FETCH HISTORY (REALTIME)
  ========================= */
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History API error', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(fetchHistory, 5000);
    return () => clearInterval(timer);
  }, []);

  /* =========================
      DOWNLOAD CSV (FOR RESEARCH)
  ========================= */
  const downloadCSV = () => {
    if (logs.length === 0) {
      alert("ไม่มีข้อมูลสำหรับดาวน์โหลด");
      return;
    }
    // หัวตารางให้ตรงกับหน้าเว็บ
    const headers = ["ลำดับ", "วัน / เวลา", "Latitude", "Longitude", "RSSI", "สถานะ"];
    const rows = logs.map((log, index) => [
      index + 1,
      `${formatDate(log.timestamp)} ${formatTime(log.timestamp)}`,
      log.lat,
      log.lng,
      log.rssi,
      log.state
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    // ใส่ \ufeff เพื่อให้ Excel เปิดภาษาไทยได้ถูกต้อง
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartbag_history_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* =========================
      FORMAT DATE & TIME
  ========================= */
  const formatDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const timeAgo = (value) => {
    if (!value) return '';
    const diff = Math.floor((Date.now() - new Date(value)) / 1000);
    if (diff < 5) return 'เมื่อกี้';
    if (diff < 60) return `${diff} วิที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  };

  return (
    <div className="page-content">
      {/* ปรับ Header ให้เป็น Flex เพื่อวางปุ่มไว้ทางขวา */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>📜 ประวัติการเคลื่อนที่ (Log)</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            ข้อมูลย้อนหลัง (ปัดซ้าย-ขวาเพื่อดูข้อมูล)
          </p>
        </div>
        
        {/* เพิ่มปุ่มดาวน์โหลด CSV ตรงนี้ */}
        <button 
          onClick={downloadCSV}
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          📥 Download CSV
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="history-table" style={{ width: '100%', minWidth: '600px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th>วัน / เวลา</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>RSSI</th>
              <th>สถานะ</th>
              <th>แผนที่</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, i) => (
              <tr
                key={i}
                style={{
                  background: i === 0 ? '#ecfeff' : 'transparent'
                }}
              >
                <td>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {formatTime(log.timestamp)} 
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatDate(log.timestamp)} ({timeAgo(log.timestamp)})
                  </div>
                </td>

                <td>{Number(log.lat).toFixed(5)}</td>
                <td>{Number(log.lng).toFixed(5)}</td>
                <td>{log.rssi}</td>

                <td
                  style={{
                    fontWeight: 700,
                    color: log.state === 'WARN' || log.state === 'ALERT' ? '#dc2626' : '#16a34a'
                  }}
                >
                  {log.state}
                </td>

                <td>
                  <a
                    href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ 
                      display: 'inline-block',
                      color: '#2563eb', 
                      fontWeight: 600,
                      background: '#eff6ff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    🗺 เปิด Map
                  </a>
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                  ยังไม่มีข้อมูลประวัติ...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoryPage;