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
    name = Column(String(50), unique=True, nullable=False)
    abbreviation = Column(String(10), unique=True, nullable=False)
    category = Column(Enum('Weight', 'Volume', 'Temperature', 'Item'), nullable=False)
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


# --- 4. API Endpoints ---

@app.route("/")
def read_root():
    """Simple health check endpoint."""
    return jsonify({"message": "Recipe API is running (Flask/SQLAlchemy). Connects to MySQL."})

@app.route("/api/recipes", methods=['GET'])
def get_recipes():
    """Endpoint for the public Recipe Browser. Queries MySQL for all recipes."""
    try:
        # Use .all() to get a list of ORM objects
        recipes = db.session.execute(db.select(Recipe)).scalars().all()
        return jsonify([serialize_recipe(r) for r in recipes])
    except Exception as e:
        print(f"Database error in get_recipes: {e}")
        return jsonify({"error": "Failed to fetch recipes from database."}), 500

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
        
        # Filter out relationship fields that should not be directly set
        # These are relationship fields, not column fields
        fields_to_skip = ['ingredients', 'tags', 'parent_recipe', 'variants']
        
        for key, value in data.items():
            if key in fields_to_skip:
                # Skip relationship fields - they require special handling
                continue
            if hasattr(recipe, key):
                setattr(recipe, key, value)
            else:
                return jsonify({"error": f"Invalid field {key}"}), 500
        try:
            db.session.commit()
        except Exception as e:
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


# --- 5. Running the Application ---
if __name__ == '__main__':
    # Flask runs on port 8000 to match the previous React frontend configuration
    # To run this file, save it as backend_app.py and run it directly:
    # python backend_app.py
    app.run(debug=True, port=8000)

