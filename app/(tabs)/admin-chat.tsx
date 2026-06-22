import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
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
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const formatDate = (value: any) => {
  if (!value) return '';

  const date = new Date(value);

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function AdminChatScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        throw new Error('Please log in again.');
      }

      const snapshot = await getDocs(
        query(collection(db, 'supportMessages'), where('userId', '==', user.uid))
      );
      const firestoreMessages = snapshot.docs
        .map(messageDoc => {
          const data = messageDoc.data();

          return {
            id: messageDoc.id,
            ...data,
            createdAtIso:
              typeof data.createdAt?.toDate === 'function'
                ? data.createdAt.toDate().toISOString()
                : new Date().toISOString(),
          };
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAtIso).getTime() -
            new Date(b.createdAtIso).getTime()
        );

      setMessages(firestoreMessages);
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Chat error',
        error instanceof Error ? error.message : 'Could not load chat.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }

      loadMessages();
    }, [loadMessages, router])
  );

  const sendMessage = async () => {
    if (!message.trim()) {
      showAppAlert('Empty message', 'Write your complaint or question first.');
      return;
    }

    try {
      setSending(true);

      const user = auth.currentUser;

      if (!user) {
        throw new Error('Please log in again.');
      }

      const payload = {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'User',
        message: message.trim(),
        adminReply: '',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const messageRef = await addDoc(collection(db, 'supportMessages'), payload);

      setMessages(prev => [
        ...prev,
        {
          id: messageRef.id,
          ...payload,
          createdAtIso: new Date().toISOString(),
        },
      ]);
      setMessage('');
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Message not sent',
        error instanceof Error ? error.message : 'Could not send your message.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>Support</Text>
          <Text style={[styles.title, { color: theme.text }]}>Chat Admin</Text>
        </View>
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading chat</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="chatbox-ellipses-outline" size={34} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Send a complaint or question and admin can reply from the admin panel.
            </Text>
          </View>
        ) : (
          messages.map(item => (
            <View key={item.id} style={styles.threadBlock}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{item.message}</Text>
                <Text style={styles.userTime}>{formatDate(item.createdAtIso)}</Text>
              </View>

              {item.adminReply ? (
                <View style={[styles.adminBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.adminLabel, { color: theme.primary }]}>Admin</Text>
                  <Text style={[styles.adminBubbleText, { color: theme.text }]}>
                    {item.adminReply}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pendingText, { color: theme.muted }]}>
                  Waiting for admin reply
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[
            styles.composerInput,
            { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your complaint or question..."
          placeholderTextColor={theme.muted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.disabledButton]}
          onPress={sendMessage}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Ionicons name="send" size={20} color="#121212" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyebrow: {
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
  },

  messages: {
    flex: 1,
  },

  messageContent: {
    padding: 20,
    paddingTop: 6,
    paddingBottom: 24,
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
    lineHeight: 20,
  },

  threadBlock: {
    marginBottom: 18,
  },

  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: '#7CFFB2',
    borderRadius: 18,
    borderBottomRightRadius: 5,
    padding: 13,
  },

  userBubbleText: {
    color: '#121212',
    fontWeight: '800',
    lineHeight: 20,
  },

  userTime: {
    color: '#23452F',
    marginTop: 7,
    fontSize: 11,
    fontWeight: '900',
  },

  adminBubble: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    padding: 13,
    marginTop: 9,
  },

  adminLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 5,
  },

  adminBubbleText: {
    lineHeight: 20,
  },

  pendingText: {
    alignSelf: 'flex-end',
    marginTop: 7,
    fontSize: 12,
    fontWeight: '800',
  },

  composer: {
    borderTopWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7CFFB2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.7,
  },
});
