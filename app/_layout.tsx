import { Stack } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getAppTheme } from '../constants/app-theme';
import { AppAlertProvider } from '../contexts/app-alert';
import { ThemePreferenceProvider, useThemePreference } from '../contexts/theme-preference';
import { app, db } from '../firebaseConfig';

const auth = getAuth(app);

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getYesterdayKey = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return dateKey(yesterday);
};

const updateDailyLoginStreak = async (user: any) => {
  const today = dateKey();
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.exists() ? userSnap.data() : {};

  if (data.lastLoginDate === today) return;

  const currentStreak =
    data.lastLoginDate === getYesterdayKey()
      ? (data.streakCount || 0) + 1
      : 1;

  await setDoc(
    userRef,
    {
      streakCount: currentStreak,
      longestStreak: Math.max(currentStreak, data.longestStreak || 0),
      lastLoginDate: today,
      loginDays: (data.loginDays || 0) + 1,
      lastLoginAt: new Date(),
    },
    { merge: true }
  );
};

function RootStack() {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="admins" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="post/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        updateDailyLoginStreak(currentUser).catch(error => {
          console.log('Login streak error:', error);
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AppAlertProvider>
          <RootStack />
        </AppAlertProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
