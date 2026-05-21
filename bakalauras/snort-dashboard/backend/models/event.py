from .user import db
from datetime import datetime

class Event(db.Model):
    __tablename__ = 'event'
    sid = db.Column(db.Integer, primary_key=True)
    cid = db.Column(db.Integer, primary_key=True)
    signature = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)

class IpHdr(db.Model):
    __tablename__ = 'iphdr'
    sid = db.Column(db.Integer, primary_key=True)
    cid = db.Column(db.Integer, primary_key=True)
    ip_src = db.Column(db.Integer)
    ip_dst = db.Column(db.Integer)
    ip_proto = db.Column(db.Integer)

class TcpHdr(db.Model):
    __tablename__ = 'tcphdr'
    sid = db.Column(db.Integer, primary_key=True)
    cid = db.Column(db.Integer, primary_key=True)
    tcp_sport = db.Column(db.Integer)
    tcp_dport = db.Column(db.Integer)

class UdpHdr(db.Model):
    __tablename__ = 'udphdr'
    sid = db.Column(db.Integer, primary_key=True)
    cid = db.Column(db.Integer, primary_key=True)
    udp_sport = db.Column(db.Integer)
    udp_dport = db.Column(db.Integer)

class Signature(db.Model):
    __tablename__ = 'signature'
    sig_id = db.Column(db.Integer, primary_key=True)
    sig_name = db.Column(db.String(255))
    sig_class_id = db.Column(db.Integer)
    sig_priority = db.Column(db.Integer)
    sig_sid = db.Column(db.Integer)
    sig_rev = db.Column(db.Integer)