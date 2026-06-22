import { showAppAlert } from '../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { SECURITY_QUESTIONS } from '../constants/security-questions';
import { useThemePreference } from '../contexts/theme-preference';

const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://ademindset.onrender.com';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showQuestions, setShowQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    if (!email.trim() || !dateOfBirth.trim() || !securityAnswer.trim()) {
      showAppAlert('Missing details', 'Fill your email, date of birth, and security answer.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/password-reset-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          dateOfBirth: dateOfBirth.trim(),
          securityQuestion,
          securityAnswer,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Could not submit reset request.');
      }

      setEmail('');
      setDateOfBirth('');
      setSecurityAnswer('');

      showAppAlert(
        'Request sent',
        data.securityMatched
          ? 'Your details were received. An admin can now review your password reset request.'
          : 'Your request was sent to admin for review.'
      );
      router.replace('/login');
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Request failed',
        error instanceof Error ? error.message : 'Could not submit reset request.'
      );
    } finally {
      setSubmitting(false);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Login</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={28} color="#121212" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Enter the same recovery details you used during registration.
            </Text>

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

            <TouchableOpacity
              style={[
                styles.questionPicker,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              onPress={() => setShowQuestions(prev => !prev)}
            >
              <Text style={[styles.questionText, { color: theme.text }]}>{securityQuestion}</Text>
              <Text style={[styles.questionAction, { color: theme.primary }]}>Change</Text>
            </TouchableOpacity>

            {showQuestions && (
              <View style={[styles.questionMenu, { borderColor: theme.border }]}>
                {SECURITY_QUESTIONS.map(question => (
                  <TouchableOpacity
                    key={question}
                    style={[styles.questionOption, { backgroundColor: theme.surfaceAlt }]}
                    onPress={() => {
                      setSecurityQuestion(question);
                      setShowQuestions(false);
                    }}
                  >
                    <Text style={[styles.questionText, { color: theme.text }]}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={submitRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.submitText}>Send to Admin</Text>
              )}
            </TouchableOpacity>
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

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },

  backText: {
    fontWeight: '900',
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7CFFB2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },

  input: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },

  questionPicker: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  questionText: {
    flex: 1,
    fontWeight: '800',
  },

  questionAction: {
    fontWeight: '900',
    fontSize: 12,
  },

  questionMenu: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },

  questionOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },

  submitButton: {
    backgroundColor: '#7CFFB2',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitText: {
    color: '#121212',
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.7,
  },
});
