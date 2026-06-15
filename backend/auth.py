import os
import uuid
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, make_response, g
from sqlalchemy import Column, String, Enum as SQLEnum, DateTime, Text
from sqlalchemy.dialects.mysql import CHAR
from extensions import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api')


class User(db.Model):
    __tablename__ = 'users'

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum('user', 'admin', name='user_role'), nullable=False, default='user')
    settings = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Session(db.Model):
    __tablename__ = 'sessions'

    session_id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


# --- Helper Functions ---

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, password_hash):
    """Verify a password against a bcrypt hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def get_current_user():
    """Get the current authenticated user from the session cookie"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        return None
    
    # Find valid session
    session = db.session.execute(
        db.select(Session).filter_by(session_id=session_id)
    ).scalar_one_or_none()
    
    if not session:
        return None
    
    # Check if session is expired
    if session.expires_at < datetime.utcnow():
        db.session.delete(session)
        db.session.commit()
        return None
    
    # Get user
    user = db.session.execute(
        db.select(User).filter_by(id=session.user_id)
    ).scalar_one_or_none()
    
    return user


def login_required(f):
    """Decorator to require authentication for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator to require admin role for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        if user.role != 'admin':
            return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated_function


# --- Authentication Endpoints ---


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint - verify credentials and create session
    Request: {"email": "user@example.com", "password": "password"}
    Response: {"role": "user", "email": "user@example.com"}
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    # Find user by email
    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Create session
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)  # 7 day session
    
    new_session = Session(
        session_id=session_id,
        user_id=user.id,
        expires_at=expires_at
    )
    db.session.add(new_session)
    db.session.commit()
    
    # Create response with cookie
    response = make_response(jsonify({
        "role": user.role,
        "email": user.email,
        "id": user.id
    }))
    
    # Set secure HttpOnly cookie
    # In production with HTTPS, secure should be True. For development, it can be False.
    is_production = os.getenv('FLASK_ENV') == 'production'
    response.set_cookie(
        'session_id',
        session_id,
        httponly=True,
        secure=is_production,  # Enable in production with HTTPS
        samesite='Lax',
        max_age=7*24*60*60  # 7 days in seconds
    )
    
    return response


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint - delete session and clear cookie
    """
    session_id = request.cookies.get('session_id')
    
    if session_id:
        # Delete session from database
        session = db.session.execute(
            db.select(Session).filter_by(session_id=session_id)
        ).scalar_one_or_none()
        
        if session:
            db.session.delete(session)
            db.session.commit()
    
    # Clear cookie
    is_production = os.getenv('FLASK_ENV') == 'production'
    response = make_response(jsonify({"message": "Logged out successfully"}))
    response.set_cookie('session_id', '', expires=0, httponly=True, secure=is_production, samesite='Lax')
    
    return response


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    """
    Get current user information
    Response: {"id": "uuid", "email": "user@example.com", "role": "user", "settings": {...}}
    """
    user = get_current_user()
    
    # Parse settings JSON
    import json
    settings = {}
    if user.settings:
        try:
            settings = json.loads(user.settings)
        except:
            settings = {}
    
    return jsonify({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "settings": settings
    })


@auth_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    """
    Get user settings
    Response: {"unit": "metric"}
    """
    user = get_current_user()
    
    import json
    settings = {}
    if user.settings:
        try:
            settings = json.loads(user.settings)
        except:
            settings = {}
    
    return jsonify(settings)


