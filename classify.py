

"""
classify.py - Decides what KIND of website the traffic came from.

WHAT THIS FILE DOES (in plain English):
----------------------------------------
After we've captured and measured the network traffic, this file
looks at those measurements and answers the question:

  "Based on HOW this site behaves on the network... what type of site is it?"

The 4 categories we can detect:
  1. Streaming     → Netflix, YouTube, Twitch (big files, lots of data)
  2. Social Media  → Instagram, Twitter (many servers, small quick requests)
  3. Static        → Simple blog or docs page (very few packets, quiet)
  4. API-Heavy     → dashboards, SPAs like Gmail (tiny JSON requests, fast)

HOW THE SCORING WORKS:
------------------------
We give each category a "score" from 0 to 100 based on how well
the traffic matches its expected pattern. Think of it like a quiz:
  - Each matching rule adds points
  - The category with the MOST points wins
  - If no category scores above 40, we call it "Unknown"

Example for Streaming:
  ✅ Total data > 500 KB    → +40 points
  ✅ Average packet > 800B  → +35 points
  ❌ TCP % < 60%            → +0 points
  Final score = 75 → "Streaming" with 75% confidence
"""

import logging

logger = logging.getLogger(__name__)


# ── Thresholds (the rules for each category) 

RULES = {

    # ── Streaming (e.g. Netflix, YouTube)
    # Signs: lots of data, big packets, mostly TCP
    "Streaming": {
        "min_total_kb": 500,           # Must have transferred at least 500 KB
        "min_mean_packet_size": 800,   # Average packet bigger than 800 bytes
        "min_tcp_percent": 60,         # At least 60% of traffic is TCP
    },

    # ── Social Media (e.g. Instagram, Twitter) ────────────────────────────────
    # Signs: talks to many servers, smaller packets, lots of DNS lookups
    "Social Media": {
        "min_unique_ips": 5,           # Contacted at least 5 different servers
        "max_mean_packet_size": 600,   # Average packet smaller than 600 bytes
        "min_dns_queries": 3,          # Made at least 3 DNS lookups
    },

    # ── Static Content (e.g. a simple blog or docs page) ─────────────────────
    # Signs: very few packets, minimal DNS, only 1-2 servers
    "Static Content": {
        "max_total_packets": 100,      # Fewer than 100 packets total
        "max_dns_queries": 2,          # At most 2 DNS lookups
        "max_unique_ips": 3,           # Talked to at most 3 servers
    },

    # ── API-Heavy (e.g. Gmail, dashboards, SPAs) 
    # Signs: tiny packets (JSON), almost all HTTPS, very fast packet rate
    "API-Heavy": {
        "max_mean_packet_size": 300,   # Very small packets (tiny JSON payloads)
        "min_https_percent": 70,       # At least 70% is HTTPS traffic
        "min_packets_per_second": 5,   # Sends/receives 5+ packets every second
    },
}


# ── Helper: Get Protocol Percentage 

def get_protocol_percent(fingerprint: dict, protocol_name: str) -> float:
    return fingerprint.get("protocol_distribution", {}).get(protocol_name, 0.0)


# ── Main Classification Function 

def classify_behavior(fingerprint: dict) -> tuple:

    # ── Pull out the stats we need from the fingerprint 
    total_kb = fingerprint.get("total_kb", 0)
    total_packets = fingerprint.get("total_packets", 0)
    mean_packet_size = fingerprint.get("mean_packet_size", 0)
    unique_ip_count = fingerprint.get("unique_ip_count", 0)
    dns_query_count = fingerprint.get("dns_query_count", 0)

    duration_seconds = fingerprint.get("capture_duration_sec", 1) or 1

    tcp_percent = get_protocol_percent(fingerprint, "TCP")
    https_percent = get_protocol_percent(fingerprint, "HTTPS")

    tcp_plus_https_percent = tcp_percent + https_percent

    packet_rate = total_packets / duration_seconds

    # ── Score Each Category 
    # Each category starts at 0. We add points for each rule that matches.

    scores = {}

    # ─ Score: Streaming 
    streaming_score = 0
    rules = RULES["Streaming"]

    if total_kb >= rules["min_total_kb"]:
        streaming_score += 40    
    if mean_packet_size >= rules["min_mean_packet_size"]:
        streaming_score += 35    
    if tcp_plus_https_percent >= rules["min_tcp_percent"]:
        streaming_score += 25    
    scores["Streaming"] = streaming_score

    # ─ Score: Social Media 
    social_score = 0
    rules = RULES["Social Media"]

    if unique_ip_count >= rules["min_unique_ips"]:
        social_score += 40       
    if mean_packet_size <= rules["max_mean_packet_size"]:
        social_score += 30       
    if dns_query_count >= rules["min_dns_queries"]:
        social_score += 30       
    scores["Social Media"] = social_score

    # ─ Score: Static Content 
    static_score = 0
    rules = RULES["Static Content"]

    if total_packets <= rules["max_total_packets"]:
        static_score += 40       # Very few packets = simple page
    if dns_query_count <= rules["max_dns_queries"]:
        static_score += 30       # Minimal DNS = few external resources
    if unique_ip_count <= rules["max_unique_ips"]:
        static_score += 30       # Only talks to 1-2 servers

    scores["Static Content"] = static_score

    # ─ Score: API-Heavy 
    api_score = 0
    rules = RULES["API-Heavy"]

    if mean_packet_size <= rules["max_mean_packet_size"]:
        api_score += 35          # Tiny packets = small JSON responses
    if https_percent >= rules["min_https_percent"]:
        api_score += 35          # Almost all HTTPS = secure API calls
    if packet_rate >= rules["min_packets_per_second"]:
        api_score += 30          # High packet rate = lots of quick requests

    scores["API-Heavy"] = api_score

    # ── Log the scores so you can see what happened 
    logger.info(f"Category scores: {scores}")

    # ── Pick the Winner
    best_label = max(scores, key=scores.get)
    best_score = scores[best_label]

    if best_score < 40:
        logger.info("No strong match found → returning 'Unknown'")
        return "Unknown", 0

    confidence = min(best_score, 100)

    logger.info(f"Result: {best_label} with {confidence}% confidence")
    return best_label, confidence