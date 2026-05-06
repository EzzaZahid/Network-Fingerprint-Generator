

"""
capture.py - Captures network packets while visiting a website.

WHAT THIS FILE DOES (in plain English):
----------------------------------------
1. You give it a website URL (like "https://google.com")
2. It opens a connection to that website (like your browser does)
3. AT THE SAME TIME, it records all the network packets sent/received
4. It saves those packets into a file (called a .pcap file)
5. Later, other parts of the project read that file to analyze the traffic

A "packet" is just a small chunk of data traveling over the internet.
Think of it like a letter — the internet breaks big messages into many
small letters (packets) and sends them one by one.

A ".pcap file" is just a recording of those packets, like a video recording
but for network traffic.

REQUIREMENT: You need to run this with admin/sudo privileges because
reading raw network packets requires special system permissions.
"""

import threading  
import time        
import logging     
import requests    
from scapy.all import sniff, wrpcap, conf  

logger = logging.getLogger(__name__)

conf.verb = 0


# STEP 1: Visit the website to generate real network traffic

def visit_website(url: str):
    try:
        browser_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }

        response = requests.get(url, timeout=8, headers=browser_headers, verify=False)

        logger.info(
            f"Visited {url} → got status {response.status_code}, "
            f"downloaded {len(response.content)} bytes"
        )

        time.sleep(0.5)

    except requests.exceptions.SSLError:
        logger.warning(f"SSL certificate issue for {url}, retrying without verification...")
        try:
            requests.get(url, timeout=8, headers=browser_headers, verify=False)
        except Exception as error:
            logger.warning(f"Request failed even without SSL check: {error}")

    except Exception as error:
        logger.warning(f"Could not visit {url}: {error}")


# STEP 2: Build a filter so we only capture RELEVANT packets

def build_packet_filter(ip_addresses: list) -> str:
    if not ip_addresses:
        return ""

    filter_parts = [f"host {ip}" for ip in ip_addresses]
    return " or ".join(filter_parts)


# STEP 3: Capture packets WHILE visiting the website

def capture_traffic(url: str, save_path: str, duration: int = 10,
                    filter_ips: list = None) -> None:

    if filter_ips is None:
        filter_ips = []

    packet_filter = build_packet_filter(filter_ips)
    logger.info(f"Packet filter: '{packet_filter or 'none — capturing all traffic'}'")

    website_visitor_thread = threading.Thread(
        target=visit_website,   
        args=(url,),            
        daemon=True
    )

    logger.info(f"Starting packet capture for {duration} seconds...")

    startup_delay = threading.Timer(0.5, website_visitor_thread.start)
    startup_delay.start()

    try:
        captured_packets = sniff(
            filter=packet_filter if packet_filter else None,
            timeout=duration,
            store=True
        )

        if captured_packets:
            wrpcap(save_path, captured_packets)
            logger.info(f"Saved {len(captured_packets)} packets to {save_path}")
        else:
            logger.warning("No packets were captured — saving empty file")
            wrpcap(save_path, [])

    except PermissionError:
        raise PermissionError(
            "ERROR: Packet capture needs admin privileges.\n"
            "  → On Linux/Mac: run with 'sudo python app.py'\n"
            "  → On Windows: right-click terminal → 'Run as Administrator'"
        )

    except Exception as error:
        logger.error(f"Something went wrong during capture: {error}")
        raise 

    finally:
        startup_delay.cancel()
