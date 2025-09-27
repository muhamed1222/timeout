# Design Guidelines: Employee Shift Management System

## Design Approach
**Reference-Based Approach** - Drawing inspiration from productivity tools like Linear and Notion for the admin dashboard, with Telegram's design language influencing the WebApp components to maintain consistency with the bot experience.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary (Admin Dashboard)**
- Background: 0 0% 8% (deep charcoal)
- Surface: 0 0% 12% (elevated panels)
- Primary: 218 89% 61% (professional blue)
- Text: 0 0% 95% (near white)
- Success: 142 71% 45% (shift completed)
- Warning: 38 92% 50% (late arrivals)
- Error: 0 73% 41% (missed shifts)

**Light Mode Accents (WebApp)**
- Background: 220 14% 96% (Telegram-like light gray)
- Surface: 0 0% 100% (pure white cards)
- Borders: 220 13% 91% (subtle gray)

### B. Typography
- **Primary**: Inter (clean, professional for admin dashboard)
- **Secondary**: System fonts (-apple-system, BlinkMacSystemFont) for Telegram WebApp consistency
- **Hierarchy**: 
  - Headers: 24px/32px bold
  - Body: 16px/24px regular
  - Captions: 14px/20px medium

### C. Layout System
**Spacing**: Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
- Consistent 24px (6 units) padding for cards
- 16px (4 units) for component spacing
- 32px (8 units) for section separation

### D. Component Library

**Admin Dashboard Components:**
- **Navigation**: Dark sidebar with icon + label navigation
- **Data Tables**: Zebra striping with hover states, inline status badges
- **Exception Cards**: Color-coded severity indicators (red for critical, amber for warnings)
- **Status Indicators**: Dot notation with colors (green=active, gray=inactive, red=missed)
- **Filter Panels**: Collapsible sections with checkbox/dropdown controls

**Telegram WebApp Components:**
- **Form Cards**: Clean white backgrounds with subtle shadows
- **Input Fields**: Large touch targets (44px minimum height)
- **Action Buttons**: Full-width primary buttons with Telegram blue
- **Time Displays**: Prominent typography for shift times
- **Progress Indicators**: Linear progress bars for shift completion

**Shared Elements:**
- **Avatars**: Circular with fallback initials
- **Badges**: Rounded pills for status/role indicators
- **Modals**: Centered overlays with backdrop blur
- **Toast Notifications**: Slide-in from top with auto-dismiss

### E. Responsive Behavior
- **Desktop**: Side navigation with main content area
- **Mobile**: Bottom tab navigation with collapsible top header
- **Telegram WebApp**: Single-column layout optimized for mobile interaction

### F. Russian Localization Considerations
- Increased line height (1.6) for Cyrillic text readability
- Generous button padding to accommodate longer Russian labels
- Date/time formats following Russian conventions (DD.MM.YYYY, 24-hour time)

## Key Design Principles
1. **Status Clarity**: Immediate visual feedback for shift states using color and iconography
2. **Mobile-First**: Telegram WebApp optimized for touch interaction
3. **Data Density**: Admin dashboard balances information density with readability
4. **Contextual Actions**: Right-place, right-time controls (shift controls only during active shifts)
5. **Visual Hierarchy**: Clear distinction between critical exceptions and routine information

## Exception Dashboard Design
- **Traffic Light System**: Red (critical), amber (warning), green (good) status cards
- **Timeline View**: Chronological exception feed with employee avatars
- **Quick Actions**: Inline resolution buttons for common exceptions
- **Filtering**: Sticky filter bar with date range, employee, and exception type controls

This design emphasizes operational clarity while maintaining the professional aesthetic expected in workforce management tools, with careful attention to the Russian market context and Telegram platform integration.