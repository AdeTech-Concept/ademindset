import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
  setDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
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

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export default function PostScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const params = useLocalSearchParams();
  const id = params.id?.toString();

  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [userData, setUserData] = useState(null);
  const [readMarked, setReadMarked] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const scrollRef = useRef(null);

  const timeAgo = timestamp => {
    if (!timestamp) return '';

    try {
      const now = new Date();
      const commentTime = timestamp?.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      const diff = Math.floor((now.getTime() - commentTime.getTime()) / 1000);

      if (diff < 60) return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;

      return `${Math.floor(diff / 86400)}d`;
    } catch {
      return '';
    }
  };

  const shareImage = async () => {
    try {
      if (!post?.image_url) return;

      setDownloaded(true);

      const fileUri =
        FileSystem.documentDirectory + 'ademindset.jpg';

      const downloadedFile = await FileSystem.downloadAsync(
        post.image_url,
        fileUri
      );

      await Sharing.shareAsync(downloadedFile.uri);

      setTimeout(() => {
        setDownloaded(false);
      }, 2000);
    } catch (error) {
      console.log(error);
      setDownloaded(false);
      showAppAlert('Error', 'Could not share image');
    }
  };

  const copyCaption = async () => {
    if (!post?.caption) return;

    await Clipboard.setStringAsync(post.caption);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = auth.currentUser;

        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setUserData(data);
          setReadMarked(!!id && (data.readPosts || []).includes(id));
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchCurrentUser();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      async snapshot => {
        const data = await Promise.all(
          snapshot.docs.map(async docSnap => {
            const comment = docSnap.data();

            let userName = 'User';

            if (comment.userId) {
              const userRef = doc(db, 'users', comment.userId);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                userName = userSnap.data().name || 'User';
              }
            }

            return {
              id: docSnap.id,
              ...comment,
              userName,
            };
          })
        );

        setComments(data);
      },
      error => {
        console.log(error);
      }
    );

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (!id) return;

        const docRef = doc(db, 'posts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchPost();
  }, [id]);

  const addComment = async () => {
    try {
      const user = auth.currentUser;

      if (!user || !id || !post || !text.trim()) return;

      const commentText = text.trim();

      await addDoc(collection(db, 'comments'), {
        postId: id,
        text: commentText,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      if (post.userId && post.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          senderName: userData?.name || 'Someone',
          type: 'comment',
          postId: post.id,
          createdAt: serverTimestamp(),
          read: false,
        });
      }

      setText('');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not add comment');
    }
  };

  const markPostRead = async () => {
    try {
      const user = auth.currentUser;

      if (!user || !id) return;

      if (readMarked) {
        showAppAlert('Already done', 'This post is already in your progress.');
        return;
      }

      setMarkingRead(true);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.exists() ? userSnap.data() : {};
      const readPosts: string[] = data.readPosts || [];

      if (readPosts.includes(id)) {
        setReadMarked(true);
        return;
      }

      const nextReadPosts = [...readPosts, id];

      await setDoc(
        userRef,
        {
          readPosts: nextReadPosts,
          readCount: nextReadPosts.length,
          lastReadPostId: id,
          lastReadPostDate: dateKey(),
          lastReadPostAt: new Date(),
        },
        { merge: true }
      );

      setUserData((prev: any) => ({
        ...prev,
        readPosts: nextReadPosts,
        readCount: nextReadPosts.length,
      }));
      setReadMarked(true);
      showAppAlert('Progress saved', 'Nice. This post was marked as read.');
    } catch (error) {
      console.log('Read progress error:', error);
      showAppAlert('Error', 'Could not save reading progress.');
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {post && (
            <View style={styles.postContainer}>
              {post.image_url && (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.postImage}
                  resizeMode="contain"
                />
              )}

              <View style={styles.postActions}>
                <TouchableOpacity onPress={shareImage}>
                  <Ionicons
                    name={
                      downloaded
                        ? 'checkmark-done-circle'
                        : 'share-social-outline'
                    }
                    size={28}
                    color={downloaded ? '#00FF99' : theme.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={copyCaption}>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={28}
                    color={copied ? '#00FF99' : theme.text}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.postTitle, { color: theme.text }]}>{post.title}</Text>

              <Text style={[styles.postCaption, { color: theme.text }]}>{post.caption}</Text>

              <TouchableOpacity
                style={[
                  styles.doneButton,
                  readMarked && styles.doneButtonCompleted,
                ]}
                onPress={markPostRead}
                disabled={readMarked || markingRead}
              >
                <Ionicons
                  name={readMarked ? 'checkmark-circle' : 'checkmark-done-outline'}
                  size={20}
                  color={readMarked ? '#121212' : '#7CFFB2'}
                />
                <Text
                  style={[
                    styles.doneButtonText,
                    readMarked && styles.doneButtonTextCompleted,
                  ]}
                >
                  {readMarked
                    ? 'Read and counted'
                    : markingRead
                      ? 'Saving...'
                      : 'Done reading'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {comments.map(c => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {c.userName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>

              <View style={[styles.commentBox, { backgroundColor: theme.surfaceAlt }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentUser, { color: theme.text }]}>
                    {c.userName || 'User'}
                  </Text>

                  <Text style={[styles.commentTime, { color: theme.muted }]}>
                    {timeAgo(c.createdAt)}
                  </Text>
                </View>

                <Text style={[styles.commentText, { color: theme.text }]}>{c.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Say something..."
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              { backgroundColor: theme.surfaceAlt, color: theme.text },
            ]}
          />

          <TouchableOpacity style={styles.sendButton} onPress={addComment}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 15,
  },

  scrollContent: {
    paddingBottom: 100,
    marginTop: 16,
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
    marginTop: 44,
  },

  backText: {
    color: '#fff',
    fontWeight: '900',
  },

  postContainer: {
    marginBottom: 20,
  },

  postImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 10,
  },

  postActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 15,
    marginBottom: 10,
  },

  postTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  postCaption: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },

  doneButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7CFFB2',
    marginTop: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  doneButtonCompleted: {
    backgroundColor: '#7CFFB2',
  },

  doneButtonText: {
    color: '#7CFFB2',
    fontWeight: '900',
  },

  doneButtonTextCompleted: {
    color: '#121212',
  },

  commentRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  commentBox: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 10,
  },

  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  commentUser: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  commentTime: {
    color: '#888',
    fontSize: 11,
  },

  commentText: {
    color: '#fff',
    fontSize: 14,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#121212',
  },

  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 12,
    borderRadius: 20,
    marginRight: 10,
  },

  sendButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },

  sendText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
