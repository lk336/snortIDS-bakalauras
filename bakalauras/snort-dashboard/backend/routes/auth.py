from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models.user import db, User
from models.rule import ActivityLog
import bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Neteisingi duomenys'}), 401
    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role}
    )
    log = ActivityLog(
        user_id=user.id,
        action='LOGIN',
        details=f'Prisijungė {user.username}',
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'token': token, 'role': user.role, 'username': user.username})

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    user = User.query.get(user_id)
    return jsonify({'id': user.id, 'username': user.username, 'role': claims.get('role')})

@auth_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_activity():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403

    logs = db.session.query(ActivityLog, User)\
        .join(User, ActivityLog.user_id == User.id)\
        .order_by(ActivityLog.timestamp.desc())\
        .limit(200).all()

    return jsonify([{
        'id': log.id,
        'username': user.username,
        'action': log.action,
        'details': log.details,
        'ip_address': log.ip_address,
        'timestamp': log.timestamp.isoformat()
    } for log, user in logs])