# auth.py - Authentication and authorization module for Flask application
# Provides session-based authentication with user login, logout, and settings management

import os
import uuid
import bcrypt
import logging
import traceback
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import Column, String, Enum as SQLEnum, DateTime, Text
from sqlalchemy.dialects.mysql import CHAR
from flask_sqlalchemy import SQLAlchemy

# Configure logging
logger = logging.getLogger(__name__)

# Create auth blueprint - will be registered in app.py
auth_bp = Blueprint('auth', __name__, url_prefix='/api')

# Database instance will be set from app.py
db = None
User = None
Session = None

def init_auth(database):
    """Initialize the auth module with the database instance from app.py"""
    global db, User, Session
    db = database
    
    # Define models after db is set
    class User(db.Model):
        """User model for authentication and authorization"""
        __tablename__ = 'users'
        
        id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        email = Column(String(255), unique=True, nullable=False)
        password_hash = Column(String(255), nullable=False)
        role = Column(SQLEnum('user', 'admin', name='user_role'), nullable=False, default='user')
        settings = Column(Text)  # JSON stored as text
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    class Session(db.Model):
        """Session model for managing user sessions"""
        __tablename__ = 'sessions'
        
        session_id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        user_id = Column(CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
        created_at = Column(DateTime, default=datetime.utcnow)
        expires_at = Column(DateTime, nullable=False)
    
    # Store globally for use in route handlers
    globals()['User'] = User
    globals()['Session'] = Session


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

# Default test admin email - if this user exists, it's a test database
TEST_ADMIN_EMAIL = 'admin@example.com'

@auth_bp.route('/is-test-database', methods=['GET'])
def is_test_database():
    """
    Check if this is a test database by looking for the default admin account.
    This endpoint is public (no auth required) so it can be called before login.
    Response: {"is_test": true/false}
    """
    try:
        test_user = db.session.execute(
            db.select(User).filter_by(email=TEST_ADMIN_EMAIL)
        ).scalar_one_or_none()
        
        return jsonify({"is_test": test_user is not None})
    except Exception as e:
        print(f"Error checking test database: {e}")
        return jsonify({"is_test": False})


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
    
    # Update password
    user.password_hash = hash_password(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password changed successfully"})


# --- Admin Endpoints ---
# These endpoints are for managing recipes and ingredients with admin protection

@auth_bp.route('/admin/recipes', methods=['GET'])
@admin_required
def admin_list_recipes():
    """Admin endpoint to list all recipes"""
    from app import Recipe, serialize_recipe
    try:
        recipes = db.session.execute(db.select(Recipe)).scalars().all()
        return jsonify([serialize_recipe(r) for r in recipes])
    except Exception as e:
        print(f"Database error in admin_list_recipes: {e}")
        return jsonify({"error": "Failed to fetch recipes from database."}), 500


@auth_bp.route('/admin/recipes', methods=['POST'])
@admin_required
def admin_create_recipe():
    """Admin endpoint to create a new recipe"""
    from app import Recipe, RecipeIngredient, RecipeTag, serialize_recipe, extract_tag_id
    try:
        data = request.get_json()
        logger.debug(f"Admin creating recipe with data: {data}")
        
        # Create recipe with basic fields
        new_recipe = Recipe(
            name=data.get('name'),
            description=data.get('description'),
            instructions=data.get('instructions'),
            base_servings=data.get('base_servings', 4),
            parent_recipe_id=data.get('parent_recipe_id'),
            variant_notes=data.get('variant_notes')
        )
        
        db.session.add(new_recipe)
        db.session.flush()  # Get the recipe_id
        logger.debug(f"Created recipe with ID: {new_recipe.recipe_id}")
        
        # Add ingredients if provided
        ingredients_data = data.get('ingredients', [])
        for ing_data in ingredients_data:
            ingredient_id = ing_data.get('ingredient_id')
            if not ingredient_id:
                continue
                
            new_recipe_ingredient = RecipeIngredient(
                recipe_id=new_recipe.recipe_id,
                ingredient_id=ingredient_id,
                quantity=ing_data.get('quantity'),
                unit_id=ing_data.get('unit_id'),
                notes=ing_data.get('notes'),
                group_id=ing_data.get('group_id')
            )
            db.session.add(new_recipe_ingredient)
        
        # Add tags if provided
        tags_data = data.get('tags', [])
        for tag_data in tags_data:
            tag_id = extract_tag_id(tag_data)
            if tag_id is None:
                continue
            new_recipe_tag = RecipeTag(
                recipe_id=new_recipe.recipe_id,
                tag_id=tag_id
            )
            db.session.add(new_recipe_tag)
        
        db.session.commit()
        logger.debug(f"Recipe {new_recipe.recipe_id} committed successfully")
        return jsonify(serialize_recipe(new_recipe)), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating recipe: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to create recipe", "details": str(e)}), 500


@auth_bp.route('/admin/recipes/<int:recipe_id>', methods=['PUT'])
@admin_required
def admin_update_recipe(recipe_id):
    """Admin endpoint to update a recipe"""
    from app import Recipe, RecipeIngredient, serialize_recipe
    try:
        recipe = db.session.execute(db.select(Recipe).filter_by(recipe_id=recipe_id)).scalar_one_or_none()
        if recipe is None:
            return jsonify({"error": "Recipe not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch recipe from database."}), 500
    
    data = request.get_json()
    
    # Handle ingredients separately if provided
    ingredients_data = data.get('ingredients', None)
    
    # Filter out relationship fields that should not be directly set
    fields_to_skip = ['ingredients', 'tags', 'parent_recipe', 'variants']
    
    # Update basic recipe fields
    for key, value in data.items():
        if key in fields_to_skip:
            continue
        if hasattr(recipe, key):
            setattr(recipe, key, value)
    
    # Handle ingredients update if provided
    if ingredients_data is not None:
        try:
            # Get current recipe ingredients by their unique ID
            current_ingredients = {ri.id: ri for ri in recipe.ingredients}
            
            # Track which IDs we've seen in the update
            incoming_ids = set()
            
            for ing_data in ingredients_data:
                ingredient_id = ing_data.get('ingredient_id')
                if not ingredient_id:
                    continue
                
                # Check if this is an existing item (has an id) or a new one
                item_id = ing_data.get('id')
                
                if item_id and item_id in current_ingredients:
                    # Update existing ingredient
                    incoming_ids.add(item_id)
                    recipe_ingredient = current_ingredients[item_id]
                    recipe_ingredient.ingredient_id = ingredient_id
                    recipe_ingredient.quantity = ing_data.get('quantity', recipe_ingredient.quantity)
                    recipe_ingredient.unit_id = ing_data.get('unit_id', recipe_ingredient.unit_id)
                    recipe_ingredient.notes = ing_data.get('notes', recipe_ingredient.notes)
                    recipe_ingredient.group_id = ing_data.get('group_id', recipe_ingredient.group_id)
                else:
                    # Add new ingredient (even if same ingredient_id already exists)
                    new_recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe.recipe_id,
                        ingredient_id=ingredient_id,
                        quantity=ing_data.get('quantity'),
                        unit_id=ing_data.get('unit_id'),
                        notes=ing_data.get('notes'),
                        group_id=ing_data.get('group_id')
                    )
                    db.session.add(new_recipe_ingredient)
            
            # Remove ingredients that are no longer in the list
            for item_id in current_ingredients:
                if item_id not in incoming_ids:
                    db.session.delete(current_ingredients[item_id])
                    
        except Exception as e:
            print(f"Error updating ingredients: {e}")
            return jsonify({"error": "Failed to update ingredients"}), 500
    
    try:
        db.session.commit()
        return jsonify(serialize_recipe(recipe))
    except Exception as e:
        db.session.rollback()
        print(f"Database commit error: {e}")
        return jsonify({"error": "Database commit failure"}), 500


@auth_bp.route('/admin/recipes/<int:recipe_id>', methods=['DELETE'])
@admin_required
def admin_delete_recipe(recipe_id):
    """Admin endpoint to delete a recipe"""
    from app import Recipe
    try:
        recipe = db.session.execute(db.select(Recipe).filter_by(recipe_id=recipe_id)).scalar_one_or_none()
        if recipe is None:
            return jsonify({"error": "Recipe not found."}), 404
        
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({"message": "Recipe deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting recipe: {e}")
        return jsonify({"error": "Failed to delete recipe"}), 500


@auth_bp.route('/admin/ingredients', methods=['GET'])
@admin_required
def admin_list_ingredients():
    """Admin endpoint to list all ingredients"""
    from app import Ingredient, serialize_ingredient
    try:
        ingredients = db.session.execute(db.select(Ingredient)).scalars().all()
        return jsonify([serialize_ingredient(i) for i in ingredients])
    except Exception as e:
        print(f"Database error in admin_list_ingredients: {e}")
        return jsonify({"error": "Failed to fetch ingredients from database."}), 500


@auth_bp.route('/admin/ingredients', methods=['POST'])
@admin_required
def admin_create_ingredient():
    """Admin endpoint to create a new ingredient"""
    from app import Ingredient, serialize_ingredient
    try:
        data = request.get_json()
        
        # Create ingredient with provided fields
        new_ingredient = Ingredient(
            name=data.get('name'),
            price=data.get('price'),
            price_unit_id=data.get('price_unit_id'),
            default_unit_id=data.get('default_unit_id'),
            contains_peanuts=data.get('contains_peanuts', False),
            gluten_status=data.get('gluten_status', 'Gluten-Free')
        )
        
        db.session.add(new_ingredient)
        db.session.commit()
        return jsonify(serialize_ingredient(new_ingredient)), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating ingredient: {e}")
        return jsonify({"error": "Failed to create ingredient"}), 500


@auth_bp.route('/admin/ingredients/<int:ingredient_id>', methods=['PUT'])
@admin_required
def admin_update_ingredient(ingredient_id):
    """Admin endpoint to update an ingredient"""
    from app import Ingredient, serialize_ingredient
    try:
        ingredient = db.session.execute(
            db.select(Ingredient).filter_by(ingredient_id=ingredient_id)
        ).scalar_one_or_none()
        
        if ingredient is None:
            return jsonify({"error": "Ingredient not found."}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            ingredient.name = data['name']
        if 'price' in data:
            ingredient.price = data['price']
        if 'price_unit_id' in data:
            ingredient.price_unit_id = data['price_unit_id']
        if 'default_unit_id' in data:
            ingredient.default_unit_id = data['default_unit_id']
        if 'contains_peanuts' in data:
            ingredient.contains_peanuts = data['contains_peanuts']
        if 'gluten_status' in data:
            ingredient.gluten_status = data['gluten_status']
        
        db.session.commit()
        return jsonify(serialize_ingredient(ingredient))
    except Exception as e:
        db.session.rollback()
        print(f"Error updating ingredient: {e}")
        return jsonify({"error": "Failed to update ingredient"}), 500


@auth_bp.route('/admin/ingredients/<int:ingredient_id>', methods=['DELETE'])
@admin_required
def admin_delete_ingredient(ingredient_id):
    """Admin endpoint to delete an ingredient"""
    from app import Ingredient
    try:
        ingredient = db.session.execute(
            db.select(Ingredient).filter_by(ingredient_id=ingredient_id)
        ).scalar_one_or_none()
        
        if ingredient is None:
            return jsonify({"error": "Ingredient not found."}), 404
        
        # Check if ingredient is used in any recipes
        if ingredient.recipe_items:
            recipe_names = [ri.recipe.name for ri in ingredient.recipe_items]
            recipes_str = ", ".join(recipe_names)
            return jsonify({
                "error": f"Cannot delete ingredient '{ingredient.name}' because it is used in the following recipe(s): {recipes_str}. Please remove it from these recipes first."
            }), 400
        
        db.session.delete(ingredient)
        db.session.commit()
        return jsonify({"message": "Ingredient deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting ingredient: {e}")
        return jsonify({"error": "Failed to delete ingredient"}), 500


# --- Ingredient Group Management Endpoints (Admin Only) ---

@auth_bp.route('/admin/ingredient-groups', methods=['GET'])
@admin_required
def admin_list_ingredient_groups():
    """Admin endpoint to list all ingredient groups"""
    from app import IngredientGroup, serialize_ingredient_group
    try:
        groups = db.session.execute(db.select(IngredientGroup)).scalars().all()
        return jsonify([serialize_ingredient_group(g) for g in groups])
    except Exception as e:
        print(f"Database error in admin_list_ingredient_groups: {e}")
        return jsonify({"error": "Failed to fetch ingredient groups from database."}), 500


@auth_bp.route('/admin/ingredient-groups', methods=['POST'])
@admin_required
def admin_create_ingredient_group():
    """Admin endpoint to create a new ingredient group"""
    from app import IngredientGroup, serialize_ingredient_group
    try:
        data = request.get_json()
        
        # Create group with provided fields
        new_group = IngredientGroup(
            name=data.get('name'),
            description=data.get('description')
        )
        
        db.session.add(new_group)
        db.session.commit()
        return jsonify(serialize_ingredient_group(new_group)), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating ingredient group: {e}")
        return jsonify({"error": "Failed to create ingredient group"}), 500


@auth_bp.route('/admin/ingredient-groups/<int:group_id>', methods=['PUT'])
@admin_required
def admin_update_ingredient_group(group_id):
    """Admin endpoint to update an ingredient group"""
    from app import IngredientGroup, serialize_ingredient_group
    try:
        group = db.session.execute(
            db.select(IngredientGroup).filter_by(group_id=group_id)
        ).scalar_one_or_none()
        
        if group is None:
            return jsonify({"error": "Ingredient group not found."}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            group.name = data['name']
        if 'description' in data:
            group.description = data['description']
        
        db.session.commit()
        return jsonify(serialize_ingredient_group(group))
    except Exception as e:
        db.session.rollback()
        print(f"Error updating ingredient group: {e}")
        return jsonify({"error": "Failed to update ingredient group"}), 500


@auth_bp.route('/admin/ingredient-groups/<int:group_id>', methods=['DELETE'])
@admin_required
def admin_delete_ingredient_group(group_id):
    """Admin endpoint to delete an ingredient group"""
    from app import IngredientGroup
    try:
        group = db.session.execute(
            db.select(IngredientGroup).filter_by(group_id=group_id)
        ).scalar_one_or_none()
        
        if group is None:
            return jsonify({"error": "Ingredient group not found."}), 404
        
        # Check if group is used in any recipes
        if group.recipe_ingredients:
            recipe_count = len(set(ri.recipe_id for ri in group.recipe_ingredients))
            return jsonify({
                "error": f"Cannot delete ingredient group '{group.name}' because it is used in {recipe_count} recipe(s). The group will be removed from those recipes if you delete it."
            }), 400
        
        db.session.delete(group)
        db.session.commit()
        return jsonify({"message": "Ingredient group deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting ingredient group: {e}")
        return jsonify({"error": "Failed to delete ingredient group"}), 500


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
