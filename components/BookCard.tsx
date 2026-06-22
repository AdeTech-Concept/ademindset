import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAppTheme } from '../constants/app-theme';
import { useThemePreference } from '../contexts/theme-preference';

export default function BookCard({ item }: any) {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const lessonCount = Array.isArray(item.lessons) ? item.lessons.length : 0;
  const quoteCount = Array.isArray(item.quotes) ? item.quotes.length : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={() => router.push(`/book/${item.id}`)}
    >
      <View style={styles.cover}>
        {!!item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="book" size={38} color="#fff" />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title || 'Untitled book'}
          </Text>

          {item.pinned && (
            <View style={styles.currentBadge}>
              <Ionicons name="pin" size={12} color="#fff" />
              <Text style={styles.currentText}>Pinned</Text>
            </View>
          )}
        </View>

        {!!item.author && (
          <Text style={[styles.author, { color: theme.muted }]} numberOfLines={1}>
            {item.author}
          </Text>
        )}

        {!!(item.summary || item.description) && (
          <Text style={[styles.description, { color: theme.subtle }]} numberOfLines={3}>
            {item.summary || item.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: theme.raised }]}>
            <Ionicons name="bulb-outline" size={13} color={theme.muted} />
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {lessonCount} lessons
            </Text>
          </View>

          <View style={[styles.metaPill, { backgroundColor: theme.raised }]}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color={theme.muted} />
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {quoteCount} quotes
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },

  cover: {
    width: 76,
    height: 112,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },

  currentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  author: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
