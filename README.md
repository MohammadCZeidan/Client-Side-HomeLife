# HomeLife - Pantry Management Application

A modern React + TypeScript application for managing household pantry items, recipes, shopping lists, meal plans, and budget tracking.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling and HMR
- **React Router** for navigation
- **React Query** for data fetching and caching
- **CSS Modules** for styling

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Modal.tsx       # Base modal component
│   ├── ConfirmModal.tsx # Confirmation dialog (uses Modal)
│   ├── DashboardNav.tsx # Navigation component
│   └── ProtectedRoute.tsx # Route protection
├── context/            # React Context providers
│   ├── AuthContext.tsx # Authentication state
│   └── AppContext.tsx  # Application state
├── hooks/              # Custom React hooks
│   ├── usePantry.ts
│   ├── useRecipes.ts
│   ├── useShoppingLists.ts
│   ├── useExpenses.ts
│   └── useMealPlans.ts
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── PantryPage.tsx
│   ├── RecipesPage.tsx
│   ├── ShoppingListPage.tsx
│   ├── WeeklyPlanPage.tsx
│   ├── BudgetPage.tsx
│   └── ProfilePage.tsx
├── services/           # API service layer
│   ├── apiCall.ts      # Base API utilities
│   ├── auth.service.ts
│   ├── pantry.service.ts
│   ├── recipes.service.ts
│   └── ...
├── utils/              # Utility functions
│   ├── dateUtils.ts    # Date formatting and calculations
│   └── ingredientCheck.ts # Recipe ingredient availability checking
└── types/              # TypeScript type definitions
```

## Key Utility Files

### `dateUtils.ts`
Essential date manipulation utilities used throughout the application:
- `getWeekStartDate()` - Calculates the start of the week (Monday)
- `getDaysUntilExpiry()` - Calculates days until expiration
- `formatDate()` - Formats dates for display
- Used in: HomePage, PantryPage, ShoppingListPage, WeeklyPlanPage

### `ingredientCheck.ts`
Recipe ingredient availability checking:
- `checkIngredientAvailability()` - Checks if pantry has enough ingredients for a recipe
- `convertToShoppingListItems()` - Converts missing ingredients to shopping list items
- Used in: ShoppingListPage

## Components

### Modal Components
- **Modal** - Base modal component with overlay, header, and body
- **ConfirmModal** - Specialized confirmation dialog that wraps Modal component
  - Used for delete confirmations and other critical actions
  - Provides cancel/confirm button styling

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Setup

See `API_CONFIGURATION_GUIDE.md` for backend API configuration and environment variables.

## Features

- 🏠 **Pantry Management** - Track ingredients with expiry dates and locations
- 📝 **Recipe Management** - Create and manage recipes with nutritional information
- 🛒 **Shopping Lists** - Generate shopping lists from recipes
- 📅 **Meal Planning** - Weekly meal planning and scheduling
- 💰 **Budget Tracking** - Track expenses by category and store
- 🔐 **Authentication** - User authentication and household management

## API Integration

The application integrates with a Laravel backend API. See the following guides:
- `API_CONFIGURATION_GUIDE.md` - API setup and configuration
- `API_INTEGRATION_GUIDE.md` - Integration details
- `BACKEND_INTEGRATION.md` - Backend connection setup

## Code Quality

- ESLint for code linting
- TypeScript for type safety
- React Query for efficient data fetching

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```
