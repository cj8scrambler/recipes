# backend_app.py

import os # Import the os module to read environment variables
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, ForeignKey, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from dotenv import load_dotenv

load_dotenv()
# --- 1. Database Configuration (MySQL) ---
# NOTE: The connection string is read from an environment variable for security.
# For local development, set the DATABASE_URL environment variable:
# export DATABASE_URL='mysql+pymysql://user:password@host:port/database'
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/recipe_db')

# Ensure your MySQL database schema (Units, Ingredients, Recipes, etc.) is already created.
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL # Reading from the variable
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Recommended setting for modern Flask apps

db = SQLAlchemy(app)

# Configure CORS to allow the React frontend to connect with credentials for session cookies
# Allow CORS_ORIGINS to be configured via environment variable for Docker deployments
# Default to localhost for development
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
allowed_origins = [origin.strip() for origin in cors_origins.split(',')]

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "supports_credentials": True  # Allow cookies to be sent
    }
})

# --- Import Authentication Module ---
# Import the auth module and initialize it with the database
# This must be done after db is created but before routes are defined
from auth import auth_bp, init_auth, login_required, admin_required
init_auth(db)


# --- 2. Database Models (SQLAlchemy ORM) ---
# These classes represent the tables in your MySQL database schema.

class Unit(db.Model):
    __tablename__ = 'Units'
    unit_id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    abbreviation = Column(String(10), nullable=False)
    category = Column(Enum('Weight', 'Volume', 'Dry Volume', 'Liquid Volume', 'Temperature', 'Item'), nullable=False)
    # The 'system' column name is quoted because it is a reserved word in MySQL
    system = Column('system', Enum('Metric', 'US Customary', 'Other'), nullable=False)
    base_conversion_factor = Column(Float(10, 5))

    # Relationships
    ingredient_prices_old = relationship("Ingredient", foreign_keys="Ingredient.price_unit_id", back_populates="price_unit")
    ingredient_defaults = relationship("Ingredient", foreign_keys="Ingredient.default_unit_id")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="unit")
    ingredient_prices = relationship("IngredientPrice", back_populates="unit")

class IngredientType(db.Model):
    __tablename__ = 'Ingredient_Types'
    type_id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(db.Text)

    # Relationships
    ingredients = relationship("Ingredient", back_populates="ingredient_type")

class Ingredient(db.Model):
    __tablename__ = 'Ingredients'
    ingredient_id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    price = Column(Float(10, 2))
    price_unit_id = Column(Integer, ForeignKey('Units.unit_id'))
    default_unit_id = Column(Integer, ForeignKey('Units.unit_id'))
    weight = Column(Float(10, 2))
    contains_peanuts = Column(Boolean, default=False, nullable=False)
    gluten_status = Column(Enum('Contains', 'Gluten-Free', 'GF_Available'), default='Gluten-Free', nullable=False)
    type_id = Column(Integer, ForeignKey('Ingredient_Types.type_id', ondelete='SET NULL'))

    # Relationships
    price_unit = relationship("Unit", foreign_keys=[price_unit_id], back_populates="ingredient_prices_old")
    default_unit = relationship("Unit", foreign_keys=[default_unit_id])
    recipe_items = relationship("RecipeIngredient", back_populates="ingredient")
    prices = relationship("IngredientPrice", back_populates="ingredient", cascade="all, delete-orphan")
    ingredient_type = relationship("IngredientType", back_populates="ingredients")

class IngredientPrice(db.Model):
    __tablename__ = 'Ingredient_Prices'
    price_id = Column(Integer, primary_key=True)
    ingredient_id = Column(Integer, ForeignKey('Ingredients.ingredient_id', ondelete='CASCADE'), nullable=False)
    price = Column(db.Numeric(10, 2), nullable=False)
    unit_id = Column(Integer, ForeignKey('Units.unit_id'), nullable=False)
    price_note = Column(String(255))
    created_at = Column(db.DateTime, server_default=db.func.current_timestamp())
    updated_at = Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relationships
    ingredient = relationship("Ingredient", back_populates="prices")
    unit = relationship("Unit", back_populates="ingredient_prices")

class Recipe(db.Model):
    __tablename__ = 'Recipes'
    recipe_id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(db.Text)
    instructions = Column(db.Text)
    base_servings = Column(Integer, default=4, nullable=False)

    parent_recipe_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='SET NULL'))
    variant_notes = Column(String(255))

    # Relationships
    parent_recipe = relationship("Recipe", remote_side=[recipe_id], backref='variants')
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    tags = relationship("RecipeTag", back_populates="recipe", cascade="all, delete-orphan")

class IngredientGroup(db.Model):
    __tablename__ = 'Ingredient_Groups'
    group_id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(db.Text)

    # Relationships
    recipe_ingredients = relationship("RecipeIngredient", back_populates="group")

class RecipeIngredient(db.Model):
    __tablename__ = 'Recipe_Ingredients'
    # Composite primary key
    recipe_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='CASCADE'), primary_key=True)
    ingredient_id = Column(Integer, ForeignKey('Ingredients.ingredient_id'), primary_key=True)

    quantity = Column(Float(10, 2), nullable=False)
    unit_id = Column(Integer, ForeignKey('Units.unit_id'), nullable=False)
    notes = Column(String(255))
    group_id = Column(Integer, ForeignKey('Ingredient_Groups.group_id', ondelete='SET NULL'))

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_items")
    unit = relationship("Unit", back_populates="recipe_ingredients")
    group = relationship("IngredientGroup", back_populates="recipe_ingredients")

class Tag(db.Model):
    __tablename__ = 'Tags'
    tag_id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(db.Text)

    recipes = relationship("RecipeTag", back_populates="tag")

class RecipeTag(db.Model):
    __tablename__ = 'Recipe_Tags'
    recipe_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='CASCADE'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('Tags.tag_id', ondelete='CASCADE'), primary_key=True)

    # Relationships
    recipe = relationship("Recipe", back_populates="tags")
    tag = relationship("Tag", back_populates="recipes")


