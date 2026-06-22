import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { app, db } from '../firebaseConfig';

type ThemePreference = 'light' | 'dark';

type ThemePreferenceContextValue = {
  activeTheme: ThemePreference;
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
};

const auth = getAuth(app);

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

const applySystemColorScheme = (theme: ThemePreference) => {
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(theme);
  }
};

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>('dark');
  const [userId, setUserId] = useState<string | null>(null);

  const activeTheme = themePreference || systemTheme || 'dark';

  useEffect(() => {
    applySystemColorScheme(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUserId(currentUser?.uid || null);

      if (!currentUser) {
        setThemePreferenceState('dark');
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const savedTheme = userSnap.data()?.themePreference;

        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemePreferenceState(savedTheme);
        }
      } catch (error) {
        console.log('Theme preference load error:', error);
      }
    });

    return unsubscribe;
  }, []);

  const setThemePreference = useCallback(
    async (theme: ThemePreference) => {
      setThemePreferenceState(theme);
      applySystemColorScheme(theme);

      if (!userId) return;

      await setDoc(
        doc(db, 'users', userId),
        {
          themePreference: theme,
        },
        { merge: true }
      );
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      activeTheme,
      themePreference,
      setThemePreference,
    }),
    [activeTheme, themePreference, setThemePreference]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error(
      'useThemePreference must be used inside ThemePreferenceProvider'
    );
  }

  return context;
}
