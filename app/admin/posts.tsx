import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  ActivityIndicator,
  Image,
  Modal,
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
const adminEmail = 'josh0mathew@gmail.com';

export default function PostsScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageUri, setEditImageUri] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

    fetchPosts();
  }, [router]);

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
    setEditImageUrl(post.image_url || '');
    setEditImageUri('');
    setModalVisible(true);
  };

  const pickEditImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (imageUri: string) => {
    const formData = new FormData();

    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'post-update.jpg',
    } as any);

    formData.append('upload_preset', 'ademindset');

    const response = await fetch(
      'https://api.cloudinary.com/v1_1/dz4gz8kvc/image/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error('Image upload failed');
    }

    return data.secure_url;
  };

  const saveEdit = async () => {
    if (!editingPost) return;

    if (!editTitle.trim() || !editCaption.trim()) {
      showAppAlert('Missing fields', 'Title and caption are required.');
      return;
    }

    try {
      setSavingEdit(true);

      const nextImageUrl = editImageUri
        ? await uploadToCloudinary(editImageUri)
        : editImageUrl;

      await updateDoc(doc(db, 'posts', editingPost.id), {
        title: editTitle.trim(),
        caption: editCaption.trim(),
        image_url: nextImageUrl,
      });

      setPosts(prev =>
        prev.map(post =>
          post.id === editingPost.id
            ? {
                ...post,
                title: editTitle.trim(),
                caption: editCaption.trim(),
                image_url: nextImageUrl,
              }
            : post
        )
      );

      setEditingPost(null);
      setModalVisible(false);
      setEditImageUri('');
      showAppAlert('Post updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update post.');
    } finally {
      setSavingEdit(false);
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
    showAppAlert('Delete Post', 'Are you sure you want to remove this post?', [
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

  const pinnedCount = posts.filter(post => post.pinned).length;
  const imageCount = posts.filter(post => post.image_url).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="create-outline" size={25} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Content Control</Text>
          <Text style={[styles.title, { color: theme.text }]}>Manage Posts</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{posts.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Posts</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{pinnedCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Pinned</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{imageCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Images</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.uploadShortcut}
        onPress={() => router.push('/admin/upload')}
      >
        <Ionicons name="add-circle-outline" size={19} color="#121212" />
        <Text style={styles.uploadShortcutText}>Upload New Post</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {posts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="images-outline" size={34} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No posts uploaded yet</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Uploaded posts will appear here for editing.
            </Text>
          </View>
        ) : (
          posts.map(item => (
            <View
              key={item.id}
              style={[
                styles.postCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.postImage}
                />
              ) : (
                <View style={[styles.imageFallback, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="image-outline" size={34} color={theme.muted} />
                </View>
              )}

              <View style={styles.imageOverlay}>
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.imageOverlayText}>
                  {item.publishDate || item.scheduledDate || 'No date'}
                </Text>
              </View>

              <View style={styles.postBody}>
                <View style={styles.postTitleRow}>
                  <Text style={[styles.postTitle, { color: theme.text }]} numberOfLines={2}>
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
                  <Text style={[styles.caption, { color: theme.subtle }]} numberOfLines={2}>
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
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>Post Editor</Text>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Post</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.imagePickerCard,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
                onPress={pickEditImage}
              >
                {editImageUri || editImageUrl ? (
                  <Image
                    source={{ uri: editImageUri || editImageUrl }}
                    style={styles.editPreviewImage}
                  />
                ) : (
                  <View style={styles.editPreviewFallback}>
                    <Ionicons name="image-outline" size={36} color={theme.muted} />
                  </View>
                )}

                <View style={styles.changeImagePill}>
                  <Ionicons name="camera-outline" size={16} color="#121212" />
                  <Text style={styles.changeImageText}>
                    {editImageUri ? 'New picture selected' : 'Change picture'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.surfaceAlt, color: theme.text },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title"
                placeholderTextColor={theme.muted}
              />

              <TextInput
                style={[
                  styles.bioInput,
                  { backgroundColor: theme.surfaceAlt, color: theme.text },
                ]}
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Caption"
                placeholderTextColor={theme.muted}
                multiline
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, savingEdit && styles.disabledBtn]}
                  onPress={saveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#121212" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#121212" />
                      <Text style={styles.saveText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={savingEdit}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#292929',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  summaryNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  uploadShortcut: {
    backgroundColor: '#7CFFB2',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  uploadShortcutText: {
    color: '#121212',
    fontWeight: '900',
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

  imageFallback: {
    width: '100%',
    height: 190,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  imageOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
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

  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },

  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292929',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  modalEyebrow: {
    color: '#FFD166',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imagePickerCard: {
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#202020',
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 12,
  },

  editPreviewImage: {
    width: '100%',
    height: 220,
  },

  editPreviewFallback: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeImagePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: '#7CFFB2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  changeImageText: {
    color: '#121212',
    fontWeight: '900',
    fontSize: 12,
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
    backgroundColor: '#7CFFB2',
    padding: 15,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  cancelBtn: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
  },

  saveText: {
    color: '#121212',
    fontWeight: '900',
  },

  cancelText: {
    color: '#fff',
    fontWeight: '900',
  },

  disabledBtn: {
    opacity: 0.7,
  },
});
