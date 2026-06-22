import { Redirect } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getAppTheme } from '../constants/app-theme';
import { useThemePreference } from '../contexts/theme-preference';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

export default function IndexScreen() {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) {
        setTarget('/login');
        return;
      }

      setTarget(
        user.email?.trim().toLowerCase() === adminEmail
          ? '/admin'
          : '/(tabs)'
      );
    });

    return unsubscribe;
  }, []);

  if (target) {
    return <Redirect href={target as any} />;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
      }}
    >
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}
