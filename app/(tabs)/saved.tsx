import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PostCard from '../../components/PostCard';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

export default function SavedScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchSavedPosts = async () => {
        try {
          const user = auth.currentUser;

          if (!user) return;

          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          let savedIds: string[] = [];
          let likedIds: string[] = [];

          if (userSnap.exists()) {
            savedIds = userSnap.data().savedPosts || [];
            likedIds = userSnap.data().likedPosts || [];
          }

          const querySnapshot = await getDocs(collection(db, 'posts'));

          const posts = querySnapshot.docs
            .map(postDoc => ({
              id: postDoc.id,
              ...postDoc.data(),
              liked: likedIds.includes(postDoc.id),
              saved: savedIds.includes(postDoc.id),
            }))
            .filter(post => savedIds.includes(post.id));

          setSavedPosts(posts);
        } catch (error) {
          console.log('Error:', error);
        }
      };

      fetchSavedPosts();
    }, [])
  );

  const removeSaved = async (postId: string) => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let savedPosts: string[] = [];

      if (userSnap.exists()) {
        savedPosts = userSnap.data().savedPosts || [];
      }

      savedPosts = savedPosts.filter(id => id !== postId);

      await setDoc(userRef, { savedPosts }, { merge: true });

      setSavedPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.log('Remove error:', error);
    }
  };

  const toggleLike = async (postId: string) => {
    setSavedPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, liked: !post.liked } : post
      )
    );

    try {
      const user = auth.currentUser;

      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let likedPosts: string[] = [];

      if (userSnap.exists()) {
        likedPosts = userSnap.data().likedPosts || [];
      }

      if (likedPosts.includes(postId)) {
        likedPosts = likedPosts.filter(id => id !== postId);
      } else {
        likedPosts.push(postId);
      }

      await setDoc(userRef, { likedPosts }, { merge: true });
    } catch (error) {
      console.log('Like error:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.backButton,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
        ]}
        onPress={() => router.replace('/(tabs)/profile')}
      >
        <Ionicons name="chevron-back" size={20} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Profile</Text>
      </TouchableOpacity>

      <View style={styles.headerBlock}>
        <View style={styles.headerIcon}>
          <Ionicons name="bookmark" size={24} color="#121212" />
        </View>

        <View>
          <Text style={[styles.header, { color: theme.text }]}>Saved Posts</Text>
          <Text style={[styles.subHeader, { color: theme.muted }]}>
            Your private library for later.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.countCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.count, { color: theme.text }]}>{savedPosts.length}</Text>
        <Text style={[styles.countLabel, { color: theme.muted }]}>posts in your library</Text>
      </View>

      {savedPosts.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Ionicons name="bookmark-outline" size={34} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing saved yet</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Tap the bookmark on posts you want to keep.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {savedPosts.map(item => (
            <PostCard
              key={item.id}
              item={item}
              onLike={() => toggleLike(item.id)}
              onRemoveSave={removeSaved}
              showRemoveSave
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    paddingTop: 58,
  },

  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#292929',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },

  backText: {
    color: '#fff',
    fontWeight: '900',
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD166',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  header: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
  },

  subHeader: {
    color: '#888',
    marginTop: 2,
  },

  countCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 16,
  },

  count: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
  },

  countLabel: {
    color: '#888',
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 24,
  },

  emptyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292929',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
  },
});
