from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.user import db
from models.event import Event, IpHdr, TcpHdr, UdpHdr, Signature
from datetime import datetime
import socket
import struct

events_bp = Blueprint('events', __name__)

def int_to_ip(ip_int):
    try:
        return socket.inet_ntoa(struct.pack('!I', ip_int))
    except:
        return str(ip_int)

@events_bp.route('/', methods=['GET'])
@jwt_required()
def get_events():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    src_ip = request.args.get('src_ip')
    dst_ip = request.args.get('dst_ip')
    sig_name = request.args.get('sig_name')
    protocol = request.args.get('protocol')
    port = request.args.get('port', type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    sort_by = request.args.get('sort_by', 'timestamp')
    sort_dir = request.args.get('sort_dir', 'desc')

    query = db.session.query(Event, IpHdr, Signature)\
        .join(IpHdr, (Event.sid == IpHdr.sid) & (Event.cid == IpHdr.cid))\
        .join(Signature, Event.signature == Signature.sig_id)

    if src_ip:
        try:
            query = query.filter(IpHdr.ip_src == struct.unpack('!I', socket.inet_aton(src_ip))[0])
        except:
            pass

    if dst_ip:
        try:
            query = query.filter(IpHdr.ip_dst == struct.unpack('!I', socket.inet_aton(dst_ip))[0])
        except:
            pass

    if sig_name:
        query = query.filter(Signature.sig_name.like(f'%{sig_name}%'))

    if protocol:
        query = query.filter(IpHdr.ip_proto == int(protocol))

    if date_from:
        try:
            query = query.filter(Event.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
        except:
            pass

    if date_to:
        try:
            query = query.filter(Event.timestamp <= datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        except:
            pass

    if port:
        query = query\
            .outerjoin(TcpHdr, (Event.sid == TcpHdr.sid) & (Event.cid == TcpHdr.cid))\
            .outerjoin(UdpHdr, (Event.sid == UdpHdr.sid) & (Event.cid == UdpHdr.cid))\
            .filter(
                (TcpHdr.tcp_sport == port) | (TcpHdr.tcp_dport == port) |
                (UdpHdr.udp_sport == port) | (UdpHdr.udp_dport == port)
            )

    # Rikiavimas
    asc = sort_dir == 'asc'
    if sort_by == 'timestamp':
        query = query.order_by(Event.timestamp.asc() if asc else Event.timestamp.desc())
    elif sort_by == 'src_ip':
        query = query.order_by(IpHdr.ip_src.asc() if asc else IpHdr.ip_src.desc())
    elif sort_by == 'dst_ip':
        query = query.order_by(IpHdr.ip_dst.asc() if asc else IpHdr.ip_dst.desc())
    elif sort_by == 'port':
        if not port:
            query = query.outerjoin(TcpHdr, (Event.sid == TcpHdr.sid) & (Event.cid == TcpHdr.cid))
        query = query.order_by(TcpHdr.tcp_sport.asc() if asc else TcpHdr.tcp_sport.desc())
    elif sort_by == 'signature':
        query = query.order_by(Signature.sig_name.asc() if asc else Signature.sig_name.desc())
    elif sort_by == 'priority':
        query = query.order_by(Signature.sig_priority.asc() if asc else Signature.sig_priority.desc())
    else:
        query = query.order_by(Event.timestamp.desc())

    total = query.count()
    results = query.paginate(page=page, per_page=per_page, error_out=False)

    events = []
    for event, iphdr, sig in results.items:
        tcp = TcpHdr.query.filter_by(sid=event.sid, cid=event.cid).first()
        udp = UdpHdr.query.filter_by(sid=event.sid, cid=event.cid).first()
        src_port = tcp.tcp_sport if tcp else (udp.udp_sport if udp else None)
        dst_port = tcp.tcp_dport if tcp else (udp.udp_dport if udp else None)
        events.append({
            'sid': event.sid,
            'cid': event.cid,
            'timestamp': event.timestamp.isoformat() if event.timestamp else None,
            'src_ip': int_to_ip(iphdr.ip_src) if iphdr.ip_src else None,
            'dst_ip': int_to_ip(iphdr.ip_dst) if iphdr.ip_dst else None,
            'src_port': src_port,
            'dst_port': dst_port,
            'protocol': iphdr.ip_proto,
            'signature': sig.sig_name,
            'priority': sig.sig_priority,
            'sig_sid': sig.sig_sid,
        })

    return jsonify({'events': events, 'total': total, 'page': page, 'per_page': per_page, 'pages': results.pages})

@events_bp.route('/filters', methods=['GET'])
@jwt_required()
def get_filters():
    user_id = int(get_jwt_identity())
    from models.rule import SavedFilter
    filters = SavedFilter.query.filter_by(user_id=user_id).all()
    return jsonify([{'id': f.id, 'name': f.name, 'filter_config': f.filter_config} for f in filters])

@events_bp.route('/filters', methods=['POST'])
@jwt_required()
def save_filter():
    user_id = int(get_jwt_identity())
    from models.rule import SavedFilter
    data = request.get_json()
    f = SavedFilter(user_id=user_id, name=data['name'], filter_config=data['filter_config'])
    db.session.add(f)
    db.session.commit()
    return jsonify({'message': 'Filtras išsaugotas'}), 201
@events_bp.route('/<int:sid>/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_event(sid, cid):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    TcpHdr.query.filter_by(sid=sid, cid=cid).delete()
    UdpHdr.query.filter_by(sid=sid, cid=cid).delete()
    IpHdr.query.filter_by(sid=sid, cid=cid).delete()
    Event.query.filter_by(sid=sid, cid=cid).delete()
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200