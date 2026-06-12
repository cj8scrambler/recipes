import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import UserView from '../components/UserView'
import { api } from '../api'

// ---------------------------------------------------------------------------
// Mock the API module — vi.mock is hoisted so this runs before any imports
// ---------------------------------------------------------------------------

vi.mock('../api', () => ({
  api: {
    isTestDatabase: vi.fn().mockResolvedValue({ is_test: false }),
    getMe: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
    listRecipes: vi.fn().mockResolvedValue([
      { recipe_id: 1, name: 'Beef Stroganoff', base_servings: 2, tags: [], variants: [], parent_recipe_id: null }
    ]),
    listUnits: vi.fn().mockResolvedValue([]),
    listRecipeLists: vi.fn().mockResolvedValue([]),
    getRecipeListMembership: vi.fn().mockResolvedValue([]),
    listRecipeVersions: vi.fn().mockResolvedValue([]),
    getRecipe: vi.fn().mockResolvedValue({
      recipe_id: 1, name: 'Beef Stroganoff', base_servings: 2,
      ingredients: [], tags: [], variants: [], instructions: 'Cook it.',
      description: '', admin_notes: 'Prep notes here', parent_recipe_id: null
    }),
    getRecipeCost: vi.fn().mockResolvedValue({ total_cost: null, has_missing_prices: true }),
    getRecipeWeight: vi.fn().mockResolvedValue({ total_weight: null, ingredients_weight: [], has_missing_weights: false }),
  }
}))

// Mock heavy child components not under test in App-level tests
vi.mock('../components/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard">Admin Dashboard</div>
}))
vi.mock('../components/RecipeLists', () => ({
  default: () => <div data-testid="recipe-lists">My Lists</div>
}))
vi.mock('../components/Settings', () => ({
  default: () => <div data-testid="settings">Settings</div>
}))

const adminUser   = { id: '1', email: 'admin@test.com', role: 'admin' }
const regularUser = { id: '2', email: 'user@test.com',  role: 'user' }

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Navigation isolation
// ---------------------------------------------------------------------------

describe('Navigation — admin link visibility', () => {
  beforeEach(() => { api.getMe.mockReset() })

  it('shows Admin Dashboard link for admin users', async () => {
    api.getMe.mockResolvedValue(adminUser)
    renderApp()
    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('does not show Admin Dashboard link for regular users', async () => {
    api.getMe.mockResolvedValue(regularUser)
    renderApp()
    await screen.findByText('Browse Recipes')  // wait for auth to resolve
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Route protection
// ---------------------------------------------------------------------------

describe('Route protection — /admin', () => {
  beforeEach(() => { api.getMe.mockReset() })

  it('renders AdminDashboard for admin users at /admin', async () => {
    api.getMe.mockResolvedValue(adminUser)
    renderApp('/admin')
    expect(await screen.findByTestId('admin-dashboard')).toBeInTheDocument()
  })

  it('redirects regular users away from /admin', async () => {
    api.getMe.mockResolvedValue(regularUser)
    renderApp('/admin')
    await waitFor(() => {
      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// UserView — Admin Notes section
// ---------------------------------------------------------------------------

describe('UserView — Admin Notes visibility', () => {
  async function renderAndSelectRecipe(user) {
    render(<UserView user={user} />)
    const recipeBtn = await screen.findByText('Beef Stroganoff')
    await userEvent.click(recipeBtn)
    await screen.findByText('Instructions')
  }

  it('shows Admin Notes section for admin users', async () => {
    await renderAndSelectRecipe(adminUser)
    expect(screen.getByText('Admin Notes')).toBeInTheDocument()
  })

  it('hides Admin Notes section for regular users', async () => {
    await renderAndSelectRecipe(regularUser)
    expect(screen.queryByText('Admin Notes')).not.toBeInTheDocument()
  })

  it('shows existing admin notes content for admin', async () => {
    await renderAndSelectRecipe(adminUser)
    expect(screen.getByText('Prep notes here')).toBeInTheDocument()
  })

  it('shows placeholder text when admin notes are empty', async () => {
    api.getRecipe.mockResolvedValueOnce({
      recipe_id: 1, name: 'Beef Stroganoff', base_servings: 2,
      ingredients: [], tags: [], variants: [], instructions: 'Cook it.',
      description: '', admin_notes: null, parent_recipe_id: null
    })
    await renderAndSelectRecipe(adminUser)
    expect(screen.getByText('No notes yet.')).toBeInTheDocument()
  })
})
