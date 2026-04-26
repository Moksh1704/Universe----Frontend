import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../constants/theme';

// ── Auth Screens ──────────────────────────────────────────────────────────────
import GetStartedScreen       from '../screens/GetStartedScreen';
import RoleSelectionScreen    from '../screens/RoleSelectionScreen';
import LoginScreen            from '../src/screens/LoginScreen';
import OtpLoginScreen         from '../src/screens/OtpLoginScreen';
import OtpVerificationScreen  from '../src/screens/OtpVerificationScreen';
import ForgotPasswordScreen   from '../src/screens/ForgotPasswordScreen';
import ChangePasswordScreen   from '../src/screens/ChangePasswordScreen';

// ── Student Screens ───────────────────────────────────────────────────────────
import StudentHomeScreen       from '../src/screens/student/HomeScreen';
import StudentProfileScreen    from '../src/screens/student/ProfileScreen';
import StudentAttendanceScreen from '../src/screens/student/AttendanceScreen';
import FeedScreen              from '../screens/FeedScreen';
import EventsScreen            from '../screens/EventsScreen';
import NavigationScreen        from '../screens/NavigationScreen';
import NavigationDetailScreen  from '../screens/NavigationDetailScreen';

// ── Faculty Screens ───────────────────────────────────────────────────────────
import FacultyTimetableScreen  from '../src/screens/faculty/TimetableScreen';
import EditTimetableScreen     from '../src/screens/faculty/EditTimetableScreen';
import FacultyAttendanceScreen from '../src/screens/faculty/AttendanceScreen';
import FacultyProfileScreen    from '../src/screens/faculty/ProfileScreen';

// ── Shared ────────────────────────────────────────────────────────────────────
import NotificationsScreen from '../src/screens/NotificationsScreen';

// ── Tab Bars ──────────────────────────────────────────────────────────────────
import StudentBottomTabBar from '../components/StudentBottomTabBar';
import FacultyBottomTabBar from '../components/FacultyBottomTabBar';

const Stack      = createStackNavigator();
const StudentTab = createBottomTabNavigator();
const FacultyTab = createBottomTabNavigator();

// ── Student Tabs ──────────────────────────────────────────────────────────────
function StudentTabNavigator() {
  // [FIX] Removed initialParams for Attendance.
  // Previously: initialParams={{ studentId: user?.registration_number, role: 'student' }}
  // Problem: initialParams bakes in the value at mount time. If the user object
  // hasn't fully hydrated from AsyncStorage yet, studentId gets baked in as ''
  // or undefined — and never updates even after hydration completes.
  // Fix: AttendanceScreen now reads user.registration_number directly from
  // useAuth(), which is always reactive and up-to-date.
  return (
    <StudentTab.Navigator
      tabBar={props => <StudentBottomTabBar role="student" {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <StudentTab.Screen name="Home"       component={StudentHomeScreen} />
      <StudentTab.Screen name="Attendance" component={StudentAttendanceScreen} />
      <StudentTab.Screen name="Feed"       component={FeedScreen} />
      <StudentTab.Screen name="Events"     component={EventsScreen} />
      <StudentTab.Screen name="Navigation" component={NavigationScreen} />
    </StudentTab.Navigator>
  );
}

// ── Faculty Tabs ──────────────────────────────────────────────────────────────
function FacultyTabNavigator() {
  return (
    <FacultyTab.Navigator
      tabBar={props => <FacultyBottomTabBar role="faculty" {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Timetable"
    >
      <FacultyTab.Screen name="Timetable"  component={FacultyTimetableScreen} />
      <FacultyTab.Screen name="Attendance" component={FacultyAttendanceScreen} />
      <FacultyTab.Screen name="Profile"    component={FacultyProfileScreen} />
    </FacultyTab.Navigator>
  );
}

// ── Auth guard router ─────────────────────────────────────────────────────────
function RootNavigator() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      {!isAuthenticated ? (
        // ── Unauthenticated stack ─────────────────────────────────────────────
        <>
          <Stack.Screen name="GetStarted"      component={GetStartedScreen} />
          <Stack.Screen name="RoleSelection"   component={RoleSelectionScreen} />
          <Stack.Screen name="Login"           component={LoginScreen} />
          <Stack.Screen name="OtpLogin"        component={OtpLoginScreen} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
        </>
      ) : role === 'faculty' ? (
        // ── Faculty stack ─────────────────────────────────────────────────────
        <>
          <Stack.Screen name="FacultyMain"       component={FacultyTabNavigator} />
          <Stack.Screen name="EditTimetable"     component={EditTimetableScreen}     options={{ presentation: 'card' }} />
          <Stack.Screen name="FacultyAttendance" component={FacultyAttendanceScreen} options={{ presentation: 'card' }} />
          <Stack.Screen name="Notifications"     component={NotificationsScreen}     options={{ presentation: 'card' }} />
          <Stack.Screen name="ChangePassword"    component={ChangePasswordScreen}    options={{ presentation: 'card' }} />
        </>
      ) : (
        // ── Student stack ─────────────────────────────────────────────────────
        <>
          <Stack.Screen name="StudentMain"          component={StudentTabNavigator} />
          <Stack.Screen name="NavigationDetailScreen" component={NavigationDetailScreen} />
          <Stack.Screen name="Profile"              component={StudentProfileScreen} />
          <Stack.Screen name="ChangePassword"       component={ChangePasswordScreen} />
          <Stack.Screen name="Notifications"        component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}