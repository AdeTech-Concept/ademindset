import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PostCard from '../../components/PostCard';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const dailyQuotes = [
  'The future depends on what you do today.',
  'Small steps repeated daily become identity.',
  'Discipline is choosing your future over your mood.',
  'Confidence grows when you keep promises to yourself.',
  'Your next level is built in ordinary moments.',
];

type BookQuote = {
  id: string;
  quote: string;
  author: string;
  title: string;
};

const cleanQuoteText = (value: string) =>
  value.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '');

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const postDateKey = (post: any) => {
  if (post.publishDate) return post.publishDate;
  if (post.scheduledDate) return post.scheduledDate;

  const createdAt = post.createdAt?.toDate
    ? post.createdAt.toDate()
    : post.createdAt?.seconds
      ? new Date(post.createdAt.seconds * 1000)
      : post.createdAt
        ? new Date(post.createdAt)
        : null;

  return createdAt && !Number.isNaN(createdAt.getTime())
    ? dateKey(createdAt)
    : '';
};

export default function HomeScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  const [dailyPost, setDailyPost] = useState<any>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [bookQuotes, setBookQuotes] = useState<BookQuote[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quoteFade = useRef(new Animated.Value(1)).current;
  const quoteLift = useRef(new Animated.Value(0)).current;
  const dailyQuote = dailyQuotes[new Date().getDay() % dailyQuotes.length];
  const activeBookQuote = bookQuotes[quoteIndex % Math.max(bookQuotes.length, 1)];

  useFocusEffect(
    useCallback(() => {
      const fetchHomeContent = async () => {
        try {
          const booksSnapshot = await getDocs(collection(db, 'books'));
          const nextBookQuotes = booksSnapshot.docs.flatMap(bookDoc => {
            const book = bookDoc.data();
            const quotes = Array.isArray(book.quotes) ? book.quotes : [];

            return quotes
              .map((quote: any, index: number) => {
                const quoteText =
                  typeof quote === 'string'
                    ? quote
                    : quote?.text || quote?.quote || '';

                return {
                  id: `${bookDoc.id}-${index}`,
                  quote: cleanQuoteText(quoteText),
                  author: quote?.author || book.author || 'Unknown author',
                  title: book.title || 'Book wisdom',
                };
              })
              .filter(item => item.quote);
          });

          setBookQuotes(nextBookQuotes);
          setQuoteIndex(0);

          const user = auth.currentUser;

          if (!user) return;

          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          let savedPosts: string[] = [];
          let likedPosts: string[] = [];

          if (userSnap.exists()) {
            const data = userSnap.data();

            setUserData(data);
            savedPosts = data.savedPosts || [];
            likedPosts = data.likedPosts || [];
          }

          const postsQuery = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc')
          );

          const querySnapshot = await getDocs(postsQuery);
          const today = dateKey();

          const todaysPosts: any[] = querySnapshot.docs
            .map(postDoc => ({
              id: postDoc.id,
              ...postDoc.data(),
              liked: likedPosts.includes(postDoc.id),
              saved: savedPosts.includes(postDoc.id),
            }) as any)
            .filter(post => postDateKey(post) === today)
            .sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;

              return (
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
              );
            });

          setTodayCount(todaysPosts.length);
          setDailyPost(todaysPosts[0] || null);
        } catch (error) {
          console.log('Home content error:', error);
        }
      };

      fetchHomeContent();
    }, [])
  );

  useEffect(() => {
    if (bookQuotes.length <= 1) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(quoteFade, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(quoteLift, {
          toValue: -10,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setQuoteIndex(index => (index + 1) % bookQuotes.length);
        quoteLift.setValue(10);
        Animated.parallel([
          Animated.timing(quoteFade, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.spring(quoteLift, {
            toValue: 0,
            useNativeDriver: true,
            damping: 12,
            stiffness: 120,
          }),
        ]).start();
      });
    }, 4800);

    return () => clearInterval(interval);
  }, [bookQuotes.length, quoteFade, quoteLift]);

  const updatePostState = (postId: string, updates: any) => {
    setDailyPost((post: any) =>
      post?.id === postId ? { ...post, ...updates } : post
    );
  };

  const toggleLike = async (postId: string) => {
    const user = auth.currentUser;

    if (!user || !dailyPost) return;

    const nextLiked = !dailyPost.liked;
    updatePostState(postId, { liked: nextLiked });

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let likedPosts: string[] = [];

      if (userSnap.exists()) {
        likedPosts = userSnap.data().likedPosts || [];
      }

      if (nextLiked) {
        if (!likedPosts.includes(postId)) {
          likedPosts.push(postId);
        }
      } else {
        likedPosts = likedPosts.filter(id => id !== postId);
      }

      await setDoc(userRef, { likedPosts }, { merge: true });

      if (nextLiked && dailyPost.userId && dailyPost.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: dailyPost.userId,
          senderName: userData?.name || 'Someone',
          type: 'like',
          postId: dailyPost.id,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error) {
      console.log('Like error:', error);
      updatePostState(postId, { liked: dailyPost.liked });
    }
  };

  const toggleSave = async (postId: string) => {
    const user = auth.currentUser;

    if (!user || !dailyPost) return;

    const nextSaved = !dailyPost.saved;
    updatePostState(postId, { saved: nextSaved });

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let savedPosts: string[] = [];

      if (userSnap.exists()) {
        savedPosts = userSnap.data().savedPosts || [];
      }

      if (nextSaved) {
        if (!savedPosts.includes(postId)) {
          savedPosts.push(postId);
        }
      } else {
        savedPosts = savedPosts.filter(id => id !== postId);
      }

      await setDoc(userRef, { savedPosts }, { merge: true });
    } catch (error) {
      console.log('Save error:', error);
      updatePostState(postId, { saved: dailyPost.saved });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      console.log('Logout error:', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/images/vidia.png')}
            style={styles.logo}
          />

          <View>
            <Text style={[styles.header, { color: theme.text }]}>Vidia</Text>
            <Text style={[styles.subHeader, { color: theme.muted }]}>Daily mindset post</Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel="Logout"
          activeOpacity={0.82}
          style={[styles.logoutButton, { backgroundColor: theme.surfaceAlt }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.dailyMindsetCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.dailyMindsetTop}>
          <View>
            <Text style={styles.dailyEyebrow}>Daily Mindset</Text>
            <Text style={[styles.dailyTitle, { color: theme.text }]}>Quote of the Day</Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{dateKey()}</Text>
          </View>
        </View>

        <Text style={[styles.dailyQuote, { color: theme.text }]}>
          {'"'}{dailyQuote}{'"'}
        </Text>

        <TouchableOpacity
          style={[styles.reflectButton, styles.reflectButtonDisabled]}
          disabled
        >
          <Ionicons name="lock-closed" size={18} color="#121212" />
          <Text style={styles.reflectButtonText}>Vidia Coach coming soon</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Today&apos;s posts</Text>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{todayCount ? 1 : 0}</Text>
        </View>

        <View style={styles.streakPill}>
          <Ionicons name="flame" size={15} color="#121212" />
          <Text style={styles.summaryPillText}>{userData?.streakCount || 0} day streak</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {dailyPost ? (
          <PostCard
            item={dailyPost}
            onLike={() => toggleLike(dailyPost.id)}
            onSave={() => toggleSave(dailyPost.id)}
          />
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No daily post yet</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Check back later, or schedule today&apos;s post from the admin
              upload page.
            </Text>
          </View>
        )}

        {!!activeBookQuote && (
          <Animated.View
            style={[
              styles.bookQuoteCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: quoteFade,
                transform: [{ translateY: quoteLift }],
              },
            ]}
          >
            <View style={styles.bookQuoteTop}>
              <View style={styles.bookQuoteIcon}>
                <Ionicons name="library" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.bookQuoteEyebrow}>From the library</Text>
                <Text style={[styles.bookQuoteTitle, { color: theme.text }]}>
                  {activeBookQuote.title}
                </Text>
              </View>
            </View>

            <Text style={[styles.bookQuoteText, { color: theme.text }]}>
              {'"'}{activeBookQuote.quote}{'"'}
            </Text>
            <Text style={[styles.bookQuoteAuthor, { color: theme.muted }]}>
              {activeBookQuote.author}
            </Text>

            <View style={styles.quoteDots}>
              {bookQuotes.slice(0, 5).map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.quoteDot,
                    index === quoteIndex % bookQuotes.length && styles.quoteDotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 58,
    paddingHorizontal: 20,
  },

  header: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  subHeader: {
    color: '#888888',
    marginTop: 2,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#292929',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dailyMindsetCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#292929',
  },

  dailyMindsetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  dailyEyebrow: {
    color: '#7CFFB2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  dailyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  dailyQuote: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
    marginBottom: 16,
  },

  reflectButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#7CFFB2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  reflectButtonDisabled: {
    opacity: 0.72,
  },

  reflectButtonText: {
    color: '#121212',
    fontWeight: '900',
  },

  bookQuoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginTop: 2,
    marginBottom: 18,
    overflow: 'hidden',
  },

  bookQuoteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 15,
  },

  bookQuoteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookQuoteEyebrow: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  bookQuoteTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },

  bookQuoteText: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 29,
  },

  bookQuoteAuthor: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 14,
    textTransform: 'uppercase',
  },

  quoteDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },

  quoteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A3A3A',
  },

  quoteDotActive: {
    width: 18,
    backgroundColor: '#8B5CF6',
  },

  summaryLabel: {
    color: '#888',
    fontWeight: '700',
  },

  summaryNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },

  summaryPill: {
    backgroundColor: '#7CFFB2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  streakPill: {
    backgroundColor: '#FFD166',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryPillText: {
    color: '#121212',
    fontWeight: '900',
    fontSize: 12,
  },

  feedContent: {
    paddingBottom: 24,
  },

  emptyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    alignItems: 'center',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
