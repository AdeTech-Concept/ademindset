import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { app, db } from '../firebaseConfig';
export default function AdminScreen() {
  const router = useRouter();
  const auth = getAuth(app);
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const [posts, setPosts] = useState([]);
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    const adminEmail = 'josh0mathew@gmail.com';

    // BLOCK NON-ADMINS
    if (user.email !== adminEmail) {
      alert('Access denied');
      router.replace('/(tabs)');
      return;
    }

  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);
  
  const fetchPosts = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, 'posts')
      );

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);

    } catch (error) {
      console.log(error);
    }
  };

  /*{ Edit Function} */
  const startEdit = (post) => {
    setEditingPost(post.id);
    setEditTitle(post.title);
    setEditCaption(post.caption);
    setModalVisible(true);
  };

  /*{ Save Function} */
  const saveEdit = async (postId) => {
    try {

      await updateDoc(
        doc(db, 'posts', postId),
        {
          title: editTitle,
          caption: editCaption,
        }
      );

      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                title: editTitle,
                caption: editCaption,
              }
            : post
        )
      );

      setEditingPost(null);
      setModalVisible(false);
      alert('Post updated 🔥');

    } catch (error) {
      console.log(error);
    }
};

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const deletePost = async (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to remove this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'posts', postId)
              );

              setPosts(prev =>
                prev.filter(post => post.id !== postId)
              );

            } catch (error) {
              console.log(error);
            }
          },
        },
      ]
    );
  };

  const uploadPost = async () => {
   
    if (!image || !title || !caption) {
      return alert('Fill all fields');
    }
    
    setUploading(true);
    try {
      // CREATE FORM DATA
      const formData = new FormData();

      formData.append('file', {
        uri: image,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);

      formData.append(
        'upload_preset',
        'ademindset'
      );

      // UPLOAD TO CLOUDINARY
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dz4gz8kvc/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      // SAVE TO FIRESTORE
      await addDoc(collection(db, 'posts'), {
        image_url: data.secure_url,
        title,
        userId: auth.currentUser.uid,
        caption,
        createdAt: new Date(),
      });

      alert('Post uploaded 🔥');
      fetchPosts();

      setImage(null);
      setTitle('');
      setCaption('');

      setUploading(false);

    } catch (error) {
      console.log(error);

      setUploading(false);
    }
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Upload</Text>

      <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
        <Text style={{ color: '#000' }}>Pick Image</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.preview} resizeMode="contain" />
      )}

      <TextInput
        placeholder="Title..."
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
        numberOfLines={4}
      />

      <TouchableOpacity
        style={styles.uploadBtn}
        onPress={uploadPost}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ color: '#000' }}>
            Upload
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.manageTitle}>
        Manage Posts
      </Text>
      <ScrollView style={{ marginTop: 20 }}>
        {posts.length === 0 && (
          <Text style={{ color: '#888' }}>
            No posts uploaded yet.
          </Text>
        )}
        {posts.map((item) => (
          <View key={item.id} style={styles.postCard}>

            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={styles.postImage}
              />
            )}

            <Text style={styles.postTitle}>
              {item.title}
            </Text>

            <View style={styles.actionRow}>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => startEdit(item)}
              >
                <Text style={styles.editText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deletePost(item.id)}
              >
                <Text style={styles.deleteText}>
                  Delete
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        ))}
      </ScrollView>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalContent}>

            <Text style={styles.modalTitle}>
              Edit Post
            </Text>

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

                {/* SAVE */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() =>
                    saveEdit(editingPost)
                  }
                >
                  <Text style={styles.saveText}>
                    Save
                  </Text>
                </TouchableOpacity>

                {/* CANCEL */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

              </View>

          </View>

        </View>

      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    marginTop: 50,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  pickBtn: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    resizeMode: 'contain', //KEY FIX
    },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadBtn: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  textArea: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    height: 120,
    textAlignVertical: 'top', // 🔥 important (Android fix)
    },

    manageTitle: {
      color: '#fff',
      fontSize: 20,
      marginTop: 30,
      marginBottom: 15,
      fontWeight: 'bold',
    },

    postCard: {
      backgroundColor: '#1E1E1E',
      padding: 10,
      borderRadius: 12,
      marginBottom: 15,
    },

    postImage: {
      width: '100%',
      height: 180,
      borderRadius: 10,
      marginBottom: 10,
    },

    postTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    deleteBtn: {
      backgroundColor: '#FF3B30',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },

    deleteText: {
      color: '#fff',
      fontWeight: 'bold',
    },

    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    editBtn: {
      backgroundColor: '#007AFF',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },

    editText: {
      color: '#fff',
      fontWeight: 'bold',
    },

    bioInput: {
      backgroundColor: '#1E1E1E',
      color: '#fff',
      padding: 15,
      borderRadius: 10,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: 10,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      padding: 20,
    },

    modalContent: {
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      padding: 20,
    },

    modalTitle: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 20,
    },

    saveText: {
      color: '#fff',
      fontWeight: 'bold',
    },

    cancelText: {
      color: '#fff',
      fontWeight: 'bold',
    },

    saveBtn: {
      backgroundColor: '#007AFF',
      padding: 15,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },

    cancelBtn: {
      backgroundColor: '#333',
      padding: 15,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },

    modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});

