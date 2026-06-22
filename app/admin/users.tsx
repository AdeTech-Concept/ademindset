import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://ademindset.onrender.com';

const readApiError = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
};

export default function UsersScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});

  const safeReplace = useCallback((href: '/login' | '/(tabs)') => {
    setTimeout(() => {
      router.replace(href);
    }, 0);
  }, [router]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const user = auth.currentUser;

    if (!user) {
      safeReplace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      showAppAlert('Access denied');
      safeReplace('/(tabs)');
      return;
    }

    fetchUsers();
  }, [rootNavigationState?.key, router, safeReplace]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const data = querySnapshot.docs.map(userDoc => ({
        id: userDoc.id,
        ...userDoc.data(),
      }));
      const counts: Record<string, number> = {};

      try {
        const messagesSnapshot = await getDocs(collection(db, 'supportMessages'));

        messagesSnapshot.docs.forEach(messageDoc => {
          const userId = messageDoc.data().userId;

          if (userId) {
            counts[userId] = (counts[userId] || 0) + 1;
          }
        });
      } catch (messageError) {
        console.log('Could not load user message counts:', messageError);
      }

      setUsers(data);
      setMessageCounts(counts);
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userItem: any) => {
    try {
      await updateDoc(doc(db, 'users', userItem.id), {
        banned: !userItem.banned,
      });

      setUsers(prev =>
        prev.map(user =>
          user.id === userItem.id
            ? { ...user, banned: !user.banned }
            : user
        )
      );
    } catch (error) {
      console.log(error);
      showAppAlert('Error', 'Could not update this user.');
    }
  };

  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error('Missing admin token');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const deleteUser = async (userItem: any) => {
    const currentUser = auth.currentUser;

    if (currentUser?.uid === userItem.id) {
      showAppAlert('Not allowed', 'You cannot delete your own admin account here.');
      return;
    }

    try {
      setBusyUserId(userItem.id);

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userItem.id}`,
        {
          method: 'DELETE',
          headers: await getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, 'Could not delete this user.')
        );
      }

      setUsers(prev => prev.filter(user => user.id !== userItem.id));
      showAppAlert('Deleted', 'User deleted successfully.');
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Error',
        error instanceof Error ? error.message : 'Could not delete this user.'
      );
    } finally {
      setBusyUserId('');
    }
  };

  const openPasswordModal = (userItem: any) => {
    setPasswordUser(userItem);
    setNewPassword('');
  };

  const openUserChat = (userItem: any) => {
    router.push({
      pathname: '/admin/support',
      params: {
        userId: userItem.id,
        userName: userItem.name || userItem.email || 'User',
      },
    } as any);
  };

  const emailUserPassword = async (email: string, password: string) => {
    const subject = encodeURIComponent('Your Vidia password has been reset');
    const body = encodeURIComponent(
      `Hello,\n\nYour Vidia password has been reset by the admin.\n\nNew password: ${password}\n\nPlease log in and change it from your profile.\n\nVIDIA Admin`
    );

    await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const changeUserPassword = async () => {
    if (!passwordUser) return;

    if (newPassword.length < 6) {
      showAppAlert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setBusyUserId(passwordUser.id);

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${passwordUser.id}/password`,
        {
          method: 'PATCH',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ password: newPassword }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, 'Could not change this user password.')
        );
      }

      const changedPassword = newPassword;
      const changedUserEmail = passwordUser.email;

      setPasswordUser(null);
      setNewPassword('');
      showAppAlert('Updated', 'Password changed successfully.', [
        { text: 'Close' },
        {
          text: 'Email User',
          onPress: () => emailUserPassword(changedUserEmail, changedPassword),
        },
      ]);
    } catch (error) {
      console.log(error);
      showAppAlert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Could not change this user password.'
      );
    } finally {
      setBusyUserId('');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const activeUsers = users.filter(user => !user.banned).length;
  const bannedUsers = users.length - activeUsers;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={26} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Community</Text>
          <Text style={styles.title}>Manage Users</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeUsers}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{bannedUsers}</Text>
          <Text style={styles.statLabel}>Banned</Text>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={34} color="#777" />
            <Text style={styles.emptyTitle}>No users yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {item.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || 'No Name'}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    item.banned ? styles.bannedBadge : styles.activeBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      !item.banned && styles.activeText,
                    ]}
                  >
                    {item.banned ? 'Banned' : 'Active'}
                  </Text>
                </View>
              </View>

              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>

              <View style={styles.miniStats}>
                <View style={styles.miniStat}>
                  <Ionicons name="heart" size={15} color="#FF4D67" />
                  <Text style={styles.miniStatText}>
                    {item.likedPosts?.length || 0}
                  </Text>
                </View>

                <View style={styles.miniStat}>
                  <Ionicons name="bookmark" size={15} color="#FFD166" />
                  <Text style={styles.miniStatText}>
                    {item.savedPosts?.length || 0}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.chatBubble}
                  onPress={() => openUserChat(item)}
                >
                  <Ionicons name="chatbubble-ellipses" size={15} color="#7CFFB2" />
                  <Text style={styles.chatBubbleText}>
                    {messageCounts[item.id] || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  item.banned ? styles.unbanBtn : styles.banBtn,
                ]}
                onPress={() => toggleBan(item)}
              >
                <Ionicons
                  name={item.banned ? 'checkmark-circle-outline' : 'ban-outline'}
                  size={17}
                  color="#fff"
                />
                <Text style={styles.actionText}>
                  {item.banned ? 'Unban User' : 'Ban User'}
                </Text>
              </TouchableOpacity>

              <View style={styles.adminActions}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.chatActionBtn]}
                  onPress={() => openUserChat(item)}
                  disabled={busyUserId === item.id}
                >
                  <View style={styles.chatActionIconWrap}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#121212" />
                    <View style={styles.chatCountBadge}>
                      <Text style={styles.chatCountBadgeText}>
                        {messageCounts[item.id] || 0}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.secondaryActionText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.passwordActionBtn]}
                  onPress={() => openPasswordModal(item)}
                  disabled={busyUserId === item.id}
                >
                  <Ionicons name="key-outline" size={16} color="#121212" />
                  <Text style={styles.secondaryActionText}>Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.deleteActionBtn]}
                  onPress={() => deleteUser(item)}
                  disabled={busyUserId === item.id}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.deleteActionText}>
                    {busyUserId === item.id ? 'Working...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Modal
        visible={!!passwordUser}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>
              Set a new password for {passwordUser?.email || 'this user'}.
            </Text>

            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#888"
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPasswordUser(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savePasswordBtn}
                onPress={changeUserPassword}
                disabled={busyUserId === passwordUser?.id}
              >
                <Text style={styles.savePasswordText}>
                  {busyUserId === passwordUser?.id ? 'Saving...' : 'Save'}
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
    paddingTop: 64,
    paddingHorizontal: 20,
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

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 14,
  },

  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  statLabel: {
    color: '#888',
    marginTop: 3,
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 34,
  },

  userCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 15,
    marginBottom: 14,
    flexDirection: 'row',
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginRight: 14,
  },

  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  userInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  name: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    flex: 1,
  },

  email: {
    color: '#888',
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  activeBadge: {
    backgroundColor: '#7CFFB2',
  },

  bannedBadge: {
    backgroundColor: '#FF4D67',
  },

  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  activeText: {
    color: '#121212',
  },

  miniStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#242424',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  miniStatText: {
    color: '#fff',
    fontWeight: '800',
  },

  chatBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#183322',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#28583A',
  },

  chatBubbleText: {
    color: '#7CFFB2',
    fontWeight: '900',
  },

  actionBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  banBtn: {
    backgroundColor: '#FF4D67',
  },

  unbanBtn: {
    backgroundColor: '#2F80ED',
  },

  actionText: {
    color: '#fff',
    fontWeight: '900',
  },

  adminActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 9,
  },

  secondaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  passwordActionBtn: {
    backgroundColor: '#7CFFB2',
  },

  chatActionBtn: {
    backgroundColor: '#FFD166',
  },

  chatActionIconWrap: {
    position: 'relative',
  },

  chatCountBadge: {
    position: 'absolute',
    top: -10,
    right: -12,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FF4D67',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  chatCountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  deleteActionBtn: {
    backgroundColor: '#B42318',
  },

  secondaryActionText: {
    color: '#121212',
    fontWeight: '900',
  },

  deleteActionText: {
    color: '#fff',
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: 22,
  },

  modalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 18,
  },

  modalTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: '#aaa',
    marginTop: 7,
    marginBottom: 16,
    lineHeight: 20,
  },

  passwordInput: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#292929',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  cancelText: {
    color: '#fff',
    fontWeight: '900',
  },

  savePasswordBtn: {
    flex: 1,
    backgroundColor: '#7CFFB2',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
  },

  savePasswordText: {
    color: '#121212',
    fontWeight: '900',
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
});
