import React from 'react'

export default function RecipeList({ recipes = [], onSelect }) {
  return (
    <div className="recipe-list">
      <h2>Recipes</h2>
      {recipes.length === 0 && <p>No recipes found.</p>}
      <ul>
        {recipes.map(r => (
          <li key={r.recipe_id}>
            <button className="link-button" onClick={() => onSelect(r)}>{r.name}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
