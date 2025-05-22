import React, { useEffect, useState, ChangeEvent } from "react";

type OrderItem = {
  name: string;
  qty: number;
};

type Order = {
  _id: string;
  telegramId: string;
  phone: string;
  items: OrderItem[];
  total: number;
  deliveryOption: string;
  qrFile?: string;
};

const BACKEND_URL = "https://kutabare-backend.onrender.com"; // Update if needed

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setMessage("Failed to load orders.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQrFile(e.target.files[0]);
    }
  };

  const uploadQr = async (orderId: string) => {
    if (!qrFile) {
      alert("Please select a QR code image first.");
      return;
    }

    setUploadingOrderId(orderId);
    setMessage("");

    const formData = new FormData();
    formData.append("qr", qrFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload-qr/${orderId}`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Upload failed.");
      setMessage("QR code uploaded and sent!");
      setQrFile(null);
      fetchOrders();
    } catch (err) {
      setMessage((err as Error).message);
    }

    setUploadingOrderId(null);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Kutabare Order Hub</h1>

      {message && <div style={styles.messageBox}>{message}</div>}

      {loading ? (
        <p style={styles.loadingText}>Loading spicy orders...</p>
      ) : orders.length === 0 ? (
        <p style={styles.emptyText}>No orders yet. Let’s heat things up!</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Telegram</th>
              <th>Contact</th>
              <th>Items</th>
              <th>Total ₱</th>
              <th>Delivery</th>
              <th>QR Code</th>
              <th>Upload</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td style={styles.idCell}>{o._id.slice(-6)}</td>
                <td>{o.telegramId}</td>
                <td>{o.phone}</td>
                <td>
                  <ul>
                    {o.items.map((item, i) => (
                      <li key={i}>
                        {item.name} × {item.qty}
                      </li>
                    ))}
                  </ul>
                </td>
                <td style={styles.totalCell}>₱{o.total}</td>
                <td>{o.deliveryOption}</td>
                <td>
                  {o.qrFile ? (
                    <img
                      src={`${BACKEND_URL}/uploads/${o.qrFile}`}
                      alt="QR Code"
                      style={styles.qrImage}
                    />
                  ) : (
                    <span style={{ color: "#FF4DCB" }}>Not uploaded</span>
                  )}
                </td>
                <td>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploadingOrderId === o._id}
                    style={styles.fileInput}
                  />
                  <button
                    onClick={() => uploadQr(o._id)}
                    disabled={uploadingOrderId === o._id}
                    style={{
                      ...styles.button,
                      backgroundColor:
                        uploadingOrderId === o._id ? "#FF77C6" : "#FF4DCB",
                    }}
                  >
                    {uploadingOrderId === o._id ? "Uploading..." : "Send QR"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer style={styles.footer}>Powered by Kutabare Vibes</footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    fontFamily: "Segoe UI, sans-serif",
    padding: 24,
    backgroundColor: "#121029",
    color: "#E0E0E0",
    minHeight: "100vh",
  },
  header: {
    textAlign: "center",
    fontSize: "2.5rem",
    color: "#FF4DCB",
    textShadow: "0 0 10px #FF4DCB",
    marginBottom: 24,
  },
  messageBox: {
    backgroundColor: "#330033",
    padding: 10,
    borderRadius: 6,
    color: "#FF77C6",
    textAlign: "center",
    marginBottom: 20,
  },
  loadingText: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#FF77C6",
    fontWeight: 500,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#1a103b",
    borderRadius: 8,
  },
  idCell: {
    fontFamily: "monospace",
    color: "#FF77C6",
  },
  totalCell: {
    fontWeight: 700,
    color: "#FF77C6",
  },
  qrImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    boxShadow: "0 0 10px #FF4DCB",
  },
  fileInput: {
    backgroundColor: "#280C3D",
    color: "#E0E0E0",
    padding: 4,
    borderRadius: 4,
    border: "none",
    marginBottom: 6,
  },
  button: {
    border: "none",
    padding: "6px 12px",
    borderRadius: 4,
    color: "#121029",
    fontWeight: 600,
    cursor: "pointer",
  },
  footer: {
    textAlign: "center",
    marginTop: 40,
    color: "#630073",
    fontStyle: "italic",
  },
};
