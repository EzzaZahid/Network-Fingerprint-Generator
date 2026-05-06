








"""
extract.py - Reads the .pcap file and pulls out useful statistics.

WHAT THIS FILE DOES (in plain English):
----------------------------------------
After capture.py records the network traffic into a .pcap file,
THIS file opens that recording and computes useful numbers from it.

Think of it like a sports analyst watching a game recording and
computing stats: total goals, average possession, shots per minute, etc.

The stats we extract:
  - How many packets were captured
  - Total bytes transferred
  - Average / min / max packet size
  - What protocols were used (HTTPS, DNS, TCP, etc.)
  - Which IP addresses were contacted
  - Which domain names were looked up (DNS queries)
  - How traffic was spread over time (timeline)
  - Distribution of packet sizes (histogram)

WHAT IS A PROTOCOL?
A protocol is a "language" or "ruleset" computers use to communicate.
  - HTTPS → secure web browsing
  - DNS   → looking up IP addresses from domain names
  - TCP   → reliable data transfer (used by HTTP, HTTPS)
  - UDP   → fast but unreliable transfer (used by video calls, games)
  - ICMP  → network diagnostics (like "ping")
  - ARP   → finding devices on your local network
"""

import logging
from collections import defaultdict   # Like a regular dict, but auto-creates missing keys
from scapy.all import rdpcap, IP, TCP, UDP, DNS, ICMP, ARP

logger = logging.getLogger(__name__)


# ── Protocol Detection 

def get_packet_protocol(packet) -> str:
    if packet.haslayer(DNS):
        return "DNS"

    if packet.haslayer(TCP):
        tcp_layer = packet[TCP]
        # dport = destination port, sport = source port
        if tcp_layer.dport == 443 or tcp_layer.sport == 443:
            return "HTTPS"    # Port 443 = secure HTTPS
        if tcp_layer.dport == 80 or tcp_layer.sport == 80:
            return "HTTP"     # Port 80 = plain HTTP
        return "TCP"          # Some other TCP connection

    if packet.haslayer(UDP):
        return "UDP"

    if packet.haslayer(ICMP):
        return "ICMP"         # e.g. ping requests

    if packet.haslayer(ARP):
        return "ARP"          # Local network device lookup

    return "OTHER"