@auth_bp.route('/settings', methods=['PUT'])
@login_required
def update_settings():
    """
    Update user settings (merge with existing)
    Request: {"unit": "metric"}
    Response: updated settings
    """
    user = get_current_user()
    data = request.get_json()
    
    # Validate allowed keys
    allowed_keys = {'unit'}
    if not all(key in allowed_keys for key in data.keys()):
        return jsonify({"error": "Invalid settings keys. Allowed: unit"}), 400
    
    # Validate unit value
    if 'unit' in data:
        if data['unit'] not in ['metric', 'us']:
            return jsonify({"error": "Invalid unit value. Allowed: metric, us"}), 400
    
    # Parse existing settings
    import json
    settings = {}
    if user.settings:
        try:
            settings = json.loads(user.settings)
        except:
            settings = {}
    
    # Merge new settings
    settings.update(data)
    
    # Save updated settings
    user.settings = json.dumps(settings)
    db.session.commit()
    
    return jsonify(settings)


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """
    Change user password
    Request: {"current_password": "old", "new_password": "new"}
    Response: {"message": "Password changed successfully"}
    """
    user = get_current_user()
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password required"}), 400
    
    # Verify current password
    if not verify_password(current_password, user.password_hash):
        return jsonify({"error": "Current password is incorrect"}), 401
    
    # Validate new password
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    
    # Update password and invalidate all existing sessions
    user.password_hash = hash_password(new_password)
    db.session.execute(db.delete(Session).where(Session.user_id == user.id))
    db.session.commit()

    return jsonify({"message": "Password changed successfully"})



# --- User Management Endpoints (Admin Only) ---

def serialize_user(user):
    """Convert a User ORM object to a dictionary"""
    import json
    settings = {}
    if user.settings:
        try:
            settings = json.loads(user.settings)
        except:
            settings = {}
    
    return {
        'id': user.id,
        'email': user.email,
        'role': user.role,
        'settings': settings,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'updated_at': user.updated_at.isoformat() if user.updated_at else None
    }


@auth_bp.route('/admin/users', methods=['GET'])
@admin_required
def admin_list_users():
    """Admin endpoint to list all users"""
    try:
        users = db.session.execute(db.select(User)).scalars().all()
        return jsonify([serialize_user(u) for u in users])
    except Exception as e:
        print(f"Database error in admin_list_users: {e}")
        return jsonify({"error": "Failed to fetch users from database."}), 500


@auth_bp.route('/admin/users', methods=['POST'])
@admin_required
def admin_create_user():
    """Admin endpoint to create a new user"""
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')
        
        # Validate required fields
        if not email:
            return jsonify({"error": "Email is required"}), 400
        if not password:
            return jsonify({"error": "Password is required"}), 400
        
        # Validate role
        if role not in ['user', 'admin']:
            return jsonify({"error": "Role must be 'user' or 'admin'"}), 400
        
        # Validate password length
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Check if user already exists
        existing_user = db.session.execute(
            db.select(User).filter_by(email=email)
        ).scalar_one_or_none()
        
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 400
        
        # Create new user
        import json
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            role=role,
            settings=json.dumps({"unit": "us"})  # Default settings
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify(serialize_user(new_user)), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating user: {e}")
        return jsonify({"error": "Failed to create user"}), 500


@auth_bp.route('/admin/users/<user_id>', methods=['PUT'])
@admin_required
def admin_update_user(user_id):
    """Admin endpoint to update a user's role"""
    try:
        user = db.session.execute(
            db.select(User).filter_by(id=user_id)
        ).scalar_one_or_none()
        
        if user is None:
            return jsonify({"error": "User not found."}), 404
        
        data = request.get_json()
        
        # Update role if provided
        if 'role' in data:
            role = data['role']
            if role not in ['user', 'admin']:
                return jsonify({"error": "Role must be 'user' or 'admin'"}), 400
            user.role = role
        
        db.session.commit()
        return jsonify(serialize_user(user))
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user: {e}")
        return jsonify({"error": "Failed to update user"}), 500


@auth_bp.route('/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    """Admin endpoint to delete a user"""
    try:
        # Get current user to prevent self-deletion
        current_user = get_current_user()
        if current_user and current_user.id == user_id:
            return jsonify({"error": "Cannot delete your own account"}), 400
        
        user = db.session.execute(
            db.select(User).filter_by(id=user_id)
        ).scalar_one_or_none()
        
        if user is None:
            return jsonify({"error": "User not found."}), 404
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {e}")
        return jsonify({"error": "Failed to delete user"}), 500
