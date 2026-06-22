import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const asList = (value: unknown) =>
  Array.isArray(value)
    ? value.map(item => `${item}`.trim()).filter(Boolean)
    : [];

export default function BookSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const lessons = useMemo(() => asList(book?.lessons), [book?.lessons]);
  const quotes = useMemo(() => asList(book?.quotes), [book?.quotes]);

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;

      try {
        const bookSnapshot = await getDoc(doc(db, 'books', id));

        if (bookSnapshot.exists()) {
          const nextBook: any = { id: bookSnapshot.id, ...bookSnapshot.data() };

          setBook(nextBook);
          setMessages([
            {
              id: 'intro',
              role: 'assistant',
              content:
                'Vidia Book Assistant is coming soon. The book AI feature is visible here, but questions are disabled for now.',
            },
          ]);

          updateDoc(doc(db, 'books', id), {
            openCount: increment(1),
            lastOpenedAt: new Date(),
          }).catch(error => {
            console.log('Book open analytics error:', error);
          });

          const user = auth.currentUser;

          if (user) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const data = userSnap.exists() ? userSnap.data() : {};
            const openedBooks: string[] = data.openedBooks || [];
            const hasOpenedBook = openedBooks.includes(id);
            const nextOpenedBooks = hasOpenedBook
              ? openedBooks
              : [...openedBooks, id];

            await setDoc(
              userRef,
              {
                openedBooks: nextOpenedBooks,
                booksReadCount: nextOpenedBooks.length,
                points: (data.points || 0) + (hasOpenedBook ? 0 : 30),
                lastBookOpenedAt: new Date(),
              },
              { merge: true }
            );
          }
        }
      } catch (error) {
        console.log('Book summary load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [id]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Book not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.readerTitle, { color: theme.text }]} numberOfLines={1}>
            {book.title || 'Untitled book'}
          </Text>
          <Text style={[styles.readerMeta, { color: theme.muted }]} numberOfLines={1}>
            {book.author || 'Vidia Books'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cover}>
            {!!book.coverImage ? (
              <Image
                source={{ uri: book.coverImage }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="book" size={54} color="#fff" />
            )}
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.bookTitle, { color: theme.text }]}>
              {book.title || 'Untitled book'}
            </Text>
            {!!book.author && (
              <Text style={[styles.author, { color: theme.muted }]}>
                {book.author}
              </Text>
            )}
          </View>
        </View>

        <Section title="Summary">
          <Text style={[styles.bodyText, { color: theme.subtle }]}>
            {book.summary || book.description || 'No summary has been added yet.'}
          </Text>
        </Section>

        <Section title="Key Lessons">
          {lessons.length === 0 ? (
            <Text style={[styles.bodyText, { color: theme.subtle }]}>
              No key lessons have been added yet.
            </Text>
          ) : (
            lessons.map((lesson, index) => (
              <View key={`${lesson}-${index}`} style={styles.lessonRow}>
                <View style={styles.lessonIcon}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                </View>
                <Text style={[styles.lessonText, { color: theme.text }]}>
                  {lesson}
                </Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Quotes">
          {quotes.length === 0 ? (
            <Text style={[styles.bodyText, { color: theme.subtle }]}>
              No quotes have been added yet.
            </Text>
          ) : (
            quotes.map((quote, index) => (
              <View
                key={`${quote}-${index}`}
                style={[styles.quoteCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              >
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#8B5CF6" />
                <Text style={[styles.quoteText, { color: theme.text }]}>
                  {quote}
                </Text>
              </View>
            ))
          )}
        </Section>

        <TouchableOpacity
          activeOpacity={0.86}
          style={[styles.openDiscussionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push(`/book/${id}/discussion`)}
        >
          <View style={styles.openDiscussionIcon}>
            <Ionicons name="chatbubbles" size={22} color="#fff" />
          </View>
          <View style={styles.openDiscussionCopy}>
            <Text style={styles.discussEyebrow}>Book Room</Text>
            <Text style={[styles.openDiscussionTitle, { color: theme.text }]}>
              Open reader discussion
            </Text>
            <Text style={[styles.openDiscussionText, { color: theme.muted }]}>
              See what others think and share your own thoughts.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.muted} />
        </TouchableOpacity>

        <View style={[styles.discussCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.discussHeader}>
            <View>
              <View style={styles.comingSoonPill}>
                <Ionicons name="lock-closed" size={13} color="#121212" />
                <Text style={styles.comingSoonText}>Coming soon</Text>
              </View>
              <Text style={styles.discussEyebrow}>Ask Vidia</Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Book AI assistant
              </Text>
            </View>
            <Ionicons name="lock-closed" size={22} color="#8B5CF6" />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isUser = item.role === 'user';

              return (
                <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isUser ? '#6D5BFF' : theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: isUser ? '#fff' : theme.text }]}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={[styles.askBox, { backgroundColor: theme.surfaceAlt }]}>
            <TextInput
              value=""
              placeholderTextColor={theme.muted}
              placeholder="Book AI questions are coming soon"
              multiline
              editable={false}
              style={[styles.askInput, { color: theme.text }]}
            />
            <TouchableOpacity
              style={[styles.sendButton, styles.disabledBtn]}
              disabled
            >
              <Ionicons name="lock-closed" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  topBar: {
    minHeight: 76,
    paddingTop: 18,
    paddingHorizontal: 12,
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

  titleBlock: {
    flex: 1,
  },

  readerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  readerMeta: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  content: {
    padding: 20,
    paddingBottom: 140,
  },

  scroller: {
    flex: 1,
  },

  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },

  cover: {
    width: 100,
    height: 150,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },

  heroCopy: {
    flex: 1,
    justifyContent: 'center',
  },

  bookTitle: {
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
  },

  author: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },

  bodyText: {
    fontSize: 16,
    lineHeight: 24,
  },

  lessonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  lessonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  lessonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },

  quoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 9,
  },

  quoteText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },

  openDiscussionButton: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  openDiscussionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  openDiscussionCopy: {
    flex: 1,
  },

  openDiscussionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },

  openDiscussionText: {
    lineHeight: 19,
    marginTop: 3,
  },

  discussCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },

  discussHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  comingSoonPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD166',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },

  comingSoonText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  discussEyebrow: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '86%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  askingIndicator: {
    marginVertical: 8,
  },

  askBox: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },

  askInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    fontSize: 15,
    paddingTop: 10,
    opacity: 0.55,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  disabledBtn: {
    opacity: 0.6,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
});
