# UniVerse — Andhra University Campus App

A modern mobile application frontend for Andhra University built with **React Native + Expo**.

---

## 🎨 Design Theme

| Property | Value |
|---|---|
| Primary Color | Dark Navy `#0A1628` |
| Accent Color | Gold `#F5C518` |
| Style | Card-based, rounded, modern university UI |
| Navigation | Bottom tab bar (dark with gold active state) |

---

## 📱 Screens

| Screen | Description |
|---|---|
| **Get Started** | Campus background + logo + CTA buttons |
| **Registration Selection** | Choose Student or Faculty |
| **Student Registration** | Name, email, year, password form |
| **Faculty Registration** | Name, email, designation, password form |
| **Login** | Student/Faculty role toggle + login |
| **Home / Feed** | Campus social feed with post cards |
| **Events** | Event cards with category filtering |
| **Campus Navigation** | Location cards + Google Maps integration |
| **Attendance (Student)** | Attendance dashboard with insights |
| **Attendance (Faculty)** | Daily schedule + student attendance marking |
| **Career Hub** | Career cards with search and AI/Tech/Non-tech filters |
| **Profile** | User profile with details and settings menu |

---

## 🧩 Components

- `PostCard` — Social feed post with like/comment/repost
- `EventCard` — Event with register button
- `CareerCard` — Career role with skills/salary/tech stack
- `AttendanceCard` — Subject-wise attendance with progress bar
- `LocationCard` — Campus location with directions
- `SearchBar` — Reusable search input
- `BottomTabBar` — Custom dark tab bar with gold active state
- `ProfileCard` — User profile display

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS/Android)

### Install Dependencies
```bash
cd UniVerse
npm install
```

### Start Development Server
```bash
npx expo start
```

Then scan the QR code with **Expo Go** on your phone.

### Run on Specific Platform
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android
```

---

## 📁 Project Structure

```
UniVerse/
├── App.js                    # Entry point
├── app.json                  # Expo config
├── package.json
├── assets/
│   ├── icon.png              # UniVerse logo
│   └── intro-bg.jpg          # Campus background
├── constants/
│   └── theme.js              # Colors, fonts, spacing
├── data/
│   └── mockData.js           # All mock data
├── components/
│   ├── UIComponents.js       # All reusable cards/components
│   └── BottomTabBar.js       # Custom tab bar
├── screens/
│   ├── GetStartedScreen.js   # Onboarding
│   ├── AuthScreens.js        # Login, Register screens
│   ├── HomeScreen.js         # Campus feed
│   ├── EventsScreen.js       # Events
│   ├── NavigationScreen.js   # Campus map
│   ├── AttendanceScreen.js   # Attendance (student + faculty)
│   ├── CareerScreen.js       # Career hub
│   └── ProfileScreen.js      # User profile
└── navigation/
    └── AppNavigator.js       # Stack + Tab navigation
```

---

## 🔑 Key Features

- **Email Validation** — Only `@andhrauniversity.edu.in` emails accepted
- **Dual Mode Attendance** — Student view vs Faculty marking view
- **Post Management** — Users can only delete their own posts
- **Google Maps Integration** — Opens directions in Google Maps
- **Career Filtering** — Filter by AI, Tech, Non-tech roles
- **Role-based UI** — Different views for Student vs Faculty

---

## 📝 Mock Data

All data is mocked locally in `data/mockData.js`:
- 4 sample campus posts
- 4 campus events
- 6 subject attendance records
- 10 students for faculty attendance
- 6 career roles
- 8 campus locations
- Daily schedule for faculty

---

## 🔧 Customization

Replace mock data with real API calls by updating the data imports in each screen.

Admin Dashboard and Guest Website are separate existing systems — not included here.

---

*Built for Andhra University — UniVerse v1.0.0*
