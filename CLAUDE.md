# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 17 fantasy football application that displays ESPN Fantasy League data. The project has been refactored from a traditional module-based architecture to use Angular's modern standalone components with signal-based state management.

**Current Status**: The project is in a transitional state - the core architecture and stores are implemented, but some components reference missing interfaces and the data loading is incomplete.

## Development Commands

### Core Commands
```bash
# Start development server
ng serve
# or
npm start

# Build for production
ng build

# Run tests
ng test

# Run build with watch mode
ng build --watch --configuration development
```

### Project Structure Commands
```bash
# Generate new standalone component
ng generate component component-name --standalone

# Generate service
ng generate service service-name

# Generate interface
ng generate interface interface-name
```

## Architecture Overview

### Store Pattern
The application uses a custom signal-based store architecture built around a `BaseStore` class:

- **BaseStore**: Provides common functionality including loading states, error handling, caching, retry logic, and persistence
- **Domain Stores**: TeamsStore, MatchupsStore, StandingsStore, PlayersStore extend BaseStore
- **AppStore**: Manages global application state (selected week, theme, navigation, toasts)

### Key Store Features
- Signal-based reactive state management
- Automatic retry with exponential backoff
- Local storage persistence with configurable TTL
- Built-in loading/error/caching states
- Analytics tracking and state history
- Optimistic updates support

### Component Architecture
- **Standalone Components**: All components use Angular 17's standalone API
- **Feature-based Structure**: Components organized by feature (/features/dashboard, /teams, etc.)
- **Shared Components**: Reusable UI components in /shared/components
- **Signal Consumption**: Components consume store signals directly via computed properties

### Data Flow
1. Components inject stores via dependency injection
2. Stores extend BaseStore and implement `loadData()` method
3. Data is loaded on-demand with automatic caching and retry logic
4. Components react to store signals for UI updates
5. User actions trigger store methods that update state optimistically

## Current Issues to Address

### Missing Dependencies
- `src/app/models/espn-fantasy.interfaces.ts` - Core TypeScript interfaces
- Several shared components referenced in templates but not implemented
- `FantasyFootballService` referenced in stores but missing implementation

### Incomplete Implementation
- Stores reference `FantasyFootballService` that needs ESPN API integration
- `stub.service.ts` exists as temporary placeholder - should be removed
- Some components have template/TypeScript mismatches

### Architecture Notes
- The BaseStore pattern provides excellent foundation for scalable state management
- Signal-based reactivity eliminates need for OnPush change detection complexity
- Store configuration allows fine-tuning of caching and retry behavior per domain

## Configuration

### Angular Configuration
- **Version**: Angular 17
- **Styling**: SCSS with Bootstrap 5
- **Build Target**: ES2022
- **Strict Mode**: Enabled with comprehensive TypeScript strict checks

### Store Configuration Examples
```typescript
// Teams store config
cacheTtl: 10 * 60 * 1000, // 10 minutes
retryAttempts: 3,
persistToLocalStorage: true

// App store config  
cacheTtl: 60 * 60 * 1000, // 1 hour
persistToLocalStorage: true,
storageKey: 'fantasy-football-app-state'
```

### Routing
The app uses standalone routing configuration with feature-based routes:
- `/` → Dashboard (default)
- `/standings` → League standings
- `/matchups` → Weekly matchups
- `/teams` → Team list and details
- `/players` → Player statistics

## Development Workflow

### Adding New Features
1. Create standalone component in appropriate `/features` directory
2. If domain-specific, consider creating dedicated store extending BaseStore
3. Add route to `app-routing.module.ts`
4. Update shared interfaces in `/models` if needed

### Working with Stores
1. Inject store via `inject()` function
2. Access data via computed signals: `readonly teams = computed(() => this.teamsStore.teams())`
3. Call store methods for mutations: `this.teamsStore.selectTeam(id)`
4. Use BaseStore's built-in loading/error states in templates

### Completing the Migration
Priority order for completing the current refactoring:
1. Create missing interfaces in `/models/espn-fantasy.interfaces.ts`
2. Implement shared components referenced in templates
3. Replace `FantasyFootballService` with actual ESPN API integration
4. Remove `stub.service.ts` dependencies
5. Fix any remaining TypeScript compilation errors