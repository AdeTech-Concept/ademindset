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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';
import { useThemePreference } from '../../contexts/theme-preference';
import { getAppTheme } from '../../constants/app-theme';

const auth = getAuth(app);
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://ademindset.onrender.com';

export default function ProfileScreen() {
  const router = useRouter();
  const { themePreference, setThemePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
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
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchUser = async () => {
        setLoading(true);

        try {
          const user = auth.currentUser;

          if (!user) {
            setUserData(null);
            setLoading(false);
            router.replace('/login');
            return;
          }

          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          const data = userSnap.exists() ? userSnap.data() : {};

          setUserData(data);
          setName(data.name || '');
          setBio(data.bio || '');
          setAvatar(data.avatar || '');

        } catch (error) {
          console.log(error);
          showAppAlert('Error', 'Could not load your profile.');
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }, [router])
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

      showAppAlert('Profile updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update profile.');
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
      showAppAlert('Error', 'Could not pick an image.');
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

      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || 'Image upload failed');
      }

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

      showAppAlert('Profile picture updated');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not upload profile picture.');
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

      showAppAlert('Reset done');
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not reset likes and saved posts.');
    }
  };

  const handleChangePassword = async () => {
    try {
      const user = auth.currentUser;

      if (!user?.email) {
        showAppAlert('Error', 'No signed-in user found.');
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
    }
  };

  const formatDeletionDate = () => {
    const scheduledFor = userData?.accountDeletionScheduledFor;

    if (!scheduledFor) {
      return '';
    }

    const date =
      typeof scheduledFor.toDate === 'function'
        ? scheduledFor.toDate()
        : new Date(scheduledFor);

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const requestAccountDeletion = async () => {
    showAppAlert(
      'Delete account in 30 days?',
      'Your account will be scheduled for deletion. After 30 days, your profile and sign-in account can be permanently deleted. This action is serious.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule Deletion',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;

              if (!user) {
                showAppAlert('Error', 'No signed-in user found.');
                return;
              }

              setRequestingDeletion(true);

              const token = await user.getIdToken();
              const response = await fetch(
                `${API_BASE_URL}/users/account-deletion/request`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Account deletion request failed');
              }

              const scheduledFor = new Date(data.scheduledFor);

              setUserData((prev: any) => ({
                ...prev,
                accountDeletionRequested: true,
                accountDeletionScheduledFor: scheduledFor,
              }));

              showAppAlert(
                'Deletion scheduled',
                `Your account is scheduled for deletion on ${scheduledFor.toLocaleDateString()}.`
              );
            } catch (error) {
              console.log(error);
              showAppAlert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Could not schedule account deletion.'
              );
            } finally {
              setRequestingDeletion(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const likedCount = userData?.likedPosts?.length || 0;
  const savedCount = userData?.savedPosts?.length || 0;
  const streakCount = userData?.streakCount || 0;
  const longestStreak = userData?.longestStreak || 0;
  const readCount = userData?.readCount || userData?.readPosts?.length || 0;
  const booksReadCount = userData?.booksReadCount || userData?.openedBooks?.length || 0;
  const quizzesCompleted = userData?.quizzesCompleted || 0;
  const aiConversationCount = userData?.aiConversationCount || 0;
  const points =
    userData?.points ||
    (readCount * 20) +
    (booksReadCount * 30) +
    (quizzesCompleted * 50) +
    (aiConversationCount * 10);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.profileCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
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
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={theme.muted}
            />

            <TextInput
              style={[
                styles.bioInput,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a bio..."
              placeholderTextColor={theme.muted}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
              <Text style={styles.saveText}>Save Profile</Text>
            </TouchableOpacity>

            <View
              style={[
                styles.passwordCard,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="lock-closed-outline" size={20} color="#7CFFB2" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={theme.muted}
                secureTextEntry
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={theme.muted}
                secureTextEntry
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.muted}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.passwordBtn, changingPassword && styles.disabledBtn]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.passwordText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.deleteAccountCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
                <Text style={styles.sectionTitle}>Delete Account</Text>
              </View>

              <Text style={styles.deleteWarning}>
                {userData?.accountDeletionRequested
                  ? `Deletion scheduled for ${formatDeletionDate() || '30 days from your request'}.`
                  : 'Your account will be scheduled for permanent deletion after 30 days.'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.deleteAccountBtn,
                  (requestingDeletion || userData?.accountDeletionRequested) &&
                    styles.disabledBtn,
                ]}
                onPress={requestAccountDeletion}
                disabled={requestingDeletion || userData?.accountDeletionRequested}
              >
                {requestingDeletion ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.deleteAccountText}>
                      {userData?.accountDeletionRequested
                        ? 'Deletion Scheduled'
                        : 'Request Account Deletion'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.name, { color: theme.text }]}>{userData?.name || 'No name'}</Text>
            <Text style={[styles.email, { color: theme.muted }]}>{userData?.email}</Text>
            <Text style={[styles.bio, { color: theme.subtle }]}>{userData?.bio || 'No bio yet'}</Text>

            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: theme.raised }]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View
        style={[
          styles.themeCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="contrast-outline" size={20} color="#7CFFB2" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>
        </View>

        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              { backgroundColor: theme.raised, borderColor: theme.border },
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
                { color: theme.text },
                themePreference === 'dark' && styles.themeOptionTextActive,
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              { backgroundColor: theme.raised, borderColor: theme.border },
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
                { color: theme.text },
                themePreference === 'light' && styles.themeOptionTextActive,
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.progressCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="flame-outline" size={20} color="#7CFFB2" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Progress</Text>
        </View>

        <View style={styles.progressGrid}>
          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{streakCount}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Day streak</Text>
          </View>

          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{longestStreak}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Best streak</Text>
          </View>

          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{readCount}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Posts read</Text>
          </View>
        </View>

        <View style={styles.progressGridSecondary}>
          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{booksReadCount}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Books opened</Text>
          </View>

          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{quizzesCompleted}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Quizzes done</Text>
          </View>

          <View style={[styles.progressItem, { backgroundColor: theme.raised }]}>
            <Text style={[styles.progressNumber, { color: theme.text }]}>{points}</Text>
            <Text style={[styles.progressLabel, { color: theme.muted }]}>Points</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.libraryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="albums-outline" size={20} color="#7CFFB2" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Likes & Saved</Text>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[
              styles.statBox,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
            onPress={() => router.push('/(tabs)/likes')}
          >
            <Ionicons name="heart" size={22} color="#FF4D67" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{likedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Likes</Text>
            <View style={styles.statOpenRow}>
              <Text style={[styles.statOpenText, { color: theme.muted }]}>View liked posts</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.muted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statBox,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
            onPress={() => router.push('/(tabs)/saved')}
          >
            <Ionicons name="bookmark" size={22} color="#FFD166" />
            <Text style={[styles.statNumber, { color: theme.text }]}>{savedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Saved</Text>
            <View style={styles.statOpenRow}>
              <Text style={[styles.statOpenText, { color: theme.muted }]}>Open library</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.muted} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={resetLikesAndSaved}>
          <Ionicons name="refresh-outline" size={18} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset Likes & Saved</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.supportCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color="#7CFFB2" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Chat</Text>
        </View>

        <Text style={[styles.supportIntro, { color: theme.muted }]}>
          Open a private chat with the admin to lay a complaint or ask questions.
        </Text>

        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => router.push('/(tabs)/admin-chat')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#121212" />
          <Text style={styles.supportBtnText}>Chat Admin</Text>
        </TouchableOpacity>
      </View>

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

  statOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 10,
  },

  statOpenText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '800',
  },

  themeCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
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

  progressCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 14,
  },

  progressGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  progressGridSecondary: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  progressItem: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },

  progressNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  progressLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },

  passwordCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 14,
  },

  libraryCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 14,
  },

  supportCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  passwordBtn: {
    backgroundColor: '#7CFFB2',
    padding: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },

  supportIntro: {
    lineHeight: 20,
    marginBottom: 14,
  },

  supportBtn: {
    backgroundColor: '#7CFFB2',
    borderRadius: 14,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  supportBtnText: {
    color: '#121212',
    fontWeight: '900',
  },

  disabledBtn: {
    opacity: 0.7,
  },

  passwordText: {
    color: '#121212',
    fontWeight: '900',
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

  deleteAccountCard: {
    width: '100%',
    backgroundColor: '#241A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A2424',
    padding: 16,
    marginBottom: 14,
  },

  deleteWarning: {
    color: '#F5B8B8',
    lineHeight: 20,
    marginBottom: 14,
  },

  deleteAccountBtn: {
    backgroundColor: '#B42318',
    borderRadius: 14,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  deleteAccountText: {
    color: '#fff',
    fontWeight: '900',
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
