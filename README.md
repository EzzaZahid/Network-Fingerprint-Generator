# Network-Fingerprint-Generator
This project presents a web-based Network Fingerprint Generator and Website Behavior Profiler.This project presents a web-based Network Fingerprint Generator and Website Behavior Profiler


---

## 📡 API Reference

### `POST /api/analyze`

Analyze a single website and return its fingerprint.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "fingerprint": { ... }
}
```

---

### `POST /api/compare`

Analyze two websites and return both fingerprints with a diff.

**Request:**
```json
{
  "url1": "https://netflix.com",
  "url2": "https://wikipedia.org"
}
```

**Response:**
```json
{
  "success": true,
  "fingerprint1": { ... },
  "fingerprint2": { ... },
  "diff": {
    "total_bytes":       { "winner": "site1", "delta": 482301 },
    "total_packets":     { "winner": "site1", "delta": 310 },
    "unique_ips":        { "winner": "site1", "delta": 7 },
    "mean_packet_size":  { "winner": "site2", "delta": 112.4 },
    "behavior_labels":   { "site1": "Streaming", "site2": "Static Content" }
  }
}
```

---




---

## 🏷️ Behavior Classification

The classifier scores each fingerprint against four categories.
The highest score wins. Minimum 40 points required — otherwise labeled **Unknown**.

| Category | Signals | Max Score |
|---|---|---|
| **Streaming** | High data volume, large packets (≥800B), mostly TCP/HTTPS | 100 |
| **Social Media** | Many servers (≥5 IPs), small packets, frequent DNS lookups | 100 |
| **Static Content** | Few packets (≤100), minimal DNS (≤2), very few servers | 100 |
| **API-Heavy** | Tiny packets (≤300B), high HTTPS %, fast packet rate (≥5 pps) | 100 |
| **Unknown** | No category scores above 40 | — |

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Python 3.x |
| Web framework | Flask |
| Packet capture | Scapy |
| HTTP requests | requests |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| Packet storage | .pcap (temporary, auto-deleted) |
| Data exchange | JSON |



