import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

const formatDate = (value: any) => {
  if (!value) return 'No date';

  try {
    const date =
      typeof value.toDate === 'function'
        ? value.toDate()
        : new Date(value.seconds ? value.seconds * 1000 : value);

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'No date';
  }
};

export default function ManageCommentsScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      showAppAlert('Access denied');
      router.replace('/(tabs)');
      return;
    }

    fetchComments();
  }, [router]);

  const fetchComments = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        query(collection(db, 'comments'), orderBy('createdAt', 'desc'))
      );

      const data = await Promise.all(
        snapshot.docs.map(async commentDoc => {
          const comment = commentDoc.data();
          let postTitle = 'Unknown post';
          let userName = 'User';

          if (comment.postId) {
            const postSnap = await getDoc(doc(db, 'posts', comment.postId));

            if (postSnap.exists()) {
              postTitle = postSnap.data().title || 'Untitled post';
            }
          }

          if (comment.userId) {
            const userSnap = await getDoc(doc(db, 'users', comment.userId));

            if (userSnap.exists()) {
              userName = userSnap.data().name || userSnap.data().email || 'User';
            }
          }

          return {
            id: commentDoc.id,
            ...comment,
            postTitle,
            userName,
          };
        })
      );

      setComments(data);
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = (commentId: string) => {
    showAppAlert('Delete Comment', 'Remove this comment from the post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(commentId);
            await deleteDoc(doc(db, 'comments', commentId));
            setComments(prev => prev.filter(comment => comment.id !== commentId));
          } catch (error) {
            console.log(error);
            showAppAlert('Error', 'Could not delete comment.');
          } finally {
            setDeletingId('');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles-outline" size={25} color="#fff" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Community Control</Text>
          <Text style={[styles.title, { color: theme.text }]}>Manage Comments</Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.summaryNumber, { color: theme.text }]}>{comments.length}</Text>
        <Text style={[styles.summaryLabel, { color: theme.muted }]}>Comments</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading comments</Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={34} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No comments yet</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Post comments will appear here for moderation.
            </Text>
          </View>
        ) : (
          comments.map(comment => (
            <View
              key={comment.id}
              style={[
                styles.commentCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.commentTopRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>

                <View style={styles.commentMetaBlock}>
                  <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                    {comment.userName || 'User'}
                  </Text>
                  <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={1}>
                    {formatDate(comment.createdAt)} - {comment.postTitle}
                  </Text>
                </View>
              </View>

              <Text style={[styles.commentText, { color: theme.subtle }]}>
                {comment.text || 'No comment text'}
              </Text>

              <TouchableOpacity
                style={[styles.deleteBtn, deletingId === comment.id && styles.disabledBtn]}
                onPress={() => deleteComment(comment.id)}
                disabled={deletingId === comment.id}
              >
                {deletingId === comment.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={17} color="#fff" />
                    <Text style={styles.deleteText}>Delete Comment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2F80ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#2F80ED',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
  },

  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 34,
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
    marginTop: 5,
  },

  commentCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 15,
  },

  commentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  avatarText: {
    color: '#fff',
    fontWeight: '900',
  },

  commentMetaBlock: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: '900',
  },

  metaText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  commentText: {
    fontSize: 15,
    lineHeight: 21,
  },

  deleteBtn: {
    backgroundColor: '#FF4D67',
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },

  deleteText: {
    color: '#fff',
    fontWeight: '900',
  },

  disabledBtn: {
    opacity: 0.7,
  },
});
