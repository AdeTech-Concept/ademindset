import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';

const adminEmail = 'josh0mathew@gmail.com';

export default function PostsScreen() {
  const router = useRouter();
  const auth = getAuth(app);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      alert('Access denied');
      router.replace('/(tabs)');
      return;
    }

    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'posts'));
      const data = querySnapshot.docs.map(postDoc => ({
        id: postDoc.id,
        ...postDoc.data(),
      }));

      setPosts(data);
    } catch (error) {
      console.log(error);
    }
  };

  const startEdit = (post: any) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditCaption(post.caption || '');
    setModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingPost) return;

    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        title: editTitle,
        caption: editCaption,
      });

      setPosts(prev =>
        prev.map(post =>
          post.id === editingPost.id
            ? { ...post, title: editTitle, caption: editCaption }
            : post
        )
      );

      setEditingPost(null);
      setModalVisible(false);
      alert('Post updated');
    } catch (error) {
      console.log(error);
    }
  };

  const togglePin = async (post: any) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        pinned: !post.pinned,
      });

      setPosts(prev =>
        prev.map(item =>
          item.id === post.id
            ? { ...item, pinned: !item.pinned }
            : item
        )
      );
    } catch (error) {
      console.log(error);
    }
  };

  const deletePost = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'posts', postId));
            setPosts(prev => prev.filter(post => post.id !== postId));
          } catch (error) {
            console.log(error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="create-outline" size={25} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Content Control</Text>
          <Text style={styles.title}>Manage Posts</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{posts.length}</Text>
        <Text style={styles.summaryLabel}>posts published</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="images-outline" size={34} color="#777" />
            <Text style={styles.emptyTitle}>No posts uploaded yet</Text>
            <Text style={styles.emptyText}>
              Uploaded posts will appear here for editing.
            </Text>
          </View>
        ) : (
          posts.map(item => (
            <View key={item.id} style={styles.postCard}>
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.postImage}
                />
              )}

              <View style={styles.postBody}>
                <View style={styles.postTitleRow}>
                  <Text style={styles.postTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {item.pinned && (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={13} color="#121212" />
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                </View>

                {!!item.caption && (
                  <Text style={styles.caption} numberOfLines={2}>
                    {item.caption}
                  </Text>
                )}

                <View style={styles.actionRow}>
                  <ActionButton
                    icon="create-outline"
                    label="Edit"
                    color="#2F80ED"
                    onPress={() => startEdit(item)}
                  />

                  <ActionButton
                    icon={item.pinned ? 'pin' : 'pin-outline'}
                    label={item.pinned ? 'Pinned' : 'Pin'}
                    color="#FFD166"
                    darkText
                    onPress={() => togglePin(item)}
                  />

                  <ActionButton
                    icon="trash-outline"
                    label="Delete"
                    color="#FF4D67"
                    onPress={() => deletePost(item.id)}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Post</Text>

            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor="#888"
            />

            <TextInput
              style={styles.bioInput}
              value={editCaption}
              onChangeText={setEditCaption}
              placeholder="Caption"
              placeholderTextColor="#888"
              multiline
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({ icon, label, color, onPress, darkText }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={17} color={darkText ? '#121212' : '#fff'} />
      <Text style={[styles.actionText, darkText && { color: '#121212' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    backgroundColor: '#FFD166',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#FFD166',
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

  listContent: {
    paddingBottom: 34,
  },

  postCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 16,
    overflow: 'hidden',
  },

  postImage: {
    width: '100%',
    height: 190,
  },

  postBody: {
    padding: 15,
  },

  postTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  postTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },

  caption: {
    color: '#999',
    marginTop: 8,
    lineHeight: 20,
  },

  pinnedBadge: {
    backgroundColor: '#7CFFB2',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  pinnedText: {
    color: '#121212',
    fontWeight: '900',
    fontSize: 11,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  actionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  emptyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292929',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },

  input: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
  },

  bioInput: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 10,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },

  saveBtn: {
    backgroundColor: '#2F80ED',
    padding: 15,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
  },

  cancelBtn: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontWeight: '900',
  },

  cancelText: {
    color: '#fff',
    fontWeight: '900',
  },
});
