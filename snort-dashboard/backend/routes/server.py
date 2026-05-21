from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import subprocess
from models.user import db
from models.rule import ActivityLog, Rule

server_bp = Blueprint('server', __name__)

def export_rules_to_snort():
    rules = Rule.query.filter_by(is_enabled=True).all()
    rules_path = '/etc/snort/rules/local.rules'
    with open(rules_path, 'w') as f:
        f.write("# Automatiškai sugeneruotos taisyklės\n")
        for rule in rules:
            f.write(rule.rule_text + "\n")

@server_bp.route('/status', methods=['GET'])
@jwt_required()
def status():
    result = subprocess.run(['pgrep', '-x', 'snort'], capture_output=True)
    running = result.returncode == 0
    return jsonify({'running': running})

@server_bp.route('/start', methods=['POST'])
@jwt_required()
def start_snort():
    identity = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    export_rules_to_snort()
    subprocess.Popen(['snort', '-c', '/etc/snort/snort.conf', '-i', 'ens33', '-D', '-l', '/var/log/snort'])
    log = ActivityLog(
        user_id=int(identity),
        action='START_SNORT',
        details='Snort paleistas',
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Snort paleistas'})

@server_bp.route('/stop', methods=['POST'])
@jwt_required()
def stop_snort():
    identity = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    subprocess.run(['pkill', 'snort'])
    log = ActivityLog(
        user_id=int(identity),
        action='STOP_SNORT',
        details='Snort sustabdytas',
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Snort sustabdytas'})