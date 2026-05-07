import os
import time
import re
import pymysql
from datetime import datetime

LOG_FILE = '/var/log/snort/snort.alert.fast'

DB_CONFIG = {
    'host': 'localhost',
    'user': 'snort',
    'password': 'snort',
    'database': 'snort'
}

# 01/18-22:11:23.123456  [**] [1:9000001:1] ICMP Ping [**] [Priority: 0] {ICMP} 192.168.1.1 -> 8.8.8.8
PATTERN = re.compile(
    r'(\d{2}/\d{2}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\].*?\[Priority:\s*(\d+)\]\s+\{(\w+)\}\s+([\d.]+)(?::(\d+))?\s+->\s+([\d.]+)(?::(\d+))?'
)

def get_db():
    return pymysql.connect(**DB_CONFIG)

def ensure_sensor(cursor):
    cursor.execute("SELECT sid FROM sensor WHERE hostname=%s", ('log_parser',))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO sensor (hostname, interface, filter, detail, encoding, last_cid) VALUES (%s,%s,%s,%s,%s,%s)",
                   ('log_parser', 'ens33', None, 1, 0, 0))
    return cursor.lastrowid

def ensure_signature(cursor, sig_name, sig_sid, sig_rev, priority):
    cursor.execute("SELECT sig_id FROM signature WHERE sig_sid=%s AND sig_rev=%s", (sig_sid, sig_rev))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO signature (sig_name, sig_class_id, sig_priority, sig_sid, sig_rev) VALUES (%s,%s,%s,%s,%s)",
                   (sig_name, 1, priority, sig_sid, sig_rev))
    return cursor.lastrowid

def get_next_cid(cursor, sensor_id):
    cursor.execute("SELECT MAX(cid) FROM event WHERE sid=%s", (sensor_id,))
    row = cursor.fetchone()
    return (row[0] or 0) + 1

def ip_to_int(ip):
    try:
        parts = ip.split('.')
        return (int(parts[0]) << 24) + (int(parts[1]) << 16) + (int(parts[2]) << 8) + int(parts[3])
    except:
        return 0

def parse_timestamp(ts_str):
    try:
        now = datetime.now()
        dt = datetime.strptime(f"{now.year}/{ts_str}", "%Y/%m/%d-%H:%M:%S.%f")
        return dt
    except:
        return datetime.now()

def insert_event(cursor, sensor_id, cid, sig_id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol):
    proto_map = {'TCP': 6, 'UDP': 17, 'ICMP': 1}
    proto_num = proto_map.get(protocol.upper(), 0)

    cursor.execute("""
        INSERT IGNORE INTO event (sid, cid, signature, timestamp)
        VALUES (%s, %s, %s, %s)
    """, (sensor_id, cid, sig_id, timestamp))

    cursor.execute("""
        INSERT IGNORE INTO iphdr (sid, cid, ip_src, ip_dst, ip_ver, ip_hlen, ip_tos, ip_len, ip_id, ip_flags, ip_off, ip_ttl, ip_proto, ip_csum)
        VALUES (%s, %s, %s, %s, 4, 5, 0, 0, 0, 0, 0, 64, %s, 0)
    """, (sensor_id, cid, ip_to_int(src_ip), ip_to_int(dst_ip), proto_num))

    if proto_num == 6 and src_port and dst_port:
        cursor.execute("""
            INSERT IGNORE INTO tcphdr (sid, cid, tcp_sport, tcp_dport, tcp_seq, tcp_ack, tcp_off, tcp_res, tcp_flags, tcp_win, tcp_csum, tcp_urp)
            VALUES (%s, %s, %s, %s, 0, 0, 0, 0, 0, 0, 0, 0)
        """, (sensor_id, cid, int(src_port), int(dst_port)))
    elif proto_num == 17 and src_port and dst_port:
        cursor.execute("""
            INSERT IGNORE INTO udphdr (sid, cid, udp_sport, udp_dport, udp_len, udp_csum)
            VALUES (%s, %s, %s, %s, 0, 0)
        """, (sensor_id, cid, int(src_port), int(dst_port)))

def follow_log(filepath):
    print(f"Stebiu failą: {filepath}")
    while not os.path.exists(filepath):
        print("Laukiu failo...")
        time.sleep(2)
    
    with open(filepath, 'r') as f:
        f.seek(0, 2)  # Eiti į failo pabaigą
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue
            yield line.strip()

def main():
    import os
    print("Snort log parseris paleistas...")
    db = get_db()
    cursor = db.cursor()
    sensor_id = ensure_sensor(cursor)
    db.commit()
    print(f"Sensor ID: {sensor_id}")

    for line in follow_log(LOG_FILE):
        match = PATTERN.match(line)
        if not match:
            continue
        try:
            ts, gen_id, sig_sid, sig_rev, sig_name, priority, protocol, src_ip, src_port, dst_ip, dst_port = match.groups()
            timestamp = parse_timestamp(ts)
            sig_id = ensure_signature(cursor, sig_name, int(sig_sid), int(sig_rev), int(priority))
            cid = get_next_cid(cursor, sensor_id)
            insert_event(cursor, sensor_id, cid, sig_id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol)
            db.commit()
            print(f"[+] {timestamp} {src_ip} -> {dst_ip} | {sig_name}")
        except Exception as e:
            print(f"Klaida: {e}")
            db.rollback()

if __name__ == '__main__':
    main()
EOF
