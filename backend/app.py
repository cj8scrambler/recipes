# backend_app.py

import os # Import the os module to read environment variables
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, ForeignKey, Column, Integer, String, Float, Boolean
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

# Configure CORS to allow the React frontend to connect
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})
# allow everything for now
#CORS(app)


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
    ingredient_prices = relationship("Ingredient", back_populates="price_unit")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="unit")

class Ingredient(db.Model):
    __tablename__ = 'Ingredients'
    ingredient_id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    price = Column(Float(10, 2))
    price_unit_id = Column(Integer, ForeignKey('Units.unit_id'))
    contains_peanuts = Column(Boolean, default=False, nullable=False)
    gluten_status = Column(Enum('Contains', 'Gluten-Free', 'GF_Available'), default='Gluten-Free', nullable=False)

    # Relationships
    price_unit = relationship("Unit", back_populates="ingredient_prices")
    recipe_items = relationship("RecipeIngredient", back_populates="ingredient")

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
    ingredients = relationship("RecipeIngredient", back_populates="recipe")
    tags = relationship("RecipeTag", back_populates="recipe")

class RecipeIngredient(db.Model):
    __tablename__ = 'Recipe_Ingredients'
    # Composite primary key
    recipe_id = Column(Integer, ForeignKey('Recipes.recipe_id', ondelete='CASCADE'), primary_key=True)
    ingredient_id = Column(Integer, ForeignKey('Ingredients.ingredient_id'), primary_key=True)

    quantity = Column(Float(10, 2), nullable=False)
    unit_id = Column(Integer, ForeignKey('Units.unit_id'), nullable=False)
    notes = Column(String(255))

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_items")
    unit = relationship("Unit", back_populates="recipe_ingredients")

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


# --- 3. Serialization Helpers (Converting SQLAlchemy objects to JSON) ---

def serialize_recipe_ingredient(ri):
    """Converts a RecipeIngredient ORM object to a dictionary for JSON response."""
    return {
        'ingredient_id': ri.ingredient_id,
        'name': ri.ingredient.name if ri.ingredient is not None else None,
        'quantity': ri.quantity,
        'unit_id': ri.unit_id,
        'unit_abv': ri.unit.abbreviation if ri.unit is not None else None,
        'notes': ri.notes
    }

def serialize_recipe(recipe):
    """Converts a Recipe ORM object to a dictionary, including nested ingredients."""
    return {
        'recipe_id': recipe.recipe_id,
        'name': recipe.name,
        'base_servings': recipe.base_servings,
        'description': recipe.description,
        # Recursively serialize the list of RecipeIngredient objects
        'ingredients': [serialize_recipe_ingredient(ri) for ri in recipe.ingredients],
        'instructions': recipe.instructions
    }

def serialize_ingredient(ingredient):
    """Converts an Ingredient ORM object to a dictionary."""
    return {
        'ingredient_id': ingredient.ingredient_id,
        'name': ingredient.name,
        'price': ingredient.price,
        'price_unit_id': ingredient.price_unit_id,
        'gluten_status': ingredient.gluten_status
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


# --- 4. API Endpoints ---

@app.route("/")
def read_root():
    """Simple health check endpoint."""
    return jsonify({"message": "Recipe API is running (Flask/SQLAlchemy). Connects to MySQL."})

@app.route("/api/recipes", methods=['GET', 'POST'])
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
                    notes=ing_data.get('notes')
                )
                db.session.add(new_recipe_ingredient)
            
            db.session.commit()
            return jsonify(serialize_recipe(new_recipe)), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating recipe: {e}")
            return jsonify({"error": "Failed to create recipe"}), 500

@app.route('/api/recipes/<int:recipe_id>', methods=['GET', 'PUT'])
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
                    else:
                        # Add new ingredient
                        new_recipe_ingredient = RecipeIngredient(
                            recipe_id=recipe.recipe_id,
                            ingredient_id=ingredient_id,
                            quantity=ing_data.get('quantity'),
                            unit_id=ing_data.get('unit_id'),
                            notes=ing_data.get('notes')
                        )
                        db.session.add(new_recipe_ingredient)
                
                # Remove ingredients that are no longer in the list
                for ingredient_id in current_ingredients:
                    if ingredient_id not in incoming_ingredient_ids:
                        db.session.delete(current_ingredients[ingredient_id])
                        
            except Exception as e:
                print(f"Error updating ingredients: {e}")  # Log for debugging
                return jsonify({"error": "Failed to update ingredients"}), 500
        
        try:
            db.session.commit()
            return jsonify(serialize_recipe(recipe))
        except Exception as e:
            db.session.rollback()
            print(f"Database commit error: {e}")  # Log for debugging
            return jsonify({"error": "Database commit failure"}), 500
    else:
        return jsonify({"error": "Method not allowed."}), 405

@app.route("/api/ingredients", methods=['GET'])
def get_ingredients():
    """Endpoint for the Ingredient List. Queries MySQL for all ingredients."""
    try:
        # Use .all() to get a list of ORM objects
        ingredients = db.session.execute(db.select(Ingredient)).scalars().all()
        return jsonify([serialize_ingredient(i) for i in ingredients])
    except Exception as e:
        print(f"Database error in get_ingredients: {e}")
        return jsonify({"error": "Failed to fetch ingredients from database."}), 500

@app.route("/api/units", methods=['GET'])
def get_units():
    """Endpoint to get all units."""
    try:
        units = db.session.execute(db.select(Unit)).scalars().all()
        return jsonify([serialize_unit(u) for u in units])
    except Exception as e:
        print(f"Database error in get_units: {e}")
        return jsonify({"error": "Failed to fetch units from database."}), 500


# --- 5. Running the Application ---
if __name__ == '__main__':
    # Flask runs on port 8000 to match the previous React frontend configuration
    # To run this file, save it as backend_app.py and run it directly:
    # python backend_app.py
    app.run(debug=True, port=8000)

