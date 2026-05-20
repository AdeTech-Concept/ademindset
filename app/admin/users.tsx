import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';

const adminEmail = 'josh0mathew@gmail.com';

export default function UsersScreen() {
  const router = useRouter();
  const auth = getAuth(app);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const data = querySnapshot.docs.map(userDoc => ({
        id: userDoc.id,
        ...userDoc.data(),
      }));

      setUsers(data);
    } catch (error) {
      console.log(error);
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
            </View>
          </View>
        )}
      />
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
