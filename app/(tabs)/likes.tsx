import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PostCard from '../../components/PostCard';
import { app, db } from '../../firebaseConfig';

export default function LikesScreen() {
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const auth = getAuth(app);

  useFocusEffect(
    useCallback(() => {
      const fetchLikes = async () => {
        try {
          const user = auth.currentUser;

          if (!user) return;

          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          let likedIds: string[] = [];
          let savedIds: string[] = [];

          if (userSnap.exists()) {
            likedIds = userSnap.data().likedPosts || [];
            savedIds = userSnap.data().savedPosts || [];
          }

          const querySnapshot = await getDocs(collection(db, 'posts'));

          const posts = querySnapshot.docs
            .map(postDoc => ({
              id: postDoc.id,
              ...postDoc.data(),
              liked: likedIds.includes(postDoc.id),
              saved: savedIds.includes(postDoc.id),
            }))
            .filter(post => likedIds.includes(post.id));

          setLikedPosts(posts);
        } catch (error) {
          console.log('Error:', error);
        }
      };

      fetchLikes();
    }, [])
  );

  const removeLike = async (postId: string) => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let likedPosts: string[] = [];

      if (userSnap.exists()) {
        likedPosts = userSnap.data().likedPosts || [];
      }

      likedPosts = likedPosts.filter(id => id !== postId);

      await setDoc(userRef, { likedPosts }, { merge: true });

      setLikedPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.log('Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.headerIcon}>
          <Ionicons name="heart" size={24} color="#fff" />
        </View>

        <View>
          <Text style={styles.header}>Liked Posts</Text>
          <Text style={styles.subHeader}>
            Your strongest saved sparks of motivation.
          </Text>
        </View>
      </View>

      <View style={styles.countCard}>
        <Text style={styles.count}>{likedPosts.length}</Text>
        <Text style={styles.countLabel}>posts you liked</Text>
      </View>

      {likedPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="heart-outline" size={34} color="#777" />
          <Text style={styles.emptyTitle}>No liked posts yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart on posts you want to return to.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {likedPosts.map(item => (
            <PostCard
              key={item.id}
              item={item}
              onLike={() => removeLike(item.id)}
              onRemoveLike={removeLike}
              showRemoveLike
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

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4D67',
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
