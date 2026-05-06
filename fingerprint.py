

"""
fingerprint.py - Packages all extracted stats into one clean JSON object.

WHAT THIS FILE DOES (in plain English):
----------------------------------------
After extract.py computes all the raw stats from the .pcap file,
THIS file takes those stats and organizes them into a single, clean,
well-structured dictionary (which becomes a JSON object in the API response).

Think of it like taking a pile of raw data and filling in a report card —
everything gets labelled, organized, and put in the right place.

This "fingerprint" object is what gets:
  - Sent back to the browser/API caller as JSON
  - Used by classify.py to determine the behavior label
  - Displayed on the frontend as charts and stats

WHAT IS A FINGERPRINT HERE?
In this project, a "fingerprint" is just a snapshot of how a website
behaves on the network. Two different types of websites (like Netflix
vs Wikipedia) will have very different fingerprints.

It is NOT related to browser fingerprinting or tracking.
"""

import logging
from datetime import datetime, timezone   # For recording when the capture happened

logger = logging.getLogger(__name__)


# ── Main Function 

def generate_fingerprint(url: str, features: dict) -> dict:

    protocol_distribution = features["protocol_distribution"]

    if protocol_distribution:
        top_protocol = max(protocol_distribution, key=protocol_distribution.get)
    else:
        top_protocol = "N/A"   # No packets were captured

    normalized_protocols = fix_percentages(protocol_distribution)


    fingerprint = {

        "site_url": url,
        "capture_timestamp": datetime.now(timezone.utc).isoformat(),

        # ── How much traffic was there? ───────────────────────────────────────
        "total_packets": features["total_packets"],          # e.g. 842
        "total_bytes": features["total_bytes"],              # e.g. 1048576
        "total_kb": round(features["total_bytes"] / 1024, 2),  # e.g. 1024.0 KB
        "capture_duration_sec": features["capture_duration"],   # e.g. 9.87 seconds

        # ── What were the packet sizes like? ──────────────────────────────────
        "mean_packet_size": features["mean_packet_size"],    # Average in bytes
        "min_packet_size": features["min_packet_size"],      # Smallest packet
        "max_packet_size": features["max_packet_size"],      # Largest packet

        # ── What protocols were used? ─────────────────────────────────────────
        "top_protocol": top_protocol,                        # Most common protocol
        "protocol_distribution": normalized_protocols,       # All protocols as %

        # ── Which servers did the site contact? ───────────────────────────────
        "unique_ips": features["unique_ips"],                # List of IP addresses
        "unique_ip_count": len(features["unique_ips"]),      # How many unique IPs

        # ── Which domain names were looked up? (DNS) ─────────────────────────
        "dns_queries": features["dns_queries"],              # List of domain names
        "dns_query_count": len(features["dns_queries"]),     # How many lookups

        # ── Chart data for the frontend ───────────────────────────────────────
        # timeline: how many bytes were transferred each second
        # Example: { "0": 12400, "1": 85000, "2": 43200, ... }
        "timeline": features["timeline"],

        # size_histogram: how many packets fell into each size range
        # Example: { "0-100": 120, "101-500": 340, "501-1000": 280, ... }
        "size_histogram": features["size_histogram"],

        # ── These are filled in later by classify.py ──────────────────────────
        # We set placeholder values here; classify.py will overwrite them
        "behavior_label": "Unknown",
        "confidence": 0,
    }

    logger.info(
        f"Fingerprint created for {url}: "
        f"{features['total_packets']} packets, "
        f"{fingerprint['total_kb']} KB, "
        f"top protocol = {top_protocol}"
    )

    return fingerprint


# ── Protocol Percentage Fixer 

def fix_percentages(distribution: dict) -> dict:
    if not distribution:
        return {}

    total = sum(distribution.values())
    if total == 0:
        return distribution

    # Re-calculate each percentage relative to the real total
    normalized = {
        protocol: round((count / total) * 100, 2)
        for protocol, count in distribution.items()
    }

    # Check if there's a rounding error (e.g. sum = 99.97 instead of 100.00)
    current_sum = sum(normalized.values())
    rounding_error = round(100.0 - current_sum, 2)

    if rounding_error != 0:
        # Apply the correction to the protocol with the biggest percentage
        # (so the change is least noticeable)
        biggest_protocol = max(normalized, key=normalized.get)
        normalized[biggest_protocol] = round(
            normalized[biggest_protocol] + rounding_error, 2
        )

    return normalized