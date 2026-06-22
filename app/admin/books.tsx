import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRootNavigationState, useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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

const toMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return new Date(value).getTime() || 0;
};

const sortBooks = (nextBooks: any[]) =>
  [...nextBooks].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;

    return toMillis(b.createdAt || b.uploadedAt) - toMillis(a.createdAt || a.uploadedAt);
  });

const asList = (value: unknown) =>
  Array.isArray(value)
    ? value.map(item => `${item}`.trim()).filter(Boolean)
    : [];

const listToText = (value: unknown) => asList(value).join('\n');

const splitList = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

export default function ManageBooksScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [books, setBooks] = useState<any[]>([]);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editCoverImageUri, setEditCoverImageUri] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editLessonsText, setEditLessonsText] = useState('');
  const [editQuotesText, setEditQuotesText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (user.email !== adminEmail) {
        showAppAlert('Access denied');
        router.replace('/(tabs)');
        return;
      }

      fetchBooks();
    });

    return unsubscribe;
  }, [router, rootNavigationState?.key]);

  const fetchBooks = async () => {
    setLoadingBooks(true);
    setLoadError('');

    try {
      const snapshot = await getDocs(collection(db, 'books'));
      const data = snapshot.docs.map(bookDoc => ({
        id: bookDoc.id,
        ...bookDoc.data(),
      }));

      setBooks(sortBooks(data));
    } catch (error) {
      console.log(error);
      setLoadError('Could not load books.');
    } finally {
      setLoadingBooks(false);
    }
  };

  const startEdit = (book: any) => {
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditAuthor(book.author || '');
    setEditCoverImage(book.coverImage || '');
    setEditCoverImageUri('');
    setEditSummary(book.summary || book.description || '');
    setEditLessonsText(listToText(book.lessons));
    setEditQuotesText(listToText(book.quotes));
    setModalVisible(true);
  };

  const pickEditCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setEditCoverImageUri(result.assets[0].uri);
    }
  };

  const uploadCoverToCloudinary = async (imageUri: string) => {
    const formData = new FormData();

    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'book-cover.jpg',
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

    if (!response.ok || !data.secure_url) {
      throw new Error(data.error?.message || 'Cover image upload failed');
    }

    return data.secure_url;
  };

  const saveEdit = async () => {
    if (!editingBook) return;

    const lessons = splitList(editLessonsText);
    const quotes = splitList(editQuotesText);

    if (!editTitle.trim() || !editAuthor.trim() || !editSummary.trim()) {
      showAppAlert('Missing fields', 'Book title, author, and summary are required.');
      return;
    }

    if (lessons.length === 0) {
      showAppAlert('Missing lessons', 'Add at least one key lesson.');
      return;
    }

    try {
      setSavingEdit(true);
      const coverImage = editCoverImageUri
        ? await uploadCoverToCloudinary(editCoverImageUri)
        : editCoverImage.trim();

      await updateDoc(doc(db, 'books', editingBook.id), {
        title: editTitle.trim(),
        author: editAuthor.trim(),
        coverImage,
        summary: editSummary.trim(),
        lessons,
        quotes,
        updatedAt: new Date(),
      });

      setBooks(prev =>
        prev.map(book =>
          book.id === editingBook.id
            ? {
                ...book,
                title: editTitle.trim(),
                author: editAuthor.trim(),
                coverImage,
                summary: editSummary.trim(),
                lessons,
                quotes,
              }
            : book
        )
      );

      setEditingBook(null);
      setEditCoverImageUri('');
      setModalVisible(false);
      showAppAlert('Book updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update book.');
    } finally {
      setSavingEdit(false);
    }
  };

  const togglePin = async (book: any) => {
    try {
      await updateDoc(doc(db, 'books', book.id), {
        pinned: !book.pinned,
      });

      setBooks(prev => sortBooks(
        prev.map(item =>
          item.id === book.id ? { ...item, pinned: !item.pinned } : item
        )
      ));
    } catch (error) {
      console.log(error);
    }
  };

  const deleteBook = async (bookId: string) => {
    showAppAlert('Delete Book', 'Are you sure you want to remove this book?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'books', bookId));
            setBooks(prev => prev.filter(book => book.id !== bookId));
          } catch (error) {
            console.log(error);
          }
        },
      },
    ]);
  };

  const pinnedCount = books.filter(book => book.pinned).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={25} color="#fff" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Book Control</Text>
          <Text style={[styles.title, { color: theme.text }]}>Manage Books</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <SummaryCard label="Books" value={books.length} />
        <SummaryCard label="Pinned" value={pinnedCount} />
      </View>

      <TouchableOpacity
        style={styles.uploadShortcut}
        onPress={() => router.push('/admin/upload-books')}
      >
        <Ionicons name="add-circle-outline" size={19} color="#fff" />
        <Text style={styles.uploadShortcutText}>Add New Book</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {loadingBooks ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading books</Text>
          </View>
        ) : !!loadError ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Books unavailable</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {loadError}
            </Text>
          </View>
        ) : books.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="book-outline" size={34} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No books uploaded yet</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Added book summaries will appear here for editing.
            </Text>
          </View>
        ) : (
          books.map(item => (
            <View
              key={item.id}
              style={[
                styles.bookCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.bookCover}>
                {!!item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.bookCoverImage} />
                ) : (
                  <Ionicons name="book" size={34} color="#fff" />
                )}
              </View>

              <View style={styles.bookBody}>
                <View style={styles.bookTitleRow}>
                  <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.title || 'Untitled book'}
                  </Text>

                  {item.pinned && (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={13} color="#fff" />
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                </View>

                {!!item.author && (
                  <Text style={[styles.metaText, { color: theme.muted }]}>
                    {item.author}
                  </Text>
                )}

                {!!(item.summary || item.description) && (
                  <Text style={[styles.description, { color: theme.subtle }]} numberOfLines={3}>
                    {item.summary || item.description}
                  </Text>
                )}

                <Text style={[styles.metaText, { color: theme.muted }]}>
                  {asList(item.lessons).length} lessons - {asList(item.quotes).length} quotes
                </Text>

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
                    color="#8B5CF6"
                    onPress={() => togglePin(item)}
                  />

                  <ActionButton
                    icon="trash-outline"
                    label="Delete"
                    color="#FF4D67"
                    onPress={() => deleteBook(item.id)}
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
            <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>Book Editor</Text>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Book</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                  disabled={savingEdit}
                >
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Book title"
                placeholderTextColor={theme.muted}
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                value={editAuthor}
                onChangeText={setEditAuthor}
                placeholder="Author"
                placeholderTextColor={theme.muted}
              />

              <TouchableOpacity
                style={[styles.editCoverPicker, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                onPress={pickEditCoverImage}
                activeOpacity={0.86}
              >
                {editCoverImageUri || editCoverImage ? (
                  <Image
                    source={{ uri: editCoverImageUri || editCoverImage }}
                    style={styles.editCoverPreview}
                  />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={30} color="#8B5CF6" />
                    <Text style={[styles.editCoverTitle, { color: theme.text }]}>
                      Upload cover image
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={[styles.bioInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder="Summary"
                placeholderTextColor={theme.muted}
                multiline
              />

              <TextInput
                style={[styles.listInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                value={editLessonsText}
                onChangeText={setEditLessonsText}
                placeholder="Key lessons - one per line"
                placeholderTextColor={theme.muted}
                multiline
              />

              <TextInput
                style={[styles.listInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                value={editQuotesText}
                onChangeText={setEditQuotesText}
                placeholder="Quotes - one per line"
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
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
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

function SummaryCard({ label, value }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.summaryNumber, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={17} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
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
    backgroundColor: '#6D5BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  uploadShortcut: {
    backgroundColor: '#6D5BFF',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  uploadShortcutText: {
    color: '#fff',
    fontWeight: '900',
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

  bookCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },

  bookCover: {
    width: 72,
    height: 106,
    borderRadius: 12,
    backgroundColor: '#6D5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  bookCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  bookBody: {
    flex: 1,
  },

  bookTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  bookTitle: {
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },

  description: {
    marginTop: 8,
    lineHeight: 20,
  },

  metaText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
  },

  pinnedBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  pinnedText: {
    color: '#fff',
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
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  modalEyebrow: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  modalTitle: {
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

  input: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
  },

  bioInput: {
    padding: 15,
    borderRadius: 14,
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 10,
  },

  editCoverPicker: {
    minHeight: 190,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 14,
  },

  editCoverPreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },

  editCoverTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },

  listInput: {
    padding: 15,
    borderRadius: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 10,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },

  saveBtn: {
    backgroundColor: '#6D5BFF',
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
    color: '#fff',
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
