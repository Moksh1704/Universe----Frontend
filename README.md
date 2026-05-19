# UniVerse — Frontend (Mobile Application)

## Overview

UniVerse is a React Native mobile application built for Andhra University College of Engineering (AUCE). It serves as a unified campus platform for both students and faculty, providing role-based access to academic tools including attendance tracking, timetable management, campus navigation, event listings, and a social feed. The application communicates with a separate backend REST API over HTTPS and is built using the Expo managed/bare workflow with an Android-targeted native build.

---

## Features

### Authentication
- Email and password login
- OTP-based login (email OTP request and verification)
- Google Sign-In integration
- Forgot password and change password flows
- Persistent session via JWT (access token + refresh token stored in AsyncStorage)
- Role-based routing — students and faculty are directed to separate navigation stacks on login

### Student Features
- Home screen displaying announcements categorized by type (exam, result, holiday)
- Subject-wise and overall attendance overview with percentage tracking
- Daily grouped attendance view
- Social feed with real-time posts and interactions
- Campus events listing with category filters and registration support (Google Form or API-based)
- Campus navigation with an interactive map (outdoor locations and indoor lab/cabin directions)
- Profile screen with avatar upload, personal details, and account settings

### Faculty Features
- Timetable view for the logged-in faculty member
- Timetable slot creation, editing, and deletion
- Attendance marking for students by section and timetable slot
- Attendance update/correction for already-submitted sessions
- Profile screen with settings, privacy, help, and about modals
- Calendar modal for date-based timetable planning

### Shared Features
- Push notification listing with unread count badge
- Mark all notifications as read (API + local persistence)
- Change password screen
- Intro/splash screen with video playback on first launch
- Role selection screen on first open

---

## Tech Stack

- **React Native** 0.81.5
- **Expo** SDK 54 (bare workflow with `expo-dev-client`)
- **React** 19.1.0
- **React Navigation** — Stack Navigator (`@react-navigation/stack`) and Bottom Tab Navigator (`@react-navigation/bottom-tabs`)
- **Axios** 1.15.0 — HTTP client (supplemented by native `fetch` in auth/service layers)
- **AsyncStorage** (`@react-native-async-storage/async-storage`) — local session and preference persistence
- **Google Sign-In** (`@react-native-google-signin/google-signin`) — OAuth authentication
- **Expo Auth Session** and **Expo Web Browser** — OAuth redirect handling
- **Expo Image Picker** — profile avatar upload
- **Expo Linear Gradient** (`expo-linear-gradient`) — UI backgrounds and cards
- **Expo Location** — used in campus navigation features
- **React Native Maps** 1.20.1 — interactive campus map
- **React Native Calendars** — faculty timetable calendar view
- **Expo Video** and **Expo Audio** — intro video playback
- **Expo Blur** — modal and overlay blur effects
- **React Native SVG** — vector icon and graphic rendering
- **React Native Gesture Handler** — gesture-based navigation transitions
- **Expo Vector Icons** (Ionicons) — icon set throughout the UI
- **EAS Build** — cloud-based Android APK and AAB generation

---

## Project Structure

```
Universe----Frontend-main/
├── App.js                        # Entry point; mounts AuthProvider and AppNavigator
├── app.json                      # Expo configuration (bundle ID, permissions, plugins)
├── eas.json                      # EAS Build profiles (development, preview, production)
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler configuration
├── package.json
│
├── api/                          # Base API utilities
│   ├── api.js                    # apiRequest() wrapper with JWT injection
│   ├── authService.js            # Raw login fetch helper
│   ├── config.js                 # Base URL (dev vs production toggle)
│   └── storage.js                # AsyncStorage helpers for auth session
│
├── assets/                       # Static assets
│   ├── icon.png
│   ├── logo.png
│   └── videos/
│       └── intro.mp4             # Intro splash video
│
├── components/                   # Shared UI components
│   ├── StudentBottomTabBar.js
│   ├── FacultyBottomTabBar.js
│   └── UIComponents.js           # Reusable primitives (SearchBar, InfoRow, LoadingScreen, etc.)
│
├── constants/
│   └── theme.js                  # COLORS, FONTS, SPACING, RADIUS, SHADOWS
│
├── data/
│   └── mockData.js               # Static reference/mock data
│
├── navigation/
│   └── AppNavigator.js           # Root navigator; auth guard; student/faculty stack split
│
├── screens/                      # Shared/student-facing screens
│   ├── IntroScreen.js
│   ├── GetStartedScreen.js
│   ├── RoleSelectionScreen.js
│   ├── FeedScreen.js
│   ├── EventsScreen.js
│   ├── NavigationScreen.js
│   ├── NavigationDetailScreen.js
│   └── NotificationsScreen.js
│
├── src/
│   ├── api/
│   │   └── userApi.js
│   │
│   ├── components/
│   │   ├── common/
│   │   │   └── ProfileModals.js  # Settings, Privacy, Help, About modals
│   │   └── faculty/
│   │       └── CalendarModal.js
│   │
│   ├── context/
│   │   └── AuthContext.js        # Global auth state (useReducer + AsyncStorage)
│   │
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── OtpLoginScreen.js
│   │   ├── OtpVerificationScreen.js
│   │   ├── ForgotPasswordScreen.js
│   │   ├── ChangePasswordScreen.js
│   │   ├── NotificationsScreen.js
│   │   ├── student/
│   │   │   ├── HomeScreen.js
│   │   │   ├── AttendanceScreen.js
│   │   │   └── ProfileScreen.js
│   │   └── faculty/
│   │       ├── TimetableScreen.js
│   │       ├── EditTimetableScreen.js
│   │       ├── AttendanceScreen.js
│   │       └── ProfileScreen.js
│   │
│   └── services/
│       ├── authService.js        # OTP, password login, Google login, change password
│       ├── attendanceService.js  # Student + faculty attendance API calls
│       ├── timetableService.js   # Faculty timetable CRUD
│       ├── notificationService.js
│       └── profileService.js
│
└── android/                      # Native Android project (Expo bare workflow)
```

