
"""
app.py - The main web server. This is where everything starts.

WHAT THIS FILE DOES (in plain English):
----------------------------------------
This file creates a small web server using Flask.
Think of Flask like a waiter in a restaurant:
  - A customer (your browser) sends a REQUEST ("I want to analyze google.com")
  - The waiter (Flask) takes that request to the kitchen (our analysis code)
  - The kitchen does the work and gives back a RESPONSE (the fingerprint data)

This server has 3 "routes" (like 3 different pages/actions):
  1. "/"              → Shows the homepage (the HTML page in templates/)
  2. "/api/analyze"   → Analyzes ONE website and returns its fingerprint
  3. "/api/compare"   → Analyzes TWO websites and compares them side by side

HOW THE FULL PIPELINE WORKS:
------------------------------
When you ask to analyze a website, these 4 steps happen in order:

  URL input
     ↓
  capture.py   → visits the site and records network packets (.pcap file)
     ↓
  extract.py   → reads the .pcap and pulls out useful numbers/stats
     ↓
  fingerprint.py → packages those stats into a clean JSON object
     ↓
  classify.py  → looks at the JSON and gives it a behavior label
                 (e.g. "Streaming", "Social Media", "Static Content")
"""

from flask import Flask, request, jsonify, render_template
import socket       
import os           
import time         
import logging      

# Import our own modules (the other .py files in this project)
from capture import capture_traffic       
from extract import extract_features      
from fingerprint import generate_fingerprint  
from classify import classify_behavior    

# ── App Setup 

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
os.makedirs("temp_pcaps", exist_ok=True)


# ── Helper: DNS Lookup 
def get_ip_addresses(url: str) -> list:
    try:
        hostname = url.replace("https://", "").replace("http://", "").split("/")[0]

        dns_results = socket.getaddrinfo(hostname, None)
        ip_list = list({r[4][0] for r in dns_results})  

        logger.info(f"Looked up {hostname} → found IPs: {ip_list}")
        return ip_list

    except Exception as error:
        logger.warning(f"DNS lookup failed for {url}: {error}")
        return []  


# ── Core Analysis Pipeline 
def analyze_website(url: str, pcap_save_path: str) -> dict:

    target_ips = get_ip_addresses(url)
    logger.info(f"Step 1: Capturing traffic for {url}...")
    capture_traffic(url, pcap_save_path, duration=10, filter_ips=target_ips)

    logger.info("Step 2: Extracting features from the recording...")
    features = extract_features(pcap_save_path)

    logger.info("Step 3: Building fingerprint...")
    fingerprint = generate_fingerprint(url, features)

    logger.info("Step 4: Classifying behavior...")
    behavior_label, confidence_score = classify_behavior(fingerprint)

    fingerprint["behavior_label"] = behavior_label
    fingerprint["confidence"] = confidence_score

    return fingerprint


# ── Routes (Pages / API Endpoints)

@app.route("/")
def homepage():
    """
    Shows the main HTML page when you open the app in your browser.
    The HTML file lives at: templates/index.html
    """
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    API endpoint: analyze a single website.

    HOW TO USE:
    Send a POST request with JSON body: { "url": "https://google.com" }
    Returns: { "success": true, "fingerprint": { ...stats... } }

    A POST request is like submitting a form — you're SENDING data to the server.
    We use JSON (a simple data format) to send and receive data.
    """
    request_data = request.get_json()
    url = request_data.get("url", "").strip()

    if not url:
        return jsonify({"error": "Please provide a URL"}), 400
    pcap_path = f"temp_pcaps/capture_{int(time.time())}.pcap"

    try:
        fingerprint = analyze_website(url, pcap_path)
        return jsonify({"success": True, "fingerprint": fingerprint})

    except Exception as error:
        logger.error(f"Analysis failed for {url}: {error}", exc_info=True)
        return jsonify({"error": f"Analysis failed: {str(error)}"}), 500

    finally:
        if os.path.exists(pcap_path):
            os.remove(pcap_path)
            logger.info(f"Cleaned up temp file: {pcap_path}")


@app.route("/api/compare", methods=["POST"])
def compare():
    request_data = request.get_json()
    url1 = request_data.get("url1", "").strip()
    url2 = request_data.get("url2", "").strip()

    if not url1 or not url2:
        return jsonify({"error": "Please provide both url1 and url2"}), 400

    pcap1 = f"temp_pcaps/site1_{int(time.time())}.pcap"
    pcap2 = f"temp_pcaps/site2_{int(time.time())}.pcap"

    try:
        logger.info(f"Comparing {url1} vs {url2}...")

        fingerprint1 = analyze_website(url1, pcap1)
        fingerprint2 = analyze_website(url2, pcap2)

        comparison = compare_fingerprints(fingerprint1, fingerprint2)

        return jsonify({
            "success": True,
            "fingerprint1": fingerprint1,
            "fingerprint2": fingerprint2,
            "diff": comparison
        })

    except Exception as error:
        logger.error(f"Comparison failed: {error}", exc_info=True)
        return jsonify({"error": f"Comparison failed: {str(error)}"}), 500

    finally:
        # Clean up both temp files
        for path in [pcap1, pcap2]:
            if os.path.exists(path):
                os.remove(path)


# ── Comparison Helper
def compare_fingerprints(fp1: dict, fp2: dict) -> dict:
    def compare_one_metric(value1, value2) -> dict:
        """Compare a single metric between two sites."""
        if value1 == value2:
            return {"winner": "tie", "delta": 0}

        winner = "site1" if value1 > value2 else "site2"
        difference = round(abs(value1 - value2), 2)
        return {"winner": winner, "delta": difference}

    return {
        "total_bytes": compare_one_metric(fp1["total_bytes"], fp2["total_bytes"]),

        "total_packets": compare_one_metric(fp1["total_packets"], fp2["total_packets"]),

        "unique_ips": compare_one_metric(
            len(fp1["unique_ips"]),
            len(fp2["unique_ips"])
        ),

        "mean_packet_size": compare_one_metric(
            fp1["mean_packet_size"],
            fp2["mean_packet_size"]
        ),

        "behavior_labels": {
            "site1": fp1["behavior_label"],
            "site2": fp2["behavior_label"]
        }
    }


# ── Start the Server 

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  Network Fingerprint Generator")
    print("  Open your browser and go to: http://127.0.0.1:5000")
    print("  IMPORTANT: Run with sudo/admin for packet capture to work")
    print("=" * 60 + "\n")

    app.run(debug=True, host="0.0.0.0", port=5000)