import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAuth } from 'firebase/auth';
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
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PostCard from '../../components/PostCard';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

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

const isDuePost = (post: any) => {
  const publishDate = postDateKey(post);

  return !publishDate || publishDate <= dateKey();
};

export default function ExploreScreen() {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchPosts = async () => {
        try {
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

          const data: any[] = querySnapshot.docs
            .map(postDoc => ({
              id: postDoc.id,
              ...postDoc.data(),
              liked: likedPosts.includes(postDoc.id),
              saved: savedPosts.includes(postDoc.id),
            }) as any)
            .filter(isDuePost)
            .sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;

              return (
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
              );
            });

          setPosts(data);
        } catch (error) {
          console.log('Explore posts error:', error);
        }
      };

      fetchPosts();
    }, [])
  );

  const toggleLike = async (postId: string) => {
    const user = auth.currentUser;

    if (!user) return;

    const selectedPost = posts.find(post => post.id === postId);

    if (!selectedPost) return;

    const nextLiked = !selectedPost.liked;

    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, liked: nextLiked } : post
      )
    );

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

      if (nextLiked && selectedPost.userId && selectedPost.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedPost.userId,
          senderName: userData?.name || 'Someone',
          type: 'like',
          postId: selectedPost.id,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error) {
      console.log('Like error:', error);

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, liked: selectedPost.liked }
            : post
        )
      );
    }
  };

  const toggleSave = async (postId: string) => {
    const user = auth.currentUser;

    if (!user) return;

    const selectedPost = posts.find(post => post.id === postId);

    if (!selectedPost) return;

    const nextSaved = !selectedPost.saved;

    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, saved: nextSaved } : post
      )
    );

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

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, saved: selectedPost.saved }
            : post
        )
      );
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerBlock}>
        <View style={styles.headerIcon}>
          <Ionicons name="compass-outline" size={25} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Explore</Text>
          <Text style={[styles.title, { color: theme.text }]}>All Posts</Text>
        </View>
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.summaryNumber, { color: theme.text }]}>{posts.length}</Text>
        <Text style={[styles.summaryLabel, { color: theme.muted }]}>published posts</Text>
      </View>

      <TextInput
        placeholder="Search posts..."
        placeholderTextColor={theme.muted}
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {filteredPosts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No posts found</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Try another search or check back after the next scheduled post.
            </Text>
          </View>
        ) : (
          filteredPosts.map(item => (
            <PostCard
              key={item.id}
              item={item}
              onLike={() => toggleLike(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))
        )}
      </ScrollView>
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
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },

  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 16,
  },

  summaryNumber: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
  },

  summaryLabel: {
    color: '#888',
    fontWeight: '800',
  },

  searchInput: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#292929',
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
