import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

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

export default function AdminSupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'))
      );
      const allMessages: any[] = snapshot.docs.map(messageDoc => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));

      setMessages(
        params.userId
          ? allMessages.filter(message => message.userId === params.userId)
          : allMessages
      );
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not load support messages.');
    } finally {
      setLoading(false);
    }
  }, [params.userId]);

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

    fetchMessages();
  }, [fetchMessages, router]);

  const updateMessage = async (messageId: string, payload: any) => {
    try {
      setBusyId(messageId);
      await updateDoc(doc(db, 'supportMessages', messageId), {
        ...payload,
        updatedAt: new Date(),
      });
      setMessages(prev =>
        prev.map(message =>
          message.id === messageId ? { ...message, ...payload } : message
        )
      );
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update this message.');
    } finally {
      setBusyId('');
    }
  };

  const sendReply = async (messageId: string) => {
    const reply = replyDrafts[messageId]?.trim();

    if (!reply) {
      showAppAlert('Empty reply', 'Write a response first.');
      return;
    }

    await updateMessage(messageId, {
      adminReply: reply,
      status: 'replied',
      repliedAt: new Date(),
    });
    setReplyDrafts(prev => ({ ...prev, [messageId]: '' }));
  };

  const closeWithoutReply = (messageId: string) => {
    showAppAlert('Close message?', 'Mark this message as reviewed without a response?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        onPress: () =>
          updateMessage(messageId, {
            status: 'closed',
            adminReply: '',
            closedAt: new Date(),
          }),
      },
    ]);
  };

  const openCount = messages.filter(message => message.status === 'open').length;
  const pageTitle = params.userName
    ? `${params.userName}`
    : 'Support Messages';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="mail-unread-outline" size={26} color="#121212" />
        </View>
        <View>
          <Text style={styles.eyebrow}>Admin Inbox</Text>
          <Text style={[styles.title, { color: theme.text }]}>{pageTitle}</Text>
          {!!params.userId && (
            <TouchableOpacity
              style={styles.showAllBtn}
              onPress={() => router.replace('/admin/support')}
            >
              <Text style={styles.showAllText}>Show all messages</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{messages.length}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{openCount}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Open</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading inbox</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="chatbox-outline" size={34} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {params.userId
              ? 'This user has not sent admin any messages.'
              : 'User complaints and questions will appear here.'}
          </Text>
        </View>
      ) : (
        messages.map(message => (
          <View
            key={message.id}
            style={[styles.messageCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.messageTopRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {message.userName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.messageMeta}>
                <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                  {message.userName || 'User'}
                </Text>
                <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={1}>
                  {message.userEmail || 'No email'} - {formatDate(message.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  message.status === 'replied' && styles.repliedBadge,
                  message.status === 'closed' && styles.closedBadge,
                ]}
              >
                <Text style={styles.statusText}>{message.status || 'open'}</Text>
              </View>
            </View>

            <Text style={[styles.messageText, { color: theme.subtle }]}>
              {message.message}
            </Text>

            {!!message.adminReply && (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Admin reply</Text>
                <Text style={styles.replyText}>{message.adminReply}</Text>
              </View>
            )}

            {message.status !== 'replied' && (
              <>
                <TextInput
                  style={[
                    styles.replyInput,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
                  ]}
                  value={replyDrafts[message.id] || ''}
                  onChangeText={value =>
                    setReplyDrafts(prev => ({ ...prev, [message.id]: value }))
                  }
                  placeholder="Write a response..."
                  placeholderTextColor={theme.muted}
                  multiline
                />

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.replyButton, busyId === message.id && styles.disabledButton]}
                    onPress={() => sendReply(message.id)}
                    disabled={busyId === message.id}
                  >
                    <Text style={styles.replyButtonText}>
                      {busyId === message.id ? 'Saving...' : 'Respond'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeButton, busyId === message.id && styles.disabledButton]}
                    onPress={() => closeWithoutReply(message.id)}
                    disabled={busyId === message.id}
                  >
                    <Text style={styles.closeButtonText}>No Response</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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

  showAllBtn: {
    marginTop: 5,
  },

  showAllText: {
    color: '#7CFFB2',
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

  emptyText: {
    textAlign: 'center',
    marginTop: 6,
  },

  messageCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 14,
  },

  messageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7CFFB2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#121212',
    fontWeight: '900',
  },

  messageMeta: {
    flex: 1,
  },

  userName: {
    fontWeight: '900',
  },

  metaText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: '#2F80ED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  repliedBadge: {
    backgroundColor: '#7CFFB2',
  },

  closedBadge: {
    backgroundColor: '#666',
  },

  statusText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  replyBox: {
    backgroundColor: '#182820',
    borderRadius: 14,
    padding: 13,
    marginTop: 12,
  },

  replyLabel: {
    color: '#7CFFB2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  replyText: {
    color: '#D9FFE8',
    lineHeight: 20,
  },

  replyInput: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    textAlignVertical: 'top',
    marginTop: 14,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  replyButton: {
    flex: 1,
    backgroundColor: '#7CFFB2',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  replyButtonText: {
    color: '#121212',
    fontWeight: '900',
  },

  closeButton: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  closeButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.7,
  },
});
