import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
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
import { app, db } from '../../firebaseConfig';

const adminEmail = 'josh0mathew@gmail.com';

export default function AdminUploadScreen() {
  const router = useRouter();
  const auth = getAuth(app);

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      alert('Access denied');
      router.replace('/(tabs)');
    }
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      setImages(result.assets.map(asset => asset.uri));
    }
  };

  const removeImage = (imageUri: string) => {
    setImages(prev => prev.filter(uri => uri !== imageUri));
  };

  const uploadToCloudinary = async (imageUri: string) => {
    const formData = new FormData();

    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'upload.jpg',
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

  const uploadPost = async () => {
    const user = auth.currentUser;

    if (!user) return;

    if (images.length === 0 || !title || !caption) {
      return alert('Select images and fill all fields');
    }

    setUploading(true);

    try {
      const uploadedUrls = await Promise.all(
        images.map(imageUri => uploadToCloudinary(imageUri))
      );

      await Promise.all(
        uploadedUrls.map((imageUrl, index) =>
          addDoc(collection(db, 'posts'), {
            image_url: imageUrl,
            title:
              uploadedUrls.length > 1
                ? `${title} ${index + 1}`
                : title,
            caption,
            userId: user.uid,
            pinned: false,
            createdAt: new Date(),
          })
        )
      );

      alert(`${uploadedUrls.length} post(s) uploaded`);

      setImages([]);
      setTitle('');
      setCaption('');
    } catch (error) {
      console.log(error);
      alert('Could not upload posts');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="cloud-upload-outline" size={26} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Admin Studio</Text>
          <Text style={styles.title}>Upload Posts</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.pickerCard} onPress={pickImages}>
        <Ionicons name="images-outline" size={34} color="#7CFFB2" />
        <Text style={styles.pickerTitle}>Select multiple pictures</Text>
        <Text style={styles.pickerText}>
          Choose up to 10 images for one batch upload.
        </Text>
      </TouchableOpacity>

      {images.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>
            Selected Pictures ({images.length})
          </Text>

          <View style={styles.previewGrid}>
            {images.map(imageUri => (
              <View key={imageUri} style={styles.previewTile}>
                <Image source={{ uri: imageUri }} style={styles.preview} />

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(imageUri)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.formCard}>
        <TextInput
          placeholder="Post title..."
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Write full content..."
          placeholderTextColor="#888"
          style={styles.textArea}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.disabledBtn]}
          onPress={uploadPost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color="#121212" />
              <Text style={styles.uploadText}>
                Upload {images.length || ''} Post{images.length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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

  pickerCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },

  pickerTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 12,
  },

  pickerText: {
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },

  previewSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  previewTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },

  preview: {
    width: '100%',
    height: '100%',
  },

  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  formCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
  },

  input: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
  },

  textArea: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 130,
    textAlignVertical: 'top',
  },

  uploadBtn: {
    backgroundColor: '#7CFFB2',
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

  uploadText: {
    color: '#121212',
    fontWeight: '900',
  },
});
