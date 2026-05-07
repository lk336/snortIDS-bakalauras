from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.user import db
from models.rule import Rule, ActivityLog

rules_bp = Blueprint('rules', __name__)

def export_rules():
    from routes.server import export_rules_to_snort
    try:
        export_rules_to_snort()
    except Exception as e:
        print(f"Taisyklių eksporto klaida: {e}")

@rules_bp.route('/', methods=['GET'])
@jwt_required()
def get_rules():
    rules = Rule.query.all()
    return jsonify([{
        'id': r.id,
        'sid': r.sid,
        'rule_text': r.rule_text,
        'description': r.description,
        'category': r.category,
        'is_enabled': r.is_enabled,
        'created_at': r.created_at.isoformat()
    } for r in rules])

@rules_bp.route('/', methods=['POST'])
@jwt_required()
def create_rule():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    user_id = int(get_jwt_identity())
    data = request.get_json()

    rule_text = data.get('rule_text', '').strip()
    if not rule_text:
        return jsonify({'error': 'Rule text is required'}), 400

    rule = Rule(
        sid=data.get('sid'),
        rule_text=rule_text,
        description=data.get('description'),
        category=data.get('category'),
        created_by=user_id
    )
    db.session.add(rule)
    log = ActivityLog(
        user_id=user_id,
        action='CREATE_RULE',
        details=f"SID: {data.get('sid')}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    export_rules()
    return jsonify({'message': 'Taisyklė sukurta', 'id': rule.id}), 201

@rules_bp.route('/<int:rule_id>', methods=['PUT'])
@jwt_required()
def update_rule(rule_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    user_id = int(get_jwt_identity())
    rule = Rule.query.get_or_404(rule_id)
    data = request.get_json()

    new_rule_text = data.get('rule_text')
    if new_rule_text:
        rule.rule_text = new_rule_text.strip()

    rule.description = data.get('description', rule.description)
    rule.category = data.get('category', rule.category)
    rule.is_enabled = data.get('is_enabled', rule.is_enabled)

    log = ActivityLog(
        user_id=user_id,
        action='UPDATE_RULE',
        details=f"Rule ID: {rule_id}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    export_rules()
    return jsonify({'message': 'Taisyklė atnaujinta'})

@rules_bp.route('/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_rule(rule_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    user_id = int(get_jwt_identity())
    rule = Rule.query.get_or_404(rule_id)
    db.session.delete(rule)
    log = ActivityLog(
        user_id=user_id,
        action='DELETE_RULE',
        details=f"Rule ID: {rule_id}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    export_rules()
    return jsonify({'message': 'Taisyklė ištrinta'})

@rules_bp.route('/ai-generate', methods=['POST'])
@jwt_required()
def ai_generate():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Nėra teisių'}), 403
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({'error': 'Prompt required'}), 400
    try:
        from ai_service import generate_snort_rule
        rule_text = generate_snort_rule(prompt)
        return jsonify({'rule_text': rule_text})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500