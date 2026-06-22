import { showAppAlert } from '../contexts/app-alert';
import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppTheme } from '../constants/app-theme';
import { useThemePreference } from '../contexts/theme-preference';
import { app, db } from '../firebaseConfig';

export default function LoginScreen() {
    const { themePreference } = useThemePreference();
    const theme = getAppTheme(themePreference);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const auth = getAuth(app);

    const handleLogin = async () => {
      if (!email.trim() || !password) {
        setLoginError('Enter your email and password to continue.');
        return;
      }

      setLoginError('');
      setLoading(true);

      try {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email.trim().toLowerCase(),
            password
          );

        const user = userCredential.user;
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.data()?.banned) {
            showAppAlert('Your account has been suspended.');
            await signOut(auth);
            return;
          }
        } catch (profileError) {
          console.log('Login profile check skipped:', profileError);
        }

        console.log("Logged in:", user.email);

        if (
          user.email?.trim().toLowerCase() ===
          'josh0mathew@gmail.com'
        ) {

          router.replace('/admin');

        } else {

          router.replace('/(tabs)');

        }

      } catch (error) {
        console.log( "Login error:", error instanceof Error ? error.message : error );

        const message =
          (error as any)?.code === 'auth/invalid-credential' ||
          (error as any)?.code === 'auth/user-not-found' ||
          (error as any)?.code === 'auth/wrong-password'
            ? 'Wrong email or password. Please check your details and try again.'
            : 'Could not log in right now. Please try again.';

        setLoginError(message);
        showAppAlert('Login failed', message);
      } finally {
        setLoading(false);
      }
    };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/vidia.png')}
              style={styles.logo}
            />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>VIDIA</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            For those who refuse to stay average
          </Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
              ]}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.muted}
              style={[
                styles.input,
                { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
              ]}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {!!loginError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.primaryText }]}>Enter the Grind</Text>
              )}
            </TouchableOpacity>

            <Text
              style={[styles.forgotLink, { color: theme.primary }]}
              onPress={() => router.push('/forgot-password')}
            >
              Forgot password?
            </Text>

            <Text
              style={[styles.registerLink, { color: theme.muted }]}
              onPress={() => router.push('/register')}
            >
              New here? Create account
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
  },
  errorBox: {
    backgroundColor: '#301C22',
    borderColor: '#FF4D67',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 13,
  },
  errorText: {
    color: '#FFB4C0',
    fontWeight: '800',
    textAlign: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  form: {
    width: '100%',
  },

  adminButton: {
    marginTop: 15,
    alignItems: 'center',
  },

  adminText: {
    color: '#888',
    fontSize: 14,
  },

  registerLink: {
    color: '#888',
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '800',
  },

  forgotLink: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '900',
  },

});
