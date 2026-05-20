import { Stack } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { app } from '../firebaseConfig';

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
    
  );
}
