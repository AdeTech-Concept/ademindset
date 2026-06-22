import { showAppAlert } from '../../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../../constants/app-theme';
import { useThemePreference } from '../../../contexts/theme-preference';
import { app, db } from '../../../firebaseConfig';

const auth = getAuth(app);

interface DiscussionMessage {
  id: string;
  text: string;
  userId?: string;
  userName?: string;
  createdAt?: any;
}

export default function BookDiscussionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [book, setBook] = useState<any>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadBookAndUser = async () => {
      if (!id) return;

      try {
        const bookSnapshot = await getDoc(doc(db, 'books', id));

        if (bookSnapshot.exists()) {
          setBook({ id: bookSnapshot.id, ...bookSnapshot.data() });
        }

        const user = auth.currentUser;

        if (user) {
          const userSnapshot = await getDoc(doc(db, 'users', user.uid));

          if (userSnapshot.exists()) {
            setUserData(userSnapshot.data());
          }
        }
      } catch (error) {
        console.log('Book discussion setup error:', error);
      }
    };

    loadBookAndUser();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const discussionQuery = query(
      collection(db, 'books', id, 'discussion'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      discussionQuery,
      snapshot => {
        setMessages(snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        })) as DiscussionMessage[]);
        setLoading(false);
      },
      error => {
        console.log('Book discussion load error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, [messages]);

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return '';

    try {
      const now = new Date();
      const messageTime = timestamp?.toDate
        ? timestamp.toDate()
        : new Date(timestamp);
      const diff = Math.floor((now.getTime() - messageTime.getTime()) / 1000);

      if (diff < 60) return 'now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;

      return `${Math.floor(diff / 86400)}d`;
    } catch {
      return '';
    }
  };

  const sendMessage = async () => {
    const user = auth.currentUser;

    if (!user) {
      showAppAlert('Log in to join the book discussion.');
      return;
    }

    if (!id || !text.trim() || sending) return;

    const nextText = text.trim();

    setSending(true);

    try {
      await addDoc(collection(db, 'books', id, 'discussion'), {
        text: nextText,
        userId: user.uid,
        userName: userData?.name || user.displayName || 'Reader',
        createdAt: serverTimestamp(),
      });

      setText('');
    } catch (error) {
      console.log('Book discussion send error:', error);
      showAppAlert('Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Book Room</Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {book?.title || 'Reader Discussion'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.roomIcon}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.loaderText, { color: theme.muted }]}>
            Loading discussion
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles" size={28} color="#fff" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Start the room
              </Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Share what stood out, what challenged you, or how this book connects to real life.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.userId === auth.currentUser?.uid;

            return (
              <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
                {!isMine && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.userName || 'R').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={[styles.messageStack, isMine && styles.myMessageStack]}>
                  <View style={styles.metaRow}>
                    <Text style={[styles.nameText, { color: theme.muted }]}>
                      {isMine ? 'You' : item.userName || 'Reader'}
                    </Text>
                    {!!timeAgo(item.createdAt) && (
                      <Text style={[styles.timeText, { color: theme.muted }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isMine ? '#6D5BFF' : theme.surface,
                        borderColor: isMine ? '#6D5BFF' : theme.border,
                        borderTopRightRadius: isMine ? 6 : 20,
                        borderTopLeftRadius: isMine ? 20 : 6,
                      },
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: isMine ? '#fff' : theme.text }]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composerWrap, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type your thought..."
            placeholderTextColor={theme.muted}
            multiline
            style={[styles.input, { color: theme.text }]}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.disabledBtn]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    minHeight: 92,
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCopy: {
    flex: 1,
  },

  eyebrow: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },

  roomIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderText: {
    marginTop: 10,
    fontWeight: '800',
  },

  messageList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 30,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 14,
  },

  myMessageRow: {
    justifyContent: 'flex-end',
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  avatarText: {
    color: '#fff',
    fontWeight: '900',
  },

  messageStack: {
    maxWidth: '82%',
  },

  myMessageStack: {
    alignItems: 'flex-end',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  nameText: {
    fontSize: 12,
    fontWeight: '900',
  },

  timeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  bubble: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },

  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },

  composer: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    fontSize: 15,
    paddingTop: 10,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledBtn: {
    opacity: 0.55,
  },
});
