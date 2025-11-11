import React from 'react'

export default function RecipeList({ recipes = [], onSelect }) {
  return (
    <div className="recipe-list">
      <h2>All Recipes</h2>
      {recipes.length === 0 && (
        <div className="empty-state">
          <p className="text-muted">No recipes available.</p>
        </div>
      )}
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
