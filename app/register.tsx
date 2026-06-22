import { showAppAlert } from '../contexts/app-alert';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateOfBirthInput from '../components/DateOfBirthInput';
import { getAppTheme } from '../constants/app-theme';
import {
  SECURITY_QUESTIONS,
  normalizeSecurityAnswer,
} from '../constants/security-questions';
import { useThemePreference } from '../contexts/theme-preference';
import { app, db } from '../firebaseConfig';

const auth = getAuth(app);

export default function RegisterScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityQuestions, setShowSecurityQuestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !dateOfBirth.trim() ||
      !password ||
      !securityQuestion ||
      !securityAnswer.trim()
    ) {
      showAppAlert(
        'Missing details',
        'Fill your name, email, date of birth, password, and security answer.'
      );
      return;
    }

    if (password.length < 6) {
      showAppAlert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name.trim(),
        email: normalizedEmail,
        dateOfBirth: dateOfBirth.trim(),
        securityQuestion,
        securityAnswerNormalized: normalizeSecurityAnswer(securityAnswer),
        bio: '',
        avatar: '',
        createdAt: new Date(),
        likedPosts: [],
        savedPosts: [],
        points: 0,
        quizzesCompleted: 0,
        aiConversationCount: 0,
      });

      showAppAlert('Account created', 'Welcome to Vidia.');
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(
        'Error',
        error instanceof Error ? error.message : 'Could not create account.'
      );
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/vidia.png')} style={styles.logo} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Start building your mindset with Vidia.
          </Text>

          <TextInput
            placeholder="Name"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
            ]}
            value={name}
            onChangeText={setName}
          />

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

          <DateOfBirthInput
            value={dateOfBirth}
            onChange={setDateOfBirth}
            placeholderTextColor={theme.muted}
            inputStyle={[
              styles.input,
              { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
            ]}
            textColor={theme.text}
            borderColor={theme.border}
            surfaceColor={theme.surface}
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

          <View style={styles.questionBlock}>
            <TouchableOpacity
              style={[
                styles.questionPicker,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              onPress={() => setShowSecurityQuestions(prev => !prev)}
            >
              <Text style={[styles.questionPickerText, { color: theme.text }]}>
                {securityQuestion}
              </Text>
              <Text style={[styles.chevron, { color: theme.muted }]}>
                {showSecurityQuestions ? 'Close' : 'Change'}
              </Text>
            </TouchableOpacity>

            {showSecurityQuestions && (
              <View
                style={[
                  styles.questionMenu,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                {SECURITY_QUESTIONS.map(question => (
                  <TouchableOpacity
                    key={question}
                    style={styles.questionOption}
                    onPress={() => {
                      setSecurityQuestion(question);
                      setShowSecurityQuestions(false);
                    }}
                  >
                    <Text style={[styles.questionOptionText, { color: theme.text }]}>
                      {question}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TextInput
            placeholder="Security answer"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
            ]}
            value={securityAnswer}
            onChangeText={setSecurityAnswer}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                Register
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={[styles.loginLink, { color: theme.muted }]}
            onPress={() => router.push('/login')}
          >
            Already have an account? Login
          </Text>
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

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },

  logo: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },

  input: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },

  questionBlock: {
    marginBottom: 12,
  },

  questionPicker: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  questionPickerText: {
    flex: 1,
    fontWeight: '800',
  },

  chevron: {
    fontWeight: '900',
    fontSize: 12,
  },

  questionMenu: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },

  questionOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },

  questionOptionText: {
    fontWeight: '700',
  },

  button: {
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  buttonText: {
    fontWeight: '900',
  },

  loginLink: {
    marginTop: 18,
    textAlign: 'center',
    fontWeight: '800',
  },
});
