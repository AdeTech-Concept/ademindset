/*import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import PostCard from '../../components/PostCard';
import { app, db } from '../../firebaseConfig';

const LikeButton = ({ liked, onPress }) => {
  const [lastTap, setLastTap] = useState(null);
  const handleDoubleTap = () => {
    const now = Date.now();

    if (
      lastTap &&
      now - lastTap < 300
    ) {
      onLike();
    }

    setLastTap(now);
  };
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.4, {}, () => {
      scale.value = withSpring(1);
    });

    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={24}
        color={liked ? 'red' : 'gray'}
        onPress={handlePress}
      />
    </Animated.View>
  );
}; */
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
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PostCard from '../../components/PostCard';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

export default function HomeScreen() {
  const router = useRouter();

  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchPosts = async () => {
        try {
          const user = auth.currentUser;

          if (!user) return;

          const userId = user.uid;

          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);

          let savedPosts = [];
          let likedPosts = [];

          if (userSnap.exists()) {
            const data = userSnap.data();

            setUserData(data);
            savedPosts = data.savedPosts || [];
            likedPosts = data.likedPosts || [];
          }

          const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc')
          );

          const querySnapshot = await getDocs(q);

          const data: any[] = querySnapshot.docs.map(postDoc => ({
            id: postDoc.id,
            ...postDoc.data(),
            liked: likedPosts.includes(postDoc.id),
            saved: savedPosts.includes(postDoc.id),
          }));

          const sorted = data.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            return (
              (b.createdAt?.seconds || 0) -
              (a.createdAt?.seconds || 0)
            );
          });

          setPosts(sorted);
        } catch (error) {
          console.log('ERROR:', error);
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
        post.id === postId
          ? { ...post, liked: nextLiked }
          : post
      )
    );

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let likedPosts = [];

      if (userSnap.exists()) {
        likedPosts = userSnap.data().likedPosts || [];
      }

      if (nextLiked) {
        if (!likedPosts.includes(postId)) {
          likedPosts.push(postId);
        }
      } else {
          likedPosts = likedPosts.filter((id: string) => id !== postId);
      }

      await setDoc(userRef, { likedPosts }, { merge: true });

      if (
        nextLiked &&
        selectedPost.userId &&
        selectedPost.userId !== user.uid
      ) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedPost.userId,
          senderName: userData?.name || 'Someone',
          type: 'like',
          postId: selectedPost.id,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error: any) {
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
        post.id === postId
          ? { ...post, saved: nextSaved }
          : post
      )
    );

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let savedPosts = [];

      if (userSnap.exists()) {
        savedPosts = userSnap.data().savedPosts || [];
      }

      if (nextSaved) {
        if (!savedPosts.includes(postId)) {
          savedPosts.push(postId);
        }
      } else {
        savedPosts = savedPosts.filter((id: string) => id !== postId);
      }

      await setDoc(userRef, { savedPosts }, { merge: true });
    } catch (error: any) {
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      console.log('Logout error:', error.message);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          <View>
            <Text style={styles.header}>Ademindset</Text>
            <Text style={styles.subHeader}>
              For those who refuse to stay average
            </Text>
          </View>
        </View>

        <Text style={styles.logout} onPress={handleLogout}>
          Logout
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Today Feed</Text>
          <Text style={styles.summaryNumber}>{posts.length}</Text>
        </View>

        <View style={styles.summaryPill}>
          <Text style={styles.summaryPillText}>Fresh mindset</Text>
        </View>
      </View>

      <TextInput
        placeholder="Search posts..."
        placeholderTextColor="#888"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {filteredPosts.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No posts found</Text>
          <Text style={styles.emptyText}>
            Try another search or check back for new motivation.
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {filteredPosts.map(item => (
          <PostCard
            key={item.id}
            item={item}
            onLike={() => toggleLike(item.id)}
            onSave={() => toggleSave(item.id)}
          />
        ))}
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
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 15,
  },
  actions: {
    flexDirection: 'row',
    //justifyContent: 'space-between',
    //padding: 15,
    gap: 20,
    padding: 15,
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

  logout: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 10,

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
  },
});
