import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id?.toString();

  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [userData, setUserData] = useState(null);

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

  const deletePost = async postId => {
    try {
      await deleteDoc(doc(db, 'posts', postId));

      const commentsQuery = query(
        collection(db, 'comments'),
        where('postId', '==', postId)
      );

      const commentsSnapshot = await getDocs(commentsQuery);

      await Promise.all(
        commentsSnapshot.docs.map(commentDoc =>
          deleteDoc(commentDoc.ref)
        )
      );

      Alert.alert('Success', 'Post deleted 🔥');
      router.back();
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Could not delete post');
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
      Alert.alert('Error', 'Could not share image');
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
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchCurrentUser();
  }, []);

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
      Alert.alert('Error', 'Could not add comment');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
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
                    color={downloaded ? '#00FF99' : '#fff'}
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={copyCaption}>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={28}
                    color={copied ? '#00FF99' : '#fff'}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>

              <Text style={styles.postCaption}>{post.caption}</Text>
            </View>
          )}

          {comments.map(c => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {c.userName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>

              <View style={styles.commentBox}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {c.userName || 'User'}
                  </Text>

                  <Text style={styles.commentTime}>
                    {timeAgo(c.createdAt)}
                  </Text>
                </View>

                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Say something..."
            placeholderTextColor="#888"
            style={styles.input}
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
    marginTop: 40,
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
