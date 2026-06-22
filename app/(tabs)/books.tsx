import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BookCard from '../../components/BookCard';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { db } from '../../firebaseConfig';

const toMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return new Date(value).getTime() || 0;
};

const sortBooks = (nextBooks: any[]) =>
  [...nextBooks].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;

    return toMillis(b.createdAt || b.uploadedAt) - toMillis(a.createdAt || a.uploadedAt);
  });

export default function BooksScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const featuredBook = books.find(book => book.pinned) || books[0];

  useFocusEffect(
    useCallback(() => {
      const fetchBooks = async () => {
        setLoading(true);
        setLoadError('');

        try {
          const snapshot = await getDocs(collection(db, 'books'));
          const data = sortBooks(snapshot.docs.map(bookDoc => ({
            id: bookDoc.id,
            ...bookDoc.data(),
          })));

          setBooks(data);
        } catch (error) {
          console.log('Books load error:', error);
          setLoadError('Could not load books. Check your connection and try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchBooks();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerBlock}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={26} color="#fff" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Read</Text>
          <Text style={[styles.title, { color: theme.text }]}>Books</Text>
        </View>
      </View>

      {!!featuredBook && (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.continueCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onPress={() => router.push(`/book/${featuredBook.id}`)}
        >
          <View style={styles.continueIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View style={styles.continueCopy}>
            <Text style={[styles.continueLabel, { color: theme.muted }]}>
              Featured Summary
            </Text>
            <Text style={[styles.continueTitle, { color: theme.text }]} numberOfLines={1}>
              {featuredBook.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.summaryNumber, { color: theme.text }]}>
          {books.length}
        </Text>
        <Text style={[styles.summaryLabel, { color: theme.muted }]}>
          books available
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {loading ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Loading books
            </Text>
          </View>
        ) : !!loadError ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={36} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Books unavailable
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {loadError}
            </Text>
          </View>
        ) : books.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Ionicons name="book-outline" size={36} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No books yet
            </Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
              Added book summaries will appear here.
          </Text>
          </View>
        ) : (
          books.map(book => (
            <BookCard key={book.id} item={book} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 58,
  },

  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6D5BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
  },

  continueCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  continueIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueCopy: {
    flex: 1,
  },

  continueLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  continueTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  continuePercent: {
    color: '#fff',
    backgroundColor: '#6D5BFF',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: '900',
  },

  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },

  summaryNumber: {
    fontSize: 34,
    fontWeight: '900',
  },

  summaryLabel: {
    fontWeight: '800',
  },

  feedContent: {
    paddingBottom: 24,
  },

  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
