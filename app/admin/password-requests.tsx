import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://ademindset.onrender.com';

const readApiError = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
};

const formatDate = (value: any) => {
  if (!value) return 'No date';

  const date =
    typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(value.seconds ? value.seconds * 1000 : value);

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const generatePassword = () =>
  `Vidia${Math.random().toString(36).slice(2, 8)}${Math.floor(100 + Math.random() * 900)}!`;

export default function AdminPasswordRequestsScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      showAppAlert('Access denied', 'Only the admin can open this page.');
      router.replace('/(tabs)');
      return;
    }

    fetchRequests();
  }, [router]);

  const fetchRequests = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        query(collection(db, 'passwordResetRequests'), orderBy('createdAt', 'desc'))
      );
      setRequests(
        snapshot.docs.map(requestDoc => ({
          id: requestDoc.id,
          ...requestDoc.data(),
        }))
      );
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not load password reset requests.');
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error('Missing admin token');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const emailPassword = async (email: string, password: string) => {
    const subject = encodeURIComponent('Your Vidia password has been reset');
    const body = encodeURIComponent(
      `Hello,\n\nYour Vidia password has been reset by the admin.\n\nNew password: ${password}\n\nPlease log in and change it from your profile.\n\nVIDIA Admin`
    );

    await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const resetPassword = async (item: any) => {
    if (!item.matchedUserId) {
      showAppAlert('No user found', 'This request does not match an existing user account.');
      return;
    }

    if (!item.securityMatched) {
      showAppAlert(
        'Details did not match',
        'This request cannot be reset from recovery because the security details did not match.'
      );
      return;
    }

    const password = generatePassword();

    try {
      setBusyId(item.id);

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${item.matchedUserId}/password`,
        {
          method: 'PATCH',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ password }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, 'Could not reset this user password.')
        );
      }

      await updateDoc(doc(db, 'passwordResetRequests', item.id), {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      setRequests(prev =>
        prev.map(request =>
          request.id === item.id
            ? { ...request, status: 'completed', completedAt: new Date() }
            : request
        )
      );

      showAppAlert(
        'Password reset',
        `New password: ${password}`,
        [
          { text: 'Close' },
          {
            text: 'Email User',
            onPress: () => emailPassword(item.email, password),
          },
        ]
      );
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Error',
        error instanceof Error ? error.message : 'Could not reset this password.'
      );
    } finally {
      setBusyId('');
    }
  };

  const dismissRequest = async (item: any) => {
    showAppAlert('Dismiss request?', 'Mark this password reset request as reviewed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        onPress: async () => {
          try {
            setBusyId(item.id);
            await updateDoc(doc(db, 'passwordResetRequests', item.id), {
              status: 'dismissed',
              updatedAt: new Date(),
            });
            setRequests(prev =>
              prev.map(request =>
                request.id === item.id ? { ...request, status: 'dismissed' } : request
              )
            );
          } catch (error) {
            console.log(error);
            showAppAlert('Error', 'Could not dismiss this request.');
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  const pendingCount = requests.filter(request => request.status === 'pending').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="key-outline" size={26} color="#121212" />
        </View>
        <View>
          <Text style={styles.eyebrow}>Recovery Desk</Text>
          <Text style={[styles.title, { color: theme.text }]}>Password Requests</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{requests.length}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Pending</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading requests</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={34} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No reset requests</Text>
        </View>
      ) : (
        requests.map(item => (
          <View
            key={item.id}
            style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.requestTopRow}>
              <View style={styles.requestCopy}>
                <Text style={[styles.email, { color: theme.text }]} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'completed' && styles.completedBadge,
                  item.status === 'dismissed' && styles.dismissedBadge,
                ]}
              >
                <Text style={styles.statusText}>{item.status || 'pending'}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <Text style={[styles.detailText, { color: theme.subtle }]}>
                DOB: {item.dateOfBirth || 'Not provided'}
              </Text>
              <Text style={[styles.detailText, { color: theme.subtle }]}>
                Question: {item.securityQuestion || 'Not provided'}
              </Text>
              <Text
                style={[
                  styles.matchText,
                  item.securityMatched ? styles.goodMatch : styles.badMatch,
                ]}
              >
                {item.securityMatched
                  ? 'Security details matched'
                  : item.userFound
                    ? 'Security details did not match'
                    : 'No user found for this email'}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  (!item.matchedUserId || !item.securityMatched || busyId === item.id) &&
                    styles.disabledButton,
                ]}
                onPress={() => resetPassword(item)}
                disabled={!item.matchedUserId || !item.securityMatched || busyId === item.id}
              >
                <Text style={styles.resetButtonText}>
                  {busyId === item.id ? 'Working...' : 'Reset + Email'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dismissButton, busyId === item.id && styles.disabledButton]}
                onPress={() => dismissRequest(item)}
                disabled={busyId === item.id}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7CFFB2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },

  statNumber: {
    fontSize: 26,
    fontWeight: '900',
  },

  statLabel: {
    fontWeight: '800',
    marginTop: 3,
  },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },

  requestCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 14,
  },

  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  requestCopy: {
    flex: 1,
  },

  email: {
    fontSize: 17,
    fontWeight: '900',
  },

  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },

  statusBadge: {
    backgroundColor: '#2F80ED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  completedBadge: {
    backgroundColor: '#7CFFB2',
  },

  dismissedBadge: {
    backgroundColor: '#666',
  },

  statusText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  detailGrid: {
    marginTop: 13,
    gap: 7,
  },

  detailText: {
    lineHeight: 20,
  },

  matchText: {
    fontWeight: '900',
  },

  goodMatch: {
    color: '#7CFFB2',
  },

  badMatch: {
    color: '#FFB4C0',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  resetButton: {
    flex: 1,
    backgroundColor: '#7CFFB2',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  resetButtonText: {
    color: '#121212',
    fontWeight: '900',
  },

  dismissButton: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  dismissButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.6,
  },
});
