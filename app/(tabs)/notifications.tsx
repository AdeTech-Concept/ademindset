import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setNotifications(data);
        setLoading(false);
      },
      error => {
        console.log(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const openPost = (postId: string) => {
    if (!postId) return;

    router.push(`/post/${postId}`);
  };

  const renderNotification = ({ item }: any) => {
    const isLike = item.type === 'like';

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.card}
        onPress={() => openPost(item.postId)}
      >
        <View
          style={[
            styles.iconBubble,
            { backgroundColor: isLike ? '#FF4D67' : '#2F80ED' },
          ]}
        >
          <Ionicons
            name={isLike ? 'heart' : 'chatbubble'}
            size={18}
            color="#fff"
          />
        </View>

        <View style={styles.notificationCopy}>
          <Text style={styles.text}>
            <Text style={styles.bold}>
              {item.senderName || 'Someone'}
            </Text>
            {isLike ? ' liked your post' : ' commented on your post'}
          </Text>

          <Text style={styles.meta}>Tap to view the post</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={24} color="#121212" />
        </View>

        <View>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subTitle}>
            Likes and comments around your posts.
          </Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={34} color="#777" />
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.emptyText}>
              You will see likes and comments here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 58,
    paddingHorizontal: 20,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },

  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7CFFB2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  title: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
  },

  subTitle: {
    color: '#888',
    marginTop: 2,
  },

  listContent: {
    paddingBottom: 24,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 12,
  },

  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  notificationCopy: {
    flex: 1,
  },

  text: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },

  bold: {
    fontWeight: '900',
  },

  meta: {
    color: '#888',
    marginTop: 5,
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292929',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
  },
});