class RecipeList(db.Model):
    __tablename__ = 'Recipe_Lists'
    list_id = Column(Integer, primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=db.func.current_timestamp())
    updated_at = Column(DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relationships
    items = relationship("RecipeListItem", back_populates="recipe_list", cascade="all, delete-orphan")


class RecipeListItem(db.Model):
    __tablename__ = 'Recipe_List_Items'
    item_id = Column(Integer, primary_key=True)
    list_id = Column(Integer, ForeignKey('Recipe_Lists.list_id', ondelete='CASCADE'), nullable=False)
    recipe_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='CASCADE'), nullable=False)
    servings = Column(Integer, default=1, nullable=False)
    variant_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='SET NULL'))
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=db.func.current_timestamp())
    updated_at = Column(DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relationships
    recipe_list = relationship("RecipeList", back_populates="items")
    recipe = relationship("Recipe", foreign_keys=[recipe_id])
    variant = relationship("Recipe", foreign_keys=[variant_id])


# --- 3. Serialization Helpers (Converting SQLAlchemy objects to JSON) ---

def serialize_recipe_ingredient(ri, include_cost=False, include_weight=False, units_dict=None):
    """Converts a RecipeIngredient ORM object to a dictionary for JSON response."""
    result = {
        'ingredient_id': ri.ingredient_id,
        'name': ri.ingredient.name if ri.ingredient is not None else None,
        'quantity': ri.quantity,
        'unit_id': ri.unit_id,
        'unit_abv': ri.unit.abbreviation if ri.unit is not None else None,
        'notes': ri.notes,
        'group_id': ri.group_id,
        'group_name': ri.group.name if ri.group is not None else None
    }
    
    # Optionally include cost information (for admin views)
    if include_cost and units_dict:
        cost, has_price = calculate_ingredient_cost(ri, units_dict)
        result['cost'] = round(cost, 2) if cost is not None else None
        result['has_price_data'] = has_price
    
    # Optionally include weight information (for admin views)
    if include_weight:
        weight_info = calculate_ingredient_weight(ri)
        result['base_weight'] = weight_info['base_weight']
        result['scaled_weight'] = weight_info['scaled_weight']
        result['has_weight_data'] = weight_info['has_weight']
    
    return result

def serialize_recipe(recipe, include_cost=False, units_list=None):
    """Converts a Recipe ORM object to a dictionary, including nested ingredients."""
    units_dict = None
    if include_cost and units_list:
        units_dict = {u.unit_id: u for u in units_list}
    
    result = {
        'recipe_id': recipe.recipe_id,
        'name': recipe.name,
        'base_servings': recipe.base_servings,
        'description': recipe.description,
        # Recursively serialize the list of RecipeIngredient objects
        'ingredients': [serialize_recipe_ingredient(ri, include_cost, units_dict) for ri in recipe.ingredients],
        'instructions': recipe.instructions,
        # Include tags
        'tags': [{'tag_id': rt.tag.tag_id, 'name': rt.tag.name} for rt in recipe.tags if rt.tag],
        # Include variant information
        'parent_recipe_id': recipe.parent_recipe_id,
        'variant_notes': recipe.variant_notes,
        # Include list of variants (child recipes) with basic info
        'variants': [{'recipe_id': v.recipe_id, 'name': v.name} for v in recipe.variants] if recipe.variants else []
    }
    
    # Optionally include total cost
    if include_cost and units_list:
        cost_info = calculate_recipe_cost(recipe, units_list)
        result['total_cost'] = cost_info['total_cost']
        result['has_missing_prices'] = cost_info['has_missing_prices']
    
    return result

def serialize_ingredient(ingredient):
    """Converts an Ingredient ORM object to a dictionary."""
    # Try to get prices, but handle case where Ingredient_Prices table doesn't exist yet
    prices_list = []
    try:
        if hasattr(ingredient, 'prices'):
            prices_list = [serialize_ingredient_price(p) for p in ingredient.prices]
    except Exception as e:
        # Table may not exist yet or other database error
        print(f"Warning: Could not load prices for ingredient {ingredient.ingredient_id}: {e}")
        pass
    
    # Get ingredient type info if available
    type_id = None
    type_name = None
    try:
        if hasattr(ingredient, 'type_id'):
            type_id = ingredient.type_id
        if hasattr(ingredient, 'ingredient_type') and ingredient.ingredient_type:
            type_name = ingredient.ingredient_type.name
    except Exception as e:
        print(f"Warning: Could not load type for ingredient {ingredient.ingredient_id}: {e}")
        pass
    
    return {
        'ingredient_id': ingredient.ingredient_id,
        'name': ingredient.name,
        'price': ingredient.price,
        'price_unit_id': ingredient.price_unit_id,
        'default_unit_id': ingredient.default_unit_id,
        'weight': ingredient.weight,
        'gluten_status': ingredient.gluten_status,
        'type_id': type_id,
        'type_name': type_name,
        'prices': prices_list
    }

def serialize_unit(unit):
    """Converts a Unit ORM object to a dictionary."""
    return {
        'unit_id': unit.unit_id,
        'name': unit.name,
        'abbreviation': unit.abbreviation,
        'category': unit.category,
        'system': unit.system,
        'base_conversion_factor': unit.base_conversion_factor
    }

def serialize_ingredient_group(group):
    """Converts an IngredientGroup ORM object to a dictionary."""
    return {
        'group_id': group.group_id,
        'name': group.name,
        'description': group.description
    }

def serialize_ingredient_type(ingredient_type):
    """Converts an IngredientType ORM object to a dictionary."""
    return {
        'type_id': ingredient_type.type_id,
        'name': ingredient_type.name,
        'description': ingredient_type.description
    }

def serialize_ingredient_price(price):
    """Converts an IngredientPrice ORM object to a dictionary."""
    return {
        'price_id': price.price_id,
        'ingredient_id': price.ingredient_id,
        'price': float(price.price) if price.price is not None else None,
        'unit_id': price.unit_id,
        'unit_abv': price.unit.abbreviation if price.unit else None,
        'unit_name': price.unit.name if price.unit else None,
        'unit_category': price.unit.category if price.unit else None,
        'price_note': price.price_note
    }

def serialize_tag(tag):
    """Converts a Tag ORM object to a dictionary."""
    return {
        'tag_id': tag.tag_id,
        'name': tag.name,
        'description': tag.description
    }

def serialize_recipe_list(recipe_list, include_items=True):
    """Converts a RecipeList ORM object to a dictionary."""
    result = {
        'list_id': recipe_list.list_id,
        'user_id': recipe_list.user_id,
        'name': recipe_list.name,
        'created_at': recipe_list.created_at.isoformat() if recipe_list.created_at else None,
        'updated_at': recipe_list.updated_at.isoformat() if recipe_list.updated_at else None,
        'item_count': len(recipe_list.items) if recipe_list.items else 0
    }
    if include_items:
        result['items'] = [serialize_recipe_list_item(item) for item in recipe_list.items]
    return result

def serialize_recipe_list_item(item):
    """Converts a RecipeListItem ORM object to a dictionary."""
    return {
        'item_id': item.item_id,
        'list_id': item.list_id,
        'recipe_id': item.recipe_id,
        'recipe_name': item.recipe.name if item.recipe else None,
        'servings': item.servings,
        'variant_id': item.variant_id,
        'variant_name': item.variant.name if item.variant else None,
        'notes': item.notes,
        'created_at': item.created_at.isoformat() if item.created_at else None,
        'updated_at': item.updated_at.isoformat() if item.updated_at else None
    }

# --- Cost Calculation Helpers ---

def can_convert_units(from_unit, to_unit):
    """Check if two units can be converted between each other."""
    if not from_unit or not to_unit:
        return False
    
    # Volume categories can convert between each other
    volume_categories = ['Volume', 'Dry Volume', 'Liquid Volume']
    from_is_volume = from_unit.category in volume_categories
    to_is_volume = to_unit.category in volume_categories
    
    if from_is_volume and to_is_volume:
        return True
    
    # Other categories must match exactly
    return from_unit.category == to_unit.category

def convert_unit_quantity(quantity, from_unit, to_unit):
    """Convert quantity from one unit to another."""
    if not from_unit or not to_unit:
        return None
    
    # Same unit - no conversion needed
    if from_unit.unit_id == to_unit.unit_id:
        return quantity
    
    # Check unit compatibility
    if not can_convert_units(from_unit, to_unit):
        return None
    
    # Check for None conversion factors
    if from_unit.base_conversion_factor is None or to_unit.base_conversion_factor is None:
        return None
    
    # Convert to base unit, then to target unit
    base_quantity = quantity * from_unit.base_conversion_factor
    converted_quantity = base_quantity / to_unit.base_conversion_factor
    return converted_quantity

def calculate_ingredient_cost(recipe_ingredient, units_dict):
    """
    Calculate cost for a single recipe ingredient.
    Returns tuple: (cost, has_price_data, details)
    - cost: float or None if price data unavailable
    - has_price_data: bool indicating if price data was available
    - details: dict with breakdown information (original_price, price_unit, converted_price, recipe_quantity, recipe_unit)
    """
    ingredient = recipe_ingredient.ingredient
    recipe_unit = recipe_ingredient.unit
    recipe_quantity = recipe_ingredient.quantity
    
    if not ingredient or not recipe_unit or not recipe_quantity:
        return None, False, None
    
    # Find a price for this ingredient that matches a compatible unit
    matching_price = None
    try:
        # Access prices relationship safely in case table doesn't exist
        if hasattr(ingredient, 'prices'):
            for price in ingredient.prices:
                price_unit = units_dict.get(price.unit_id)
                if price_unit and can_convert_units(recipe_unit, price_unit):
                    matching_price = price
                    break
    except Exception as e:
        # Table may not exist yet or other database error
        print(f"Warning: Could not access prices for ingredient {ingredient.ingredient_id}: {e}")
        pass
    
    if not matching_price:
        return None, False, None
    
    # Convert recipe quantity to price unit
    price_unit = units_dict.get(matching_price.unit_id)
    converted_quantity = convert_unit_quantity(recipe_quantity, recipe_unit, price_unit)
    
    if converted_quantity is None:
        return None, False, None
    
    # Calculate cost (convert Decimal to float for calculation)
    original_price = float(matching_price.price)
    converted_qty = float(converted_quantity)
    cost = converted_qty * original_price
    
    # Calculate the price per recipe unit
    # This is the price after unit conversion
    price_per_recipe_unit = cost / float(recipe_quantity)
    
    # Build details dict
    details = {
        'original_price': original_price,
        'original_unit': price_unit.abbreviation if price_unit else None,
        'original_unit_name': price_unit.name if price_unit else None,
        'price_per_recipe_unit': price_per_recipe_unit,
        'recipe_unit': recipe_unit.abbreviation if recipe_unit else None,
        'recipe_unit_name': recipe_unit.name if recipe_unit else None,
        'recipe_quantity': float(recipe_quantity),
    }
    
    return cost, True, details

def calculate_recipe_cost(recipe, units_list, scale_factor=1.0):
    """
    Calculate total cost for a recipe and per-ingredient costs.
    Returns dict with total_cost, ingredients_cost, and missing_prices flag.
    """
    units_dict = {u.unit_id: u for u in units_list}
    total_cost = 0.0
    has_missing_prices = False
    ingredients_cost = []
    
    for ri in recipe.ingredients:
        cost, has_price, details = calculate_ingredient_cost(ri, units_dict)
        
        if has_price and cost is not None:
            scaled_cost = cost * scale_factor
            scaled_quantity = float(ri.quantity) * scale_factor
            total_cost += scaled_cost
            
            ingredient_info = {
                'ingredient_id': ri.ingredient_id,
                'name': ri.ingredient.name if ri.ingredient else None,
                'cost': round(scaled_cost, 2),
                'has_price_data': True
            }
            
            # Add detailed breakdown if available
            if details:
                ingredient_info['details'] = {
                    'original_price': details['original_price'],
                    'original_unit': details['original_unit'],
                    'original_unit_name': details['original_unit_name'],
                    'price_per_recipe_unit': details['price_per_recipe_unit'],
                    'recipe_unit': details['recipe_unit'],
                    'recipe_unit_name': details['recipe_unit_name'],
                    'recipe_quantity': scaled_quantity,
                }
            
            ingredients_cost.append(ingredient_info)
        else:
            has_missing_prices = True
            ingredients_cost.append({
                'ingredient_id': ri.ingredient_id,
                'name': ri.ingredient.name if ri.ingredient else None,
                'cost': None,
                'has_price_data': False
            })
    
    return {
        'total_cost': round(total_cost, 2) if not has_missing_prices else None,
        'ingredients_cost': ingredients_cost,
        'has_missing_prices': has_missing_prices
    }

def calculate_ingredient_weight(recipe_ingredient):
    """
    Calculate weight for a single recipe ingredient.
    Returns dict with base_weight, scaled_weight, and has_weight flag.
    The weight is in grams.
    """
    ingredient = recipe_ingredient.ingredient
    recipe_quantity = recipe_ingredient.quantity
    
    if not ingredient or recipe_quantity is None:
        return {'base_weight': None, 'scaled_weight': None, 'has_weight': False}
    
    # Get the ingredient's base weight (grams per default unit)
    # Weight is only valid if BOTH weight value AND default_unit_id are set
    base_weight = ingredient.weight
    default_unit_id = ingredient.default_unit_id
    
    if base_weight is None or default_unit_id is None:
        return {'base_weight': None, 'scaled_weight': None, 'has_weight': False}
    
    # Calculate scaled weight based on recipe quantity
    scaled_weight = float(base_weight) * float(recipe_quantity)
    
    return {
        'base_weight': float(base_weight),
        'scaled_weight': round(scaled_weight, 2),
        'has_weight': True
    }

def calculate_recipe_weight(recipe, scale_factor=1.0):
    """
    Calculate total weight for a recipe and per-ingredient weights.
    Returns dict with total_weight, ingredients_weight, and missing_weights flag.
    Weight is in grams.
    """
    total_weight = 0.0
    has_missing_weights = False
    ingredients_weight = []
    
    for ri in recipe.ingredients:
        weight_info = calculate_ingredient_weight(ri)
        
        if weight_info['has_weight'] and weight_info['scaled_weight'] is not None:
            scaled_weight = weight_info['scaled_weight'] * scale_factor
            total_weight += scaled_weight
            
            ingredients_weight.append({
                'ingredient_id': ri.ingredient_id,
                'name': ri.ingredient.name if ri.ingredient else None,
                'base_weight': weight_info['base_weight'],
                'scaled_weight': round(scaled_weight, 2),
                'has_weight_data': True
            })
        else:
            has_missing_weights = True
            ingredients_weight.append({
                'ingredient_id': ri.ingredient_id,
                'name': ri.ingredient.name if ri.ingredient else None,
                'base_weight': None,
                'scaled_weight': None,
                'has_weight_data': False
            })
    
    return {
        'total_weight': round(total_weight, 2) if not has_missing_weights else None,
        'ingredients_weight': ingredients_weight,
        'has_missing_weights': has_missing_weights
    }


# --- 4. API Endpoints ---

@app.route("/")
def read_root():
    """Simple health check endpoint."""
    return jsonify({"message": "Recipe API is running (Flask/SQLAlchemy). Connects to MySQL."})

@app.route("/api/recipes", methods=['GET', 'POST'])
@login_required
def recipes_list():
    """Endpoint for listing recipes (GET) or creating new recipes (POST)."""
    if request.method == 'GET':
        try:
            # Use .all() to get a list of ORM objects
            recipes = db.session.execute(db.select(Recipe)).scalars().all()
            return jsonify([serialize_recipe(r) for r in recipes])
        except Exception as e:
            print(f"Database error in get_recipes: {e}")
            return jsonify({"error": "Failed to fetch recipes from database."}), 500
    elif request.method == 'POST':
        # Create new recipe
        try:
            data = request.get_json()
            
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
            
            db.session.commit()
            return jsonify(serialize_recipe(new_recipe)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating recipe: {e}")
            return jsonify({"error": "Failed to create recipe"}), 500

@app.route('/api/recipes/<int:recipe_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def recipe(recipe_id):
    try:
        recipe = db.session.execute(db.select(Recipe).filter_by(recipe_id=recipe_id)).scalar_one_or_none()
        if recipe is None:
            return jsonify({"error": "Recipe not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch recipes from database."}), 500
    if request.method == 'GET':
        return jsonify(serialize_recipe(recipe))
    elif request.method == 'PUT':
        #TODO: Check authorization
        data = request.get_json()
        
        # Handle ingredients separately if provided
        ingredients_data = data.get('ingredients', None)
        
        # Filter out relationship fields that should not be directly set
        # These are relationship fields, not column fields
        fields_to_skip = ['ingredients', 'tags', 'parent_recipe', 'variants']
        
        # Update basic recipe fields
        for key, value in data.items():
            if key in fields_to_skip:
                # Skip relationship fields - they require special handling
                continue
            if hasattr(recipe, key):
                setattr(recipe, key, value)
            else:
                return jsonify({"error": f"Invalid field {key}"}), 500
        
        # Handle ingredients update if provided
        if ingredients_data is not None:
            try:
                # Get current ingredient IDs for this recipe
                current_ingredients = {ri.ingredient_id: ri for ri in recipe.ingredients}
                
                # Get incoming ingredient IDs
                incoming_ingredient_ids = set()
                
                for ing_data in ingredients_data:
                    ingredient_id = ing_data.get('ingredient_id')
                    if not ingredient_id:
                        continue
                    
                    incoming_ingredient_ids.add(ingredient_id)
                    
                    # Check if this ingredient already exists in the recipe
                    if ingredient_id in current_ingredients:
                        # Update existing ingredient
                        recipe_ingredient = current_ingredients[ingredient_id]
                        recipe_ingredient.quantity = ing_data.get('quantity', recipe_ingredient.quantity)
                        recipe_ingredient.unit_id = ing_data.get('unit_id', recipe_ingredient.unit_id)
                        recipe_ingredient.notes = ing_data.get('notes', recipe_ingredient.notes)
                        recipe_ingredient.group_id = ing_data.get('group_id', recipe_ingredient.group_id)
                    else:
                        # Add new ingredient
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
                for ingredient_id in current_ingredients:
                    if ingredient_id not in incoming_ingredient_ids:
                        db.session.delete(current_ingredients[ingredient_id])
                        
            except Exception as e:
                print(f"Error updating ingredients: {e}")  # Log for debugging
                return jsonify({"error": "Failed to update ingredients"}), 500
        
        # Handle tags update if provided
        tags_data = data.get('tags', None)
        if tags_data is not None:
            try:
                # Get current tag IDs for this recipe
                current_tags = {rt.tag_id: rt for rt in recipe.tags}
                
                # Get incoming tag IDs
                incoming_tag_ids = set()
                
                for tag_data in tags_data:
                    tag_id = tag_data.get('tag_id') if isinstance(tag_data, dict) else tag_data
                    if not tag_id:
                        continue
                    
                    incoming_tag_ids.add(tag_id)
                    
                    # Add new tag if not already present
                    if tag_id not in current_tags:
                        new_recipe_tag = RecipeTag(
                            recipe_id=recipe.recipe_id,
                            tag_id=tag_id
                        )
                        db.session.add(new_recipe_tag)
                
                # Remove tags that are no longer in the list
                for tag_id in current_tags:
                    if tag_id not in incoming_tag_ids:
                        db.session.delete(current_tags[tag_id])
                        
            except Exception as e:
                print(f"Error updating tags: {e}")  # Log for debugging
                return jsonify({"error": "Failed to update tags"}), 500
        
        try:
            db.session.commit()
            return jsonify(serialize_recipe(recipe))
        except Exception as e:
            db.session.rollback()
            print(f"Database commit error: {e}")  # Log for debugging
            return jsonify({"error": "Database commit failure"}), 500
    elif request.method == 'DELETE':
        # Delete recipe
        try:
            db.session.delete(recipe)
            db.session.commit()
            return jsonify({"message": "Recipe deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting recipe: {e}")
            return jsonify({"error": "Failed to delete recipe"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route('/api/recipes/<int:recipe_id>/cost', methods=['GET'])
@login_required
def recipe_cost(recipe_id):
    """Endpoint to get recipe cost information."""
    try:
        recipe = db.session.execute(db.select(Recipe).filter_by(recipe_id=recipe_id)).scalar_one_or_none()
        if recipe is None:
            return jsonify({"error": "Recipe not found."}), 404
        
        # Get scale factor from query params (default to 1.0)
        scale_factor = float(request.args.get('scale', 1.0))
        
        # Get all units for conversion
        units = db.session.execute(db.select(Unit)).scalars().all()
        
        # Calculate cost
        cost_info = calculate_recipe_cost(recipe, units, scale_factor)
        
        return jsonify(cost_info)
    except Exception as e:
        print(f"Error calculating recipe cost: {e}")
        return jsonify({"error": "Failed to calculate recipe cost"}), 500

@app.route('/api/recipes/<int:recipe_id>/weight', methods=['GET'])
@login_required
def recipe_weight(recipe_id):
    """Endpoint to get recipe weight information."""
    try:
        recipe = db.session.execute(db.select(Recipe).filter_by(recipe_id=recipe_id)).scalar_one_or_none()
        if recipe is None:
            return jsonify({"error": "Recipe not found."}), 404
        
        # Get scale factor from query params (default to 1.0)
        scale_factor = float(request.args.get('scale', 1.0))
        
        # Calculate weight
        weight_info = calculate_recipe_weight(recipe, scale_factor)
        
        return jsonify(weight_info)
    except Exception as e:
        print(f"Error calculating recipe weight: {e}")
        return jsonify({"error": "Failed to calculate recipe weight"}), 500

@app.route("/api/ingredients", methods=['GET', 'POST'])
@login_required
def ingredients_list():
    """Endpoint for listing ingredients (GET) or creating new ingredients (POST)."""
    if request.method == 'GET':
        try:
            # Use .all() to get a list of ORM objects
            ingredients = db.session.execute(db.select(Ingredient)).scalars().all()
            return jsonify([serialize_ingredient(i) for i in ingredients])
        except Exception as e:
            print(f"Database error in get_ingredients: {e}")
            return jsonify({"error": "Failed to fetch ingredients from database."}), 500
    elif request.method == 'POST':
        # Create new ingredient
        try:
            data = request.get_json()
            
            # Create ingredient with provided fields
            new_ingredient = Ingredient(
                name=data.get('name'),
                price=data.get('price'),
                price_unit_id=data.get('price_unit_id'),
                default_unit_id=data.get('default_unit_id'),
                weight=data.get('weight'),
                contains_peanuts=data.get('contains_peanuts', False),
                gluten_status=data.get('gluten_status', 'Gluten-Free'),
                type_id=data.get('type_id')
            )
            
            db.session.add(new_ingredient)
            db.session.commit()
            return jsonify(serialize_ingredient(new_ingredient)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating ingredient: {e}")
            return jsonify({"error": "Failed to create ingredient"}), 500

@app.route('/api/ingredients/<int:ingredient_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def ingredient(ingredient_id):
    """Endpoint for getting, updating, or deleting a specific ingredient."""
    try:
        ingredient = db.session.execute(db.select(Ingredient).filter_by(ingredient_id=ingredient_id)).scalar_one_or_none()
        if ingredient is None:
            return jsonify({"error": "Ingredient not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch ingredient from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_ingredient(ingredient))
    elif request.method == 'PUT':
        # Update ingredient
        try:
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
            if 'weight' in data:
                ingredient.weight = data['weight']
            if 'contains_peanuts' in data:
                ingredient.contains_peanuts = data['contains_peanuts']
            if 'gluten_status' in data:
                ingredient.gluten_status = data['gluten_status']
            if 'type_id' in data:
                ingredient.type_id = data['type_id']
            
            db.session.commit()
            return jsonify(serialize_ingredient(ingredient))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating ingredient: {e}")
            return jsonify({"error": "Failed to update ingredient"}), 500
    elif request.method == 'DELETE':
        # Delete ingredient
        # First check if ingredient is used in any recipes
        # Explicitly query Recipe_Ingredients to avoid relationship loading issues
        try:
            recipe_usages = db.session.execute(
                db.select(RecipeIngredient).filter_by(ingredient_id=ingredient_id)
            ).scalars().all()
            
            if recipe_usages:
                # Get the list of recipes that use this ingredient
                recipe_names = []
                for ri in recipe_usages:
                    if ri.recipe:
                        recipe_names.append(ri.recipe.name)
                
                if recipe_names:
                    recipes_str = ", ".join(recipe_names)
                    return jsonify({
                        "error": f"Cannot delete ingredient '{ingredient.name}' because it is used in the following recipe(s): {recipes_str}. Please remove it from these recipes first."
                    }), 400
        except Exception as e:
            print(f"Warning: Error checking recipe usages for ingredient {ingredient_id}: {e}")
            # Continue with deletion attempt - database constraint will catch it if needed
        
        try:
            db.session.delete(ingredient)
            db.session.commit()
            return jsonify({"message": "Ingredient deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting ingredient: {e}")
            # Check if it's a foreign key constraint error
            error_msg = str(e)
            if 'foreign key constraint' in error_msg.lower() or '1451' in error_msg:
                return jsonify({
                    "error": f"Cannot delete ingredient '{ingredient.name}' because it is still referenced in the database. This may indicate orphaned records. Please contact an administrator."
                }), 400
            return jsonify({"error": "Failed to delete ingredient"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route('/api/ingredients/<int:ingredient_id>/prices', methods=['GET', 'POST'])
@login_required
def ingredient_prices(ingredient_id):
    """Endpoint for managing ingredient prices."""
    # Verify ingredient exists
    try:
        ingredient = db.session.execute(db.select(Ingredient).filter_by(ingredient_id=ingredient_id)).scalar_one_or_none()
        if ingredient is None:
            return jsonify({"error": "Ingredient not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch ingredient from database."}), 500
    
    if request.method == 'GET':
        # Return all prices for this ingredient
        try:
            if hasattr(ingredient, 'prices'):
                return jsonify([serialize_ingredient_price(p) for p in ingredient.prices])
            else:
                return jsonify([])
        except Exception as e:
            # Table may not exist yet if migration hasn't been run
            print(f"Error accessing ingredient prices: {e}")
            return jsonify([])
    elif request.method == 'POST':
        # Create new price for this ingredient
        try:
            data = request.get_json()
            
            # Check if a price already exists for this unit
            existing_price = db.session.execute(
                db.select(IngredientPrice).filter_by(
                    ingredient_id=ingredient_id,
                    unit_id=data.get('unit_id')
                )
            ).scalar_one_or_none()
            
            if existing_price:
                return jsonify({"error": "A price already exists for this unit. Please update it instead."}), 400
            
            new_price = IngredientPrice(
                ingredient_id=ingredient_id,
                price=data.get('price'),
                unit_id=data.get('unit_id'),
                price_note=data.get('price_note')
            )
            
            db.session.add(new_price)
            db.session.commit()
            return jsonify(serialize_ingredient_price(new_price)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating ingredient price: {e}")
            return jsonify({"error": "Failed to create ingredient price"}), 500

@app.route('/api/ingredients/<int:ingredient_id>/prices/<int:price_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def ingredient_price(ingredient_id, price_id):
    """Endpoint for managing a specific ingredient price."""
    try:
        price = db.session.execute(
            db.select(IngredientPrice).filter_by(
                price_id=price_id,
                ingredient_id=ingredient_id
            )
        ).scalar_one_or_none()
        if price is None:
            return jsonify({"error": "Price not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch price from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_ingredient_price(price))
    elif request.method == 'PUT':
        # Update price
        try:
            data = request.get_json()
            
            if 'price' in data:
                price.price = data['price']
            if 'unit_id' in data:
                # Check if changing to a unit that already has a price
                if data['unit_id'] != price.unit_id:
                    existing = db.session.execute(
                        db.select(IngredientPrice).filter_by(
                            ingredient_id=ingredient_id,
                            unit_id=data['unit_id']
                        )
                    ).scalar_one_or_none()
                    if existing:
                        return jsonify({"error": "A price already exists for this unit."}), 400
                price.unit_id = data['unit_id']
            if 'price_note' in data:
                price.price_note = data['price_note']
            
            db.session.commit()
            return jsonify(serialize_ingredient_price(price))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating ingredient price: {e}")
            return jsonify({"error": "Failed to update ingredient price"}), 500
    elif request.method == 'DELETE':
        # Delete price
        try:
            db.session.delete(price)
            db.session.commit()
            return jsonify({"message": "Price deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting ingredient price: {e}")
            return jsonify({"error": "Failed to delete ingredient price"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route("/api/units", methods=['GET'])
@login_required
def get_units():
    """Endpoint to get all units."""
    try:
        units = db.session.execute(db.select(Unit)).scalars().all()
        return jsonify([serialize_unit(u) for u in units])
    except Exception as e:
        print(f"Database error in get_units: {e}")
        return jsonify({"error": "Failed to fetch units from database."}), 500

@app.route("/api/ingredient-groups", methods=['GET', 'POST'])
@login_required
def ingredient_groups_list():
    """Endpoint for listing ingredient groups (GET) or creating new groups (POST)."""
    if request.method == 'GET':
        try:
            groups = db.session.execute(db.select(IngredientGroup)).scalars().all()
            return jsonify([serialize_ingredient_group(g) for g in groups])
        except Exception as e:
            print(f"Database error in get_ingredient_groups: {e}")
            return jsonify({"error": "Failed to fetch ingredient groups from database."}), 500
    elif request.method == 'POST':
        # Create new ingredient group
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

@app.route('/api/ingredient-groups/<int:group_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def ingredient_group(group_id):
    """Endpoint for getting, updating, or deleting a specific ingredient group."""
    try:
        group = db.session.execute(db.select(IngredientGroup).filter_by(group_id=group_id)).scalar_one_or_none()
        if group is None:
            return jsonify({"error": "Ingredient group not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch ingredient group from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_ingredient_group(group))
    elif request.method == 'PUT':
        # Update ingredient group
        try:
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
    elif request.method == 'DELETE':
        # Delete ingredient group
        # Check if group is used in any recipes
        if group.recipe_ingredients:
            # Get count of recipes using this group
            recipe_count = len(set(ri.recipe_id for ri in group.recipe_ingredients))
            return jsonify({
                "error": f"Cannot delete ingredient group '{group.name}' because it is used in {recipe_count} recipe(s). The group will be removed from those recipes if you delete it."
            }), 400
        
        try:
            db.session.delete(group)
            db.session.commit()
            return jsonify({"message": "Ingredient group deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting ingredient group: {e}")
            return jsonify({"error": "Failed to delete ingredient group"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route("/api/ingredient-types", methods=['GET', 'POST'])
@login_required
def ingredient_types_list():
    """Endpoint for listing ingredient types (GET) or creating new types (POST)."""
    if request.method == 'GET':
        try:
            types = db.session.execute(db.select(IngredientType)).scalars().all()
            return jsonify([serialize_ingredient_type(t) for t in types])
        except Exception as e:
            print(f"Database error in get_ingredient_types: {e}")
            return jsonify({"error": "Failed to fetch ingredient types from database."}), 500
    elif request.method == 'POST':
        # Create new ingredient type
        try:
            data = request.get_json()
            
            # Create type with provided fields
            new_type = IngredientType(
                name=data.get('name'),
                description=data.get('description')
            )
            
            db.session.add(new_type)
            db.session.commit()
            return jsonify(serialize_ingredient_type(new_type)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating ingredient type: {e}")
            return jsonify({"error": "Failed to create ingredient type"}), 500

@app.route('/api/ingredient-types/<int:type_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def ingredient_type(type_id):
    """Endpoint for getting, updating, or deleting a specific ingredient type."""
    try:
        ingredient_type = db.session.execute(db.select(IngredientType).filter_by(type_id=type_id)).scalar_one_or_none()
        if ingredient_type is None:
            return jsonify({"error": "Ingredient type not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch ingredient type from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_ingredient_type(ingredient_type))
    elif request.method == 'PUT':
        # Update ingredient type
        try:
            data = request.get_json()
            
            # Update fields
            if 'name' in data:
                ingredient_type.name = data['name']
            if 'description' in data:
                ingredient_type.description = data['description']
            
            db.session.commit()
            return jsonify(serialize_ingredient_type(ingredient_type))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating ingredient type: {e}")
            return jsonify({"error": "Failed to update ingredient type"}), 500
    elif request.method == 'DELETE':
        # Delete ingredient type
        # Note: ON DELETE SET NULL will automatically clear type_id from any ingredients using this type
        try:
            db.session.delete(ingredient_type)
            db.session.commit()
            return jsonify({"message": "Ingredient type deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting ingredient type: {e}")
            return jsonify({"error": "Failed to delete ingredient type"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route("/api/tags", methods=['GET', 'POST'])
@login_required
def tags_list():
    """Endpoint for listing tags (GET) or creating new tags (POST)."""
    if request.method == 'GET':
        try:
            tags = db.session.execute(db.select(Tag)).scalars().all()
            return jsonify([serialize_tag(t) for t in tags])
        except Exception as e:
            print(f"Database error in get_tags: {e}")
            return jsonify({"error": "Failed to fetch tags from database."}), 500
    elif request.method == 'POST':
        # Create new tag - admin only
        from flask import g
        if not hasattr(g, 'current_user') or g.current_user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        try:
            data = request.get_json()
            
            # Create tag with provided fields
            new_tag = Tag(
                name=data.get('name'),
                description=data.get('description')
            )
            
            db.session.add(new_tag)
            db.session.commit()
            return jsonify(serialize_tag(new_tag)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating tag: {e}")
            return jsonify({"error": "Failed to create tag"}), 500

@app.route('/api/tags/<int:tag_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def tag(tag_id):
    """Endpoint for getting, updating, or deleting a specific tag."""
    try:
        tag = db.session.execute(db.select(Tag).filter_by(tag_id=tag_id)).scalar_one_or_none()
        if tag is None:
            return jsonify({"error": "Tag not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch tag from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_tag(tag))
    elif request.method == 'PUT':
        # Update tag - admin only
        from flask import g
        if not hasattr(g, 'current_user') or g.current_user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        try:
            data = request.get_json()
            
            # Update fields
            if 'name' in data:
                tag.name = data['name']
            if 'description' in data:
                tag.description = data['description']
            
            db.session.commit()
            return jsonify(serialize_tag(tag))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating tag: {e}")
            return jsonify({"error": "Failed to update tag"}), 500
    elif request.method == 'DELETE':
        # Delete tag - admin only
        from flask import g
        if not hasattr(g, 'current_user') or g.current_user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        # Check if tag is used in any recipes
        if tag.recipes:
            recipe_count = len(tag.recipes)
            return jsonify({
                "error": f"Cannot delete tag '{tag.name}' because it is used in {recipe_count} recipe(s). Please remove it from those recipes first."
            }), 400
        
        try:
            db.session.delete(tag)
            db.session.commit()
            return jsonify({"message": "Tag deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting tag: {e}")
            return jsonify({"error": "Failed to delete tag"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405


# --- Recipe Lists Endpoints ---

@app.route("/api/recipe-lists", methods=['GET', 'POST'])
@login_required
def recipe_lists():
    """Endpoint for listing user's recipe lists (GET) or creating new lists (POST)."""
    from auth import get_current_user
    user = get_current_user()
    
    if request.method == 'GET':
        try:
            lists = db.session.execute(
                db.select(RecipeList).filter_by(user_id=user.id).order_by(RecipeList.name)
            ).scalars().all()
            return jsonify([serialize_recipe_list(lst, include_items=False) for lst in lists])
        except Exception as e:
            print(f"Database error in get_recipe_lists: {e}")
            return jsonify({"error": "Failed to fetch recipe lists from database."}), 500
    elif request.method == 'POST':
        try:
            data = request.get_json()
            name = data.get('name')
            
            if not name or not name.strip():
                return jsonify({"error": "List name is required"}), 400
            
            new_list = RecipeList(
                user_id=user.id,
                name=name.strip()
            )
            
            db.session.add(new_list)
            db.session.commit()
            return jsonify(serialize_recipe_list(new_list)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating recipe list: {e}")
            return jsonify({"error": "Failed to create recipe list"}), 500


@app.route('/api/recipe-lists/<int:list_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def recipe_list(list_id):
    """Endpoint for getting, updating, or deleting a specific recipe list."""
    from auth import get_current_user
    user = get_current_user()
    
    try:
        recipe_list = db.session.execute(
            db.select(RecipeList).filter_by(list_id=list_id, user_id=user.id)
        ).scalar_one_or_none()
        if recipe_list is None:
            return jsonify({"error": "Recipe list not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch recipe list from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_recipe_list(recipe_list))
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'name' in data:
                name = data['name']
                if not name or not name.strip():
                    return jsonify({"error": "List name cannot be empty"}), 400
                recipe_list.name = name.strip()
            
            db.session.commit()
            return jsonify(serialize_recipe_list(recipe_list))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe list: {e}")
            return jsonify({"error": "Failed to update recipe list"}), 500
    elif request.method == 'DELETE':
        try:
            db.session.delete(recipe_list)
            db.session.commit()
            return jsonify({"message": "Recipe list deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting recipe list: {e}")
            return jsonify({"error": "Failed to delete recipe list"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405


@app.route('/api/recipe-lists/<int:list_id>/items', methods=['GET', 'POST'])
@login_required
def recipe_list_items(list_id):
    """Endpoint for listing items in a recipe list (GET) or adding a recipe to the list (POST)."""
    from auth import get_current_user
    user = get_current_user()
    
    # Verify list ownership
    try:
        recipe_list = db.session.execute(
            db.select(RecipeList).filter_by(list_id=list_id, user_id=user.id)
        ).scalar_one_or_none()
        if recipe_list is None:
            return jsonify({"error": "Recipe list not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch recipe list from database."}), 500
    
    if request.method == 'GET':
        try:
            items = db.session.execute(
                db.select(RecipeListItem).filter_by(list_id=list_id)
            ).scalars().all()
            return jsonify([serialize_recipe_list_item(item) for item in items])
        except Exception as e:
            print(f"Database error in get_recipe_list_items: {e}")
            return jsonify({"error": "Failed to fetch recipe list items from database."}), 500
    elif request.method == 'POST':
        try:
            data = request.get_json()
            recipe_id = data.get('recipe_id')
            servings = data.get('servings', 1)
            variant_id = data.get('variant_id')
            notes = data.get('notes')
            
            if not recipe_id:
                return jsonify({"error": "Recipe ID is required"}), 400
            
            # Verify recipe exists
            recipe = db.session.execute(
                db.select(Recipe).filter_by(recipe_id=recipe_id)
            ).scalar_one_or_none()
            if recipe is None:
                return jsonify({"error": "Recipe not found."}), 404
            
            # Check if recipe is already in list
            existing_item = db.session.execute(
                db.select(RecipeListItem).filter_by(list_id=list_id, recipe_id=recipe_id)
            ).scalar_one_or_none()
            if existing_item:
                return jsonify({"error": "Recipe is already in this list"}), 400
            
            # Verify variant exists and is a variant of this recipe (if provided)
            if variant_id:
                variant = db.session.execute(
                    db.select(Recipe).filter_by(recipe_id=variant_id)
                ).scalar_one_or_none()
                if variant is None:
                    return jsonify({"error": "Variant not found."}), 404
                # Validate that variant is actually a variant of the specified recipe
                if variant.parent_recipe_id != recipe_id:
                    return jsonify({"error": "The specified variant is not a variant of this recipe."}), 400
            
            new_item = RecipeListItem(
                list_id=list_id,
                recipe_id=recipe_id,
                servings=servings if servings and servings > 0 else 1,
                variant_id=variant_id,
                notes=notes
            )
            
            db.session.add(new_item)
            db.session.commit()
            return jsonify(serialize_recipe_list_item(new_item)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error adding recipe to list: {e}")
            return jsonify({"error": "Failed to add recipe to list"}), 500


@app.route('/api/recipe-lists/<int:list_id>/items/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def recipe_list_item(list_id, item_id):
    """Endpoint for getting, updating, or removing a specific recipe from a list."""
    from auth import get_current_user
    user = get_current_user()
    
    # Verify list ownership
    try:
        recipe_list = db.session.execute(
            db.select(RecipeList).filter_by(list_id=list_id, user_id=user.id)
        ).scalar_one_or_none()
        if recipe_list is None:
            return jsonify({"error": "Recipe list not found."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch recipe list from database."}), 500
    
    # Get the item
    try:
        item = db.session.execute(
            db.select(RecipeListItem).filter_by(item_id=item_id, list_id=list_id)
        ).scalar_one_or_none()
        if item is None:
            return jsonify({"error": "Item not found in list."}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch item from database."}), 500
    
    if request.method == 'GET':
        return jsonify(serialize_recipe_list_item(item))
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'servings' in data:
                servings = data['servings']
                if servings and servings > 0:
                    item.servings = servings
            if 'variant_id' in data:
                variant_id = data['variant_id']
                if variant_id:
                    # Verify variant exists
                    variant = db.session.execute(
                        db.select(Recipe).filter_by(recipe_id=variant_id)
                    ).scalar_one_or_none()
                    if variant is None:
                        return jsonify({"error": "Variant not found."}), 404
                    # Validate that variant is actually a variant of the item's recipe
                    if variant.parent_recipe_id != item.recipe_id:
                        return jsonify({"error": "The specified variant is not a variant of this recipe."}), 400
                item.variant_id = variant_id
            if 'notes' in data:
                item.notes = data['notes']
            
            db.session.commit()
            return jsonify(serialize_recipe_list_item(item))
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe list item: {e}")
            return jsonify({"error": "Failed to update recipe list item"}), 500
    elif request.method == 'DELETE':
        try:
            db.session.delete(item)
            db.session.commit()
            return jsonify({"message": "Recipe removed from list successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error removing recipe from list: {e}")
            return jsonify({"error": "Failed to remove recipe from list"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405


@app.route('/api/recipes/<int:recipe_id>/lists', methods=['GET'])
@login_required
def recipe_list_membership(recipe_id):
    """Get all lists that contain a specific recipe for the current user."""
    from auth import get_current_user
    user = get_current_user()
    
    try:
        # Get all list items for this recipe that belong to the user's lists
        items = db.session.execute(
            db.select(RecipeListItem)
            .join(RecipeList)
            .filter(RecipeListItem.recipe_id == recipe_id)
            .filter(RecipeList.user_id == user.id)
        ).scalars().all()
        
        result = []
        for item in items:
            result.append({
                'list_id': item.recipe_list.list_id,
                'list_name': item.recipe_list.name,
                'item_id': item.item_id,
                'servings': item.servings,
                'variant_id': item.variant_id
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching recipe list membership: {e}")
        return jsonify({"error": "Failed to fetch recipe list membership"}), 500


# --- 5. Register Authentication Blueprint ---
# The auth module was imported and initialized earlier
app.register_blueprint(auth_bp)


# --- 6. Running the Application ---
if __name__ == '__main__':
    # Flask runs on port 8000 to match the previous React frontend configuration
    # To run this file, save it as backend_app.py and run it directly:
    # python backend_app.py
    app.run(debug=True, port=8000)

