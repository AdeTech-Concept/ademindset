import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
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

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth(app);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchUser = async () => {
        setLoading(true);

        try {
          const user = auth.currentUser;

          if (!user) {
            setUserData(null);
            setLoading(false);
            return;
          }

          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();

            setUserData(data);
            setName(data.name || '');
            setBio(data.bio || '');
            setAvatar(data.avatar || '');
          }
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }, [])
  );

  const saveProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      await setDoc(
        doc(db, 'users', user.uid),
        {
          name,
          bio,
        },
        { merge: true }
      );

      setUserData((prev: any) => ({
        ...prev,
        name,
        bio,
      }));

      setEditing(false);

      alert('Profile updated');
    } catch (error) {
      console.log(error);
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const uploadAvatar = async (imageUri: any) => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      const formData = new FormData();

      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
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

      await setDoc(
        doc(db, 'users', user.uid),
        { avatar: data.secure_url },
        { merge: true }
      );

      setAvatar(data.secure_url);
      setUserData((prev: any) => ({
        ...prev,
        avatar: data.secure_url,
      }));

      alert('Profile picture updated');
    } catch (error) {
      console.log(error);
    }
  };

  const resetLikesAndSaved = async () => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      await setDoc(
        doc(db, 'users', user.uid),
        {
          likedPosts: [],
          savedPosts: [],
        },
        { merge: true }
      );

      setUserData((prev: any) => ({
        ...prev,
        likedPosts: [],
        savedPosts: [],
      }));

      alert('Reset done');
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const likedCount = userData?.likedPosts?.length || 0;
  const savedCount = userData?.savedPosts?.length || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.avatar} onPress={pickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {userData?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}

          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#121212" />
          </View>
        </TouchableOpacity>

        {editing ? (
          <>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#888"
            />

            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a bio..."
              placeholderTextColor="#888"
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
              <Text style={styles.saveText}>Save Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.name}>{userData?.name || 'No name'}</Text>
            <Text style={styles.email}>{userData?.email}</Text>
            <Text style={styles.bio}>{userData?.bio || 'No bio yet'}</Text>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="heart" size={22} color="#FF4D67" />
          <Text style={styles.statNumber}>{likedCount}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="bookmark" size={22} color="#FFD166" />
          <Text style={styles.statNumber}>{savedCount}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={resetLikesAndSaved}>
        <Ionicons name="refresh-outline" size={18} color="#FF6B6B" />
        <Text style={styles.resetText}>Reset Likes & Saved</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },

  profileCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 22,
    alignItems: 'center',
    marginBottom: 18,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#7CFFB2',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },

  avatarText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
  },

  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7CFFB2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  name: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
  },

  email: {
    color: '#888',
    marginTop: 5,
    marginBottom: 18,
  },

  bio: {
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#292929',
  },

  bioInput: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#292929',
  },

  editBtn: {
    backgroundColor: '#252525',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  editText: {
    color: '#fff',
    fontWeight: '800',
  },

  saveBtn: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },

  saveText: {
    color: '#000',
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    width: '100%',
  },

  statBox: {
    backgroundColor: '#1E1E1E',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#292929',
  },

  statNumber: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
  },

  statLabel: {
    color: '#888',
    marginTop: 4,
  },

  resetBtn: {
    width: '100%',
    backgroundColor: '#241A1A',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  resetText: {
    color: '#FF6B6B',
    fontWeight: '800',
  },

  logoutBtn: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '900',
  },
});
