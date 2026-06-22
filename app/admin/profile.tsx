import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
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
import { useThemePreference } from '../../contexts/theme-preference';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { themePreference, setThemePreference } = useThemePreference();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [analytics, setAnalytics] = useState<any>({
    totalPosts: 0,
    totalUsers: 0,
    totalComments: 0,
    totalLikes: 0,
    mostLikedPost: null,
    mostCommentedPost: null,
  });

  const fetchAnalytics = useCallback(async () => {
    const [postsSnapshot, usersSnapshot, commentsSnapshot] =
      await Promise.all([
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'comments')),
      ]);

    const posts = postsSnapshot.docs.map(postDoc => ({
      id: postDoc.id,
      title: postDoc.data().title || 'Untitled post',
      ...postDoc.data(),
    }));

    const likeCounts: Record<string, number> = {};

    usersSnapshot.docs.forEach(userDoc => {
      const likedPosts = userDoc.data().likedPosts || [];

      likedPosts.forEach((postId: string) => {
        likeCounts[postId] = (likeCounts[postId] || 0) + 1;
      });
    });

    const commentCounts: Record<string, number> = {};

    commentsSnapshot.docs.forEach(commentDoc => {
      const postId = commentDoc.data().postId;

      if (postId) {
        commentCounts[postId] = (commentCounts[postId] || 0) + 1;
      }
    });

    const postsWithStats = posts.map(post => ({
      ...post,
      likeCount: likeCounts[post.id] || 0,
      commentCount: commentCounts[post.id] || 0,
    }));

    setAnalytics({
      totalPosts: postsSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalComments: commentsSnapshot.size,
      totalLikes: Object.values(likeCounts).reduce(
        (total, count) => total + count,
        0
      ),
      mostLikedPost:
        postsWithStats
          .slice()
          .sort((a, b) => b.likeCount - a.likeCount)[0] || null,
      mostCommentedPost:
        postsWithStats
          .slice()
          .sort((a, b) => b.commentCount - a.commentCount)[0] || null,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchAdminProfile = async () => {
        setLoading(true);

        try {
          const user = auth.currentUser;

          if (!user) {
            setUserData(null);
            router.replace('/login');
            return;
          }

          if (user.email !== adminEmail) {
            showAppAlert('Access denied', 'Only the admin can open this page.');
            router.replace('/(tabs)');
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

          await fetchAnalytics();
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      };

      fetchAdminProfile();
    }, [fetchAnalytics, router])
  );

  const saveProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      await setDoc(
        doc(db, 'users', user.uid),
        { name, bio },
        { merge: true }
      );

      setUserData((prev: any) => ({ ...prev, name, bio }));
      setEditing(false);

      showAppAlert('Success', 'Profile updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update profile');
    }
  };

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showAppAlert(
          'Permission needed',
          'Please allow photo access to update your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not pick image');
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
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (!data.secure_url) {
        showAppAlert('Error', 'Image upload failed');
        return;
      }

      await setDoc(
        doc(db, 'users', user.uid),
        { avatar: data.secure_url },
        { merge: true }
      );

      setAvatar(data.secure_url);
      setUserData((prev: any) => ({ ...prev, avatar: data.secure_url }));

      showAppAlert('Success', 'Profile picture updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not upload profile picture');
    }
  };

  const handleChangePassword = async () => {
    try {
      const user = auth.currentUser;

      if (!user?.email) {
        showAppAlert('Error', 'No signed-in admin found.');
        return;
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        showAppAlert('Missing fields', 'Fill all password fields.');
        return;
      }

      if (newPassword.length < 6) {
        showAppAlert('Weak password', 'Password must be at least 6 characters.');
        return;
      }

      if (newPassword !== confirmPassword) {
        showAppAlert('Mismatch', 'New passwords do not match.');
        return;
      }

      setChangingPassword(true);

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showAppAlert('Success', 'Password changed successfully.');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not change password. Check the old password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    try {
      await setThemePreference(theme);
      setUserData((prev: any) => ({
        ...prev,
        themePreference: theme,
      }));
    } catch (error) {
      console.log('Theme update error:', error);
      showAppAlert('Error', 'Could not update theme.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not log out');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle-outline" size={28} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Admin Account</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
      </View>

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

            <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}>
              <Text style={styles.primaryText}>Save Profile</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>

        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              themePreference === 'dark' && styles.themeOptionActive,
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <Ionicons
              name="moon-outline"
              size={18}
              color={themePreference === 'dark' ? '#121212' : '#fff'}
            />
            <Text
              style={[
                styles.themeOptionText,
                themePreference === 'dark' && styles.themeOptionTextActive,
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              themePreference === 'light' && styles.themeOptionActive,
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <Ionicons
              name="sunny-outline"
              size={18}
              color={themePreference === 'light' ? '#121212' : '#fff'}
            />
            <Text
              style={[
                styles.themeOptionText,
                themePreference === 'light' && styles.themeOptionTextActive,
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics</Text>

        <View style={styles.analyticsGrid}>
          <Metric label="Posts" value={analytics.totalPosts} icon="images" />
          <Metric label="Users" value={analytics.totalUsers} icon="people" />
          <Metric label="Likes" value={analytics.totalLikes} icon="heart" />
          <Metric
            label="Comments"
            value={analytics.totalComments}
            icon="chatbubble"
          />
        </View>

        <Insight
          label="Most Liked Post"
          title={analytics.mostLikedPost?.title || 'No posts yet'}
          value={`${analytics.mostLikedPost?.likeCount || 0} likes`}
        />

        <Insight
          label="Most Commented Post"
          title={analytics.mostCommentedPost?.title || 'No comments yet'}
          value={`${analytics.mostCommentedPost?.commentCount || 0} comments`}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor="#888"
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor="#888"
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor="#888"
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primaryBtn, changingPassword && styles.disabledBtn]}
          onPress={handleChangePassword}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Text style={styles.primaryText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Metric({ label, value, icon }: any) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={20} color="#7CFFB2" />
      <Text style={styles.metricNumber}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Insight({ label, title, value }: any) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightMeta}>{value}</Text>
    </View>
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

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
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

  profileCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 22,
    alignItems: 'center',
    marginBottom: 22,
  },

  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#7CFFB2',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
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
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },

  email: {
    color: '#888',
    marginTop: 5,
    marginBottom: 14,
  },

  bio: {
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
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
    fontWeight: '900',
  },

  section: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },

  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  themeOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  themeOptionActive: {
    backgroundColor: '#7CFFB2',
    borderColor: '#7CFFB2',
  },

  themeOptionText: {
    color: '#fff',
    fontWeight: '900',
  },

  themeOptionTextActive: {
    color: '#121212',
  },

  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },

  metricCard: {
    width: '48%',
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 14,
  },

  metricNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 7,
  },

  metricLabel: {
    color: '#888',
    fontWeight: '800',
  },

  insightCard: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 15,
    marginTop: 10,
  },

  insightLabel: {
    color: '#888',
    fontWeight: '800',
    marginBottom: 6,
  },

  insightTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  insightMeta: {
    color: '#aaa',
    marginTop: 5,
  },

  input: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },

  bioInput: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    height: 110,
    textAlignVertical: 'top',
    marginBottom: 10,
  },

  primaryBtn: {
    backgroundColor: '#7CFFB2',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },

  disabledBtn: {
    opacity: 0.7,
  },

  primaryText: {
    color: '#121212',
    fontWeight: '900',
  },

  logoutBtn: {
    backgroundColor: '#FF4D67',
    padding: 15,
    borderRadius: 14,
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
