# ScanWise AI — React Native Mobile App

Pixel-perfect React Native port of the ScanWise AI surgical-compass web app.

## Design Source
All design decisions (colors, spacing, typography, radii, shadows, copy) are extracted directly from `surgical-compass/src/styles.css` and the component files. No design values were invented independently.

## Folder Structure

```
scanwise-mobile/
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx      # Home — stats, recent cases, case insight, distribution
│   │   ├── ScanScreen.tsx           # Upload + processing + AI summary
│   │   ├── ChatScreen.tsx           # AI chat with case context
│   │   ├── ClinicalRefScreen.tsx    # Guidelines + Research tabs
│   │   └── ProfileScreen.tsx        # Profile, account, danger zone
│   ├── components/
│   │   ├── PageShell.tsx            # Animated page wrapper (fade+slide)
│   │   └── SectionTitle.tsx         # Section heading with optional action
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Root layout — tab switching + transitions
│   │   ├── TopBar.tsx               # ScanWise AI wordmark + theme toggle
│   │   └── BottomTabBar.tsx         # 5-tab bottom nav with animated dot
│   ├── theme/
│   │   ├── colors.ts                # Light/dark color tokens (from styles.css)
│   │   ├── typography.ts            # Font size scale (from web px values)
│   │   ├── spacing.ts               # Spacing + border radius tokens
│   │   ├── ThemeContext.tsx          # Dark/light mode context + toggle
│   │   └── index.ts                 # Barrel export
│   ├── store/
│   │   ├── AppContext.tsx           # Global tab + active case state
│   │   └── types.ts                 # TabKey, CaseContext types
│   ├── hooks/
│   │   └── useActiveCase.ts         # Convenience hook
│   ├── services/
│   │   └── scanwiseApi.ts           # AI API stub (ready for real wiring)
│   └── App.tsx                      # Root component with providers
├── index.js                         # RN entry point
├── app.json                         # App name
├── package.json
├── tsconfig.json
├── metro.config.js
└── babel.config.js
```

## Screens

| Web | React Native | File |
|-----|-------------|------|
| Dashboard | DashboardScreen | `src/screens/DashboardScreen.tsx` |
| Scan | ScanScreen | `src/screens/ScanScreen.tsx` |
| Chat | ChatScreen | `src/screens/ChatScreen.tsx` |
| ClinicalRef | ClinicalRefScreen | `src/screens/ClinicalRefScreen.tsx` |
| Profile | ProfileScreen | `src/screens/ProfileScreen.tsx` |

## Getting Started

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android) or Xcode (for iOS)

### Install

```bash
cd scanwise-mobile
npm install

# iOS (macOS only)
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

### Link Vector Icons

#### Android
In `android/app/build.gradle` add:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

#### iOS
In `ios/Podfile`, the icons are linked automatically via CocoaPods.
After `pod install`, add font files to Info.plist as needed.

## Design System

| Token | Value |
|-------|-------|
| Primary (light) | `#1A5C8A` |
| Primary (dark) | `#2E9ACC` |
| Background (light) | `#F7F8FA` |
| Background (dark) | `#090D12` |
| Surface (light) | `#FFFFFF` |
| Surface (dark) | `#0F1620` |
| Border (light) | `#DDE2EA` |
| Border (dark) | `#1A2535` |
| Radius base | `12px` |
| Font | System (Inter equivalent) |

## Parity Checklist

- [x] Bottom 5-tab nav with animated dot indicator
- [x] TopBar with wordmark + theme toggle (animated sun/moon)
- [x] Dashboard: greeting, date badge, 2×2 stat cards with accent bar
- [x] Dashboard: recent cases list with ID, site/TNM badges, chevron
- [x] Dashboard: case insight banner
- [x] Dashboard: case distribution animated progress bars
- [x] Scan idle: dashed upload zone + file type pill toggle + patient ID input
- [x] Scan processing: pulsing ring + step list with done/active/pending
- [x] Scan done: full AI Clinical Summary card
- [x] Summary: primary site, key findings, TNM spring badges, differentials, surgical, protocol
- [x] Summary: "Ask AI" + "Save to record" action buttons
- [x] Chat: active case dismissable banner
- [x] Chat: message bubbles (user right/AI left) with ScanWise AI label
- [x] Chat: animated 3-dot typing indicator
- [x] Chat: suggestion chips (when case loaded, no messages)
- [x] Chat: empty state (no case)
- [x] Chat: sticky input bar with rounded send button
- [x] ClinicalRef: animated segmented pill tab switcher
- [x] ClinicalRef: guidelines — context banner, NCCN card, TNM reference table
- [x] ClinicalRef: research — sort chips, paper cards with tags + citations
- [x] ClinicalRef: empty state
- [x] Profile: avatar initials, name, specialty, institution
- [x] Profile: "Edit profile" pill button
- [x] Profile: stats horizontal scroll chips
- [x] Profile: account rows with icon + hint + chevron
- [x] Profile: danger zone with DELETE confirmation
- [x] Light/dark mode toggle (all tokens switch)
- [x] Page enter animations (fade + slide-up, 250ms)