---

## Application Flow

1. On first launch, the user is shown an **intro screen** with video playback, followed by a **Get Started** screen.
2. The user selects their role (**Student** or **Faculty**) on the **Role Selection** screen.
3. Authentication is handled via **password login**, **OTP login**, or **Google Sign-In**. The backend auto-detects the role from the provided credentials.
4. On successful login, the JWT access token and refresh token are persisted to AsyncStorage. The `AuthContext` restores this session on subsequent app launches.
5. Authenticated users are routed to role-specific navigation:
   - **Students** — Home, Attendance, Feed, Events, Navigation (bottom tabs)
   - **Faculty** — Timetable, Attendance, Profile (bottom tabs)
6. All data is fetched live from the backend API. Notifications, attendance records, timetable slots, events, and feed posts are all API-driven with no offline mock substitutes in production flows.

---

## Installation & Setup

### Prerequisites
- Node.js >= 18
- Expo CLI (`npm install -g expo-cli`)
- For Android builds: Android Studio with an emulator or a connected physical device

### Steps

```bash
# Clone the repository
git clone https://github.com/<your-org>/Universe----Frontend.git
cd Universe----Frontend

# Install dependencies
npm install

# Start the Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## Environment Variables

The application does not use a `.env` file. The backend base URL is configured directly in `api/config.js`:

```js
const BASE_URL = __DEV__
  ? "http://192.168.1.6:8000"                        // Local development (replace with your machine's LAN IP)
  : "https://universe-mainbackend.onrender.com";     // Production (Render deployment)
```

Update the `__DEV__` branch IP to your local machine's network IP when testing on a physical device.

---

## API Integration

All API calls flow through `api/api.js`, which provides a central `apiRequest()` function. This function:

- Reads the JWT access token from AsyncStorage before each request
- Attaches the token as a `Bearer` Authorization header when present
- Throws a normalized error using the backend's `detail` or `message` field on non-2xx responses

Service files in `src/services/` call `apiRequest()` for domain-specific operations:

| Service | Endpoints Used |
|---|---|
| `authService.js` | `/auth/login`, `/auth/send-otp`, `/auth/verify-otp`, `/auth/google-login`, `/auth/change-password` |
| `attendanceService.js` | `/attendance/me/overview`, `/attendance/me`, `/attendance/faculty/students`, `/attendance/mark` |
| `timetableService.js` | `/timetable/faculty/me`, `/timetable/faculty/{id}`, `/timetable/faculty/{slot_id}` (PUT/DELETE) |
| `notificationService.js` | `/notifications`, `/notifications/unread-count`, `/notifications/read-all` |
| `profileService.js` | Profile fetch and avatar upload endpoints |
| `FeedScreen.js` | Feed post listing and interaction endpoints |
| `EventsScreen.js` | `/events`, `/events/{id}/register` |

---

## APK / Mobile Build

The project is configured for **EAS Build** with three profiles defined in `eas.json`:

| Profile | Type | Distribution |
|---|---|---|
| `development` | Dev client build | Internal |
| `preview` | Standard build | Internal (APK) |
| `production` | Optimized build | Store (auto-increment version) |

To build a preview APK:

```bash
eas build --profile preview --platform android
```

The Android package identifier is `com.andhrauniversity.universe`. The native Android project is present under `/android/` and uses Kotlin (`MainActivity.kt`, `MainApplication.kt`).

---

## Deployment

- **Backend API (production):** `https://universe-mainbackend.onrender.com`
- Frontend APK builds are distributed internally via EAS. No public store listing is referenced in the current configuration.

---

## Screenshots

| Intro | Login | Student Home |
|---|---|---|
| ![Intro](./screenshots/intro.png) | ![Login](./screenshots/login.png) | ![Home](./screenshots/student_home.png) |

| Attendance | Faculty Timetable | Campus Navigation |
|---|---|---|
| ![Attendance](./screenshots/attendance.png) | ![Timetable](./screenshots/timetable.png) | ![Navigation](./screenshots/navigation.png) |

> Add screenshots to a `/screenshots` directory and update the paths above.

---

## Related Repository

This repository contains the frontend mobile application for UniVerse.

Backend APIs, database models, and server implementation are maintained in a separate repository. The production backend is deployed at `https://universe-mainbackend.onrender.com`.

---

## Future Enhancements

- iOS build configuration and App Store submission
- Offline support with cached attendance and timetable data
- Push notification delivery via Expo Notifications or FCM
- Token refresh logic for expired JWT access tokens
- Student timetable view
- Document upload and assignment submission features

---

## Contributors

- Sai Moksha Naimisha Namburu
- Sadasivuni Gyaneswari
- Salapu Karthik
- Senapathi Sai Venkat Rahul

Department of Computer Science and Systems Engineering Andhra University College of Engineering (A)

---

## License

This project is private. All rights reserved.
