# Accessibility Testing Guide

## Overview

This document provides guidelines for testing accessibility features in the application. The app aims to meet WCAG 2.1 Level AA standards.

## Keyboard Navigation Testing

### Test Checklist

1. **Tab Navigation**
   - [ ] All interactive elements are reachable via Tab
   - [ ] Focus order is logical and follows visual order
   - [ ] Focus indicators are clearly visible
   - [ ] Tab order doesn't skip important elements

2. **Keyboard Shortcuts**
   - [ ] `/` focuses search input (when not in an input field)
   - [ ] `Ctrl+K` / `Cmd+K` opens command palette
   - [ ] `Esc` closes modals and dialogs
   - [ ] All shortcuts are documented

3. **Arrow Key Navigation**
   - [ ] Arrow keys work in lists (where applicable)
   - [ ] Roving tabindex is implemented for dynamic lists

4. **Enter/Space Activation**
   - [ ] All buttons can be activated with Enter or Space
   - [ ] Custom interactive elements respond to keyboard

## Screen Reader Testing

### Test with NVDA (Windows) or VoiceOver (macOS)

1. **Navigation**
   - [ ] All headings are announced
   - [ ] Landmarks are properly identified
   - [ ] Skip links work correctly

2. **Interactive Elements**
   - [ ] Buttons have descriptive labels
   - [ ] Links have meaningful text
   - [ ] Form fields have labels
   - [ ] Error messages are announced

3. **Dynamic Content**
   - [ ] Loading states are announced
   - [ ] Error states are announced
   - [ ] Success messages are announced
   - [ ] Live regions update correctly

4. **ARIA Attributes**
   - [ ] Roles are correctly applied
   - [ ] aria-labels provide context
   - [ ] aria-expanded reflects state
   - [ ] aria-current indicates active page

## Visual Accessibility Testing

### Color Contrast

- [ ] Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- [ ] Interactive elements have sufficient contrast
- [ ] Color is not the only means of conveying information

### Reduced Motion

- [ ] Animations respect `prefers-reduced-motion`
- [ ] Transitions are minimal or disabled
- [ ] No auto-playing animations

### High Contrast Mode

- [ ] Interface is usable in high contrast mode
- [ ] Borders are visible
- [ ] Text is readable

## Focus Management

### Test Scenarios

1. **Modal Dialogs**
   - [ ] Focus is trapped within modal
   - [ ] Focus returns to trigger element when closed
   - [ ] ESC closes modal

2. **Dynamic Content**
   - [ ] Focus moves to new content when appropriate
   - [ ] Focus doesn't get lost on route changes

3. **Form Validation**
   - [ ] Focus moves to first error field
   - [ ] Error messages are associated with fields

## Tools for Testing

### Automated Tools

1. **axe DevTools** - Browser extension for accessibility audits
2. **Lighthouse** - Built into Chrome DevTools
3. **WAVE** - Web Accessibility Evaluation Tool
4. **Pa11y** - Command-line accessibility checker

### Manual Testing

1. **Keyboard-only navigation** - Test entire app without mouse
2. **Screen reader testing** - NVDA, JAWS, VoiceOver
3. **Color blindness simulators** - Test color-dependent features
4. **Zoom testing** - Test at 200% zoom level

## Common Issues to Check

### Forms

- [ ] All inputs have labels
- [ ] Required fields are marked
- [ ] Error messages are associated with fields
- [ ] Form submission works with keyboard

### Links and Buttons

- [ ] Links navigate or perform actions
- [ ] Buttons submit forms or trigger actions
- [ ] Decorative elements are not interactive
- [ ] Icon-only buttons have aria-labels

### Images

- [ ] Images have alt text
- [ ] Decorative images have empty alt
- [ ] Complex images have long descriptions

### Tables

- [ ] Tables have headers
- [ ] Headers are associated with cells
- [ ] Complex tables have captions

## Testing Checklist for New Features

Before deploying a new feature:

- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Focus management is correct
- [ ] Color contrast is sufficient
- [ ] ARIA attributes are appropriate
- [ ] Reduced motion is respected
- [ ] High contrast mode works
- [ ] Focus indicators are visible

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