# ── Main Feature Extraction 
def extract_features(pcap_path: str) -> dict:

    try:
        packets = rdpcap(pcap_path)
    except Exception as error:
        logger.error(f"Could not read file {pcap_path}: {error}")
        return empty_features()

    if not packets:
        logger.warning("The .pcap file is empty — returning zero stats")
        return empty_features()

    logger.info(f"Reading {len(packets)} packets from {pcap_path}...")

    # ── Collect raw data from each packet 

    packet_sizes = []        # Size of each packet in bytes
    protocol_counts = defaultdict(int)   # How many packets per protocol
    destination_ips = []     # IP addresses packets were sent TO
    destination_ports = []   # Port numbers packets were sent TO
    dns_query_names = []     # Domain names that were looked up
    timestamps = []          # When each packet arrived (in seconds)

    bytes_per_second = defaultdict(int)

    start_time = float(packets[0].time)

    for packet in packets:
        arrival_time = float(packet.time)
        size = len(packet)   

        packet_sizes.append(size)
        timestamps.append(arrival_time)

        second_number = int(arrival_time - start_time)
        bytes_per_second[second_number] += size

        protocol = get_packet_protocol(packet)
        protocol_counts[protocol] += 1

        if packet.haslayer(IP):
            destination_ips.append(packet[IP].dst)

        if packet.haslayer(TCP):
            destination_ports.append(packet[TCP].dport)
        elif packet.haslayer(UDP):
            destination_ports.append(packet[UDP].dport)

        if packet.haslayer(DNS) and packet[DNS].qr == 0:
            try:
                domain = packet[DNS].qd.qname.decode("utf-8", errors="ignore").rstrip(".")
                if domain:
                    dns_query_names.append(domain)
            except Exception:
                pass   # Skip malformed DNS packets silently

    # ── Compute Summary Statistics

    total_packets = len(packet_sizes)
    total_bytes = sum(packet_sizes)

    # Average packet size (guard against dividing by zero)
    mean_size = round(total_bytes / total_packets, 2) if total_packets > 0 else 0

    # Time between each pair of consecutive packets (gap in seconds)
    inter_arrival_times = []
    for i in range(1, len(timestamps)):
        gap = timestamps[i] - timestamps[i - 1]
        if gap >= 0:
            inter_arrival_times.append(round(gap, 6))

    # ── Protocol Distribution (percentages) 
    # Instead of raw counts, convert to "% of all packets"
    protocol_distribution = {}
    for protocol, count in protocol_counts.items():
        percentage = round((count / total_packets) * 100, 2)
        protocol_distribution[protocol] = percentage

    # ── Timeline: fill in missing seconds with 0
    # If nothing happened in second 3, still include "3": 0 in the output
    if bytes_per_second:
        last_second = max(bytes_per_second.keys())
        full_timeline = {
            str(s): bytes_per_second.get(s, 0)
            for s in range(last_second + 1)
        }
    else:
        full_timeline = {}

    # ── Packet Size Histogram 
    size_histogram = build_size_histogram(packet_sizes)

    # ── How long did the capture last? 
    if len(timestamps) > 1:
        capture_duration = round(timestamps[-1] - timestamps[0], 2)
    else:
        capture_duration = 0

    # ── Return everything as a dictionary 
    return {
        "total_packets": total_packets,
        "total_bytes": total_bytes,
        "packet_sizes": packet_sizes,
        "mean_packet_size": mean_size,
        "min_packet_size": min(packet_sizes) if packet_sizes else 0,
        "max_packet_size": max(packet_sizes) if packet_sizes else 0,
        "protocol_counts": dict(protocol_counts),
        "protocol_distribution": protocol_distribution,
        "dest_ips": destination_ips,
        "unique_ips": list(set(destination_ips)),   # Remove duplicates
        "dest_ports": destination_ports,
        "dns_queries": list(set(dns_query_names)),  # Remove duplicates
        "inter_arrival_times": inter_arrival_times,
        "timestamps": timestamps,
        "timeline": full_timeline,
        "size_histogram": size_histogram,
        "capture_duration": capture_duration,
    }


# ── Histogram Builder 

def build_size_histogram(sizes: list) -> dict:
    """
    Groups packet sizes into 5 buckets for a bar chart.

    WHY? Instead of showing 1000 individual packet sizes, we group them
    into ranges so the data is easier to visualize and understand.

    Bucket ranges (in bytes):
      "0-100"     → tiny packets (ACKs, headers, small pings)
      "101-500"   → small packets (DNS replies, small JSON)
      "501-1000"  → medium packets (typical web content)
      "1001-1500" → large packets (images, downloads)
      "1500+"     → jumbo packets (video chunks, big file transfers)
    """
    buckets = {
        "0-100":    0,
        "101-500":  0,
        "501-1000": 0,
        "1001-1500": 0,
        "1500+":    0
    }

    for size in sizes:
        if size <= 100:
            buckets["0-100"] += 1
        elif size <= 500:
            buckets["101-500"] += 1
        elif size <= 1000:
            buckets["501-1000"] += 1
        elif size <= 1500:
            buckets["1001-1500"] += 1
        else:
            buckets["1500+"] += 1

    return buckets


# ── Empty Features (used when capture failed) 

def empty_features() -> dict:
    """
    Returns a dictionary of all-zero stats.

    Used when the .pcap file is empty or couldn't be read.
    This prevents the rest of the pipeline from crashing —
    it just produces a fingerprint full of zeros instead.
    """
    return {
        "total_packets": 0,
        "total_bytes": 0,
        "packet_sizes": [],
        "mean_packet_size": 0,
        "min_packet_size": 0,
        "max_packet_size": 0,
        "protocol_counts": {},
        "protocol_distribution": {},
        "dest_ips": [],
        "unique_ips": [],
        "dest_ports": [],
        "dns_queries": [],
        "inter_arrival_times": [],
        "timestamps": [],
        "timeline": {},
        "size_histogram": {
            "0-100": 0,
            "101-500": 0,
            "501-1000": 0,
            "1001-1500": 0,
            "1500+": 0
        },
        "capture_duration": 0,
    }