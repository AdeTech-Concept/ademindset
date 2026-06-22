import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRootNavigationState, useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

const splitList = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

export default function AdminUploadBooksScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [coverImageUri, setCoverImageUri] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [summary, setSummary] = useState('');
  const [lessonsText, setLessonsText] = useState('');
  const [quotesText, setQuotesText] = useState('');
  const [saving, setSaving] = useState(false);
  const lessons = useMemo(() => splitList(lessonsText), [lessonsText]);
  const quotes = useMemo(() => splitList(quotesText), [quotesText]);

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
      }
    });

    return unsubscribe;
  }, [router, rootNavigationState?.key]);

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setCoverImageUri(result.assets[0].uri);
    }
  };

  const uploadCoverToCloudinary = async () => {
    if (!coverImageUri) return '';

    const formData = new FormData();

    formData.append('file', {
      uri: coverImageUri,
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

  const addBook = async () => {
    const user = auth.currentUser;

    if (!user) return;

    if (!title.trim() || !author.trim() || !summary.trim()) {
      showAppAlert('Book title, author, and summary are required.');
      return;
    }

    if (lessons.length === 0) {
      showAppAlert('Add at least one key lesson.');
      return;
    }

    setSaving(true);

    try {
      const createdAt = new Date();
      const coverImage = await uploadCoverToCloudinary();

      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        author: author.trim(),
        coverImage,
        summary: summary.trim(),
        lessons,
        quotes,
        userId: user.uid,
        uploadedBy: 'admin',
        pinned: false,
        createdAt,
        updatedAt: createdAt,
      });

      showAppAlert('Book added');
      setCoverImageUri('');
      setTitle('');
      setAuthor('');
      setSummary('');
      setLessonsText('');
      setQuotesText('');
      router.push('/admin/books');
    } catch (error) {
      console.log('Book add error:', error);
      showAppAlert('Could not add book.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={26} color="#fff" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Admin Library</Text>
          <Text style={[styles.title, { color: theme.text }]}>Add Book</Text>
        </View>
      </View>

      <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.coverPicker, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={pickCoverImage}
          activeOpacity={0.86}
        >
          {coverImageUri ? (
            <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
          ) : (
            <>
              <Ionicons name="image-outline" size={34} color="#8B5CF6" />
              <Text style={[styles.coverPickerTitle, { color: theme.text }]}>
                Upload cover image
              </Text>
              <Text style={[styles.coverPickerText, { color: theme.muted }]}>
                Choose a portrait image for this book.
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder="Book title"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Author"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={author}
          onChangeText={setAuthor}
        />

        <TextInput
          placeholder="Summary"
          placeholderTextColor={theme.muted}
          style={[styles.textArea, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={summary}
          onChangeText={setSummary}
          multiline
        />

        <TextInput
          placeholder="Key lessons - one per line"
          placeholderTextColor={theme.muted}
          style={[styles.listArea, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={lessonsText}
          onChangeText={setLessonsText}
          multiline
        />

        <TextInput
          placeholder="Quotes - one per line"
          placeholderTextColor={theme.muted}
          style={[styles.listArea, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={quotesText}
          onChangeText={setQuotesText}
          multiline
        />

        <View style={styles.previewRow}>
          <InfoPill icon="bulb-outline" label={`${lessons.length} lessons`} />
          <InfoPill icon="chatbox-ellipses-outline" label={`${quotes.length} quotes`} />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={addBook}
          disabled={saving}
          activeOpacity={0.86}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveText}>Add Book</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoPill({ icon, label }: any) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={15} color="#fff" />
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  input: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
  },

  coverPicker: {
    minHeight: 190,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 16,
  },

  coverPreview: {
    width: '100%',
    height: 260,
    borderRadius: 14,
  },

  coverPickerTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },

  coverPickerText: {
    marginTop: 5,
    textAlign: 'center',
  },

  textArea: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 150,
    textAlignVertical: 'top',
  },

  listArea: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  previewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  infoPill: {
    backgroundColor: '#8B5CF6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  infoPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  saveBtn: {
    backgroundColor: '#6D5BFF',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  disabledBtn: {
    opacity: 0.7,
  },

  saveText: {
    color: '#fff',
    fontWeight: '900',
  },
});
