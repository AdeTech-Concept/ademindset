import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, QuerySnapshot } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

const emptySnapshot = {
  docs: [],
  size: 0,
} as unknown as QuerySnapshot;

export default function AdminDashboard() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    totalPosts: 0,
    totalUsers: 0,
    totalLikes: 0,
    totalComments: 0,
    totalBooks: 0,
    activeUsers: 0,
    completedQuizzes: 0,
    aiUsage: 0,
    supportMessages: 0,
    passwordRequests: 0,
    mostOpenedBook: null,
    mostLikedPost: null,
    mostCommentedPost: null,
    recentPosts: [],
  });

  useFocusEffect(
    useCallback(() => {
      const loadDashboard = async () => {
        try {
          const user = auth.currentUser;

          if (!user) {
            router.replace('/login');
            return;
          }

          if (user.email !== adminEmail) {
            showAppAlert('Access denied');
            router.replace('/(tabs)');
            return;
          }

          const safeGetDocs = async (collectionName: string) => {
            try {
              return await getDocs(collection(db, collectionName));
            } catch (error) {
              console.log(`${collectionName} dashboard load error:`, error);
              return emptySnapshot;
            }
          };

          const [
            postsSnapshot,
            usersSnapshot,
            commentsSnapshot,
            booksSnapshot,
            quizResultsSnapshot,
            supportSnapshot,
            passwordRequestsSnapshot,
          ] = await Promise.all([
            safeGetDocs('posts'),
            safeGetDocs('users'),
            safeGetDocs('comments'),
            safeGetDocs('books'),
            safeGetDocs('quizResults'),
            safeGetDocs('supportMessages'),
            safeGetDocs('passwordResetRequests'),
          ]);

          const posts = postsSnapshot.docs.map(postDoc => ({
            id: postDoc.id,
            title: postDoc.data().title || 'Untitled post',
            createdAt: postDoc.data().createdAt,
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

          const todayKey = new Date().toISOString().slice(0, 10);
          let activeUsers = 0;
          let aiUsage = 0;

          usersSnapshot.docs.forEach(userDoc => {
            const data = userDoc.data();

            if (data.lastLoginDate === todayKey) {
              activeUsers += 1;
            }

            aiUsage += data.aiConversationCount || 0;
          });

          const mostOpenedBook =
            booksSnapshot.docs
              .map(bookDoc => ({
                id: bookDoc.id,
                title: bookDoc.data().title || 'Untitled book',
                openCount: bookDoc.data().openCount || 0,
              }))
              .sort((a, b) => b.openCount - a.openCount)[0] || null;

          const mostLikedPost =
            postsWithStats
              .slice()
              .sort((a, b) => b.likeCount - a.likeCount)[0] || null;

          const mostCommentedPost =
            postsWithStats
              .slice()
              .sort((a, b) => b.commentCount - a.commentCount)[0] || null;

          const recentPosts = postsWithStats
            .slice()
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
            )
            .slice(0, 4);

          setAnalytics({
            totalPosts: postsSnapshot.size,
            totalUsers: usersSnapshot.size,
            totalComments: commentsSnapshot.size,
            totalBooks: booksSnapshot.size,
            activeUsers,
            completedQuizzes: quizResultsSnapshot.size,
            aiUsage,
            supportMessages: supportSnapshot.size,
            passwordRequests: passwordRequestsSnapshot.size,
            mostOpenedBook,
            totalLikes: Object.values(likeCounts).reduce(
              (total, count) => total + count,
              0
            ),
            mostLikedPost,
            mostCommentedPost,
            recentPosts,
          });
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      };

      loadDashboard();
    }, [router])
  );

  const maxEngagement = Math.max(
    analytics.totalLikes,
    analytics.totalComments,
    1
  );

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/images/vidia.png')}
            style={styles.logo}
          />

          <View>
            <Text style={styles.eyebrow}>Admin Overview</Text>
            <Text style={[styles.title, { color: theme.text }]}>Vidia</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Exit admin"
            style={styles.profileButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="exit-outline" size={28} color="#FF4D4D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/admin/profile')}
          >
            <Ionicons name="person-circle-outline" size={30} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.heroPanel,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={styles.heroLabel}>Content health</Text>
        <Text style={[styles.heroNumber, { color: theme.text }]}>
          {analytics.totalLikes + analytics.totalComments}
        </Text>
        <Text style={[styles.heroText, { color: theme.muted }]}>
          Total engagement across likes and comments.
        </Text>

        <View style={styles.graphBlock}>
          <ChartBar
            label="Likes"
            value={analytics.totalLikes}
            max={maxEngagement}
            color="#FF4D67"
          />
          <ChartBar
            label="Comments"
            value={analytics.totalComments}
            max={maxEngagement}
            color="#2F80ED"
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Posts"
          value={analytics.totalPosts}
          icon="images-outline"
          tone="#7CFFB2"
        />
        <StatCard
          label="Users"
          value={analytics.totalUsers}
          icon="people-outline"
          tone="#FFD166"
        />
        <StatCard
          label="Likes"
          value={analytics.totalLikes}
          icon="heart-outline"
          tone="#FF4D67"
        />
        <StatCard
          label="Comments"
          value={analytics.totalComments}
          icon="chatbubble-outline"
          tone="#2F80ED"
        />
        <StatCard
          label="Books"
          value={analytics.totalBooks}
          icon="library-outline"
          tone="#7CFFB2"
        />
        <StatCard
          label="Active Today"
          value={analytics.activeUsers}
          icon="pulse-outline"
          tone="#8B5CF6"
        />
        <StatCard
          label="Quizzes Done"
          value={analytics.completedQuizzes}
          icon="help-circle-outline"
          tone="#FFD166"
        />
        <StatCard
          label="Coach Uses"
          value={analytics.aiUsage}
          icon="sparkles-outline"
          tone="#2F80ED"
        />
        <StatCard
          label="Support"
          value={analytics.supportMessages}
          icon="mail-unread-outline"
          tone="#7CFFB2"
        />
        <StatCard
          label="Resets"
          value={analytics.passwordRequests}
          icon="key-outline"
          tone="#FFD166"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Performers</Text>

        <InsightCard
          label="Most liked"
          title={analytics.mostLikedPost?.title || 'No post yet'}
          value={`${analytics.mostLikedPost?.likeCount || 0} likes`}
          icon="heart"
          color="#FF4D67"
        />

        <InsightCard
          label="Most commented"
          title={analytics.mostCommentedPost?.title || 'No comments yet'}
          value={`${analytics.mostCommentedPost?.commentCount || 0} comments`}
          icon="chatbubble"
          color="#2F80ED"
        />

        <InsightCard
          label="Most opened book"
          title={analytics.mostOpenedBook?.title || 'No book opens yet'}
          value={`${analytics.mostOpenedBook?.openCount || 0} opens`}
          icon="library"
          color="#8B5CF6"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <ActionCard
            title="Upload Posts"
            subtitle="Create new content"
            icon="cloud-upload-outline"
            onPress={() => router.push('/admin/upload')}
          />
          <ActionCard
            title="Manage Posts"
            subtitle="Edit, pin, delete"
            icon="create-outline"
            onPress={() => router.push('/admin/posts')}
          />
          <ActionCard
            title="Manage Comments"
            subtitle="Review and delete"
            icon="chatbubbles-outline"
            onPress={() => router.push('/admin/comments')}
          />
          <ActionCard
            title="Upload Books"
            subtitle="Add PDF reading"
            icon="cloud-upload-outline"
            onPress={() => router.push('/admin/upload-books')}
          />
          <ActionCard
            title="Manage Books"
            subtitle="Edit, pin, delete"
            icon="library-outline"
            onPress={() => router.push('/admin/books')}
          />
          <ActionCard
            title="Manage Users"
            subtitle="Moderate accounts"
            icon="shield-checkmark-outline"
            onPress={() => router.push('/admin/users')}
          />
          <ActionCard
            title="Support Inbox"
            subtitle="Answer users"
            icon="mail-unread-outline"
            onPress={() => router.push('/admin/support')}
          />
          <ActionCard
            title="Password Requests"
            subtitle="Review resets"
            icon="key-outline"
            onPress={() => router.push('/admin/password-requests')}
          />
          <ActionCard
            title="Quiz Questions"
            subtitle="Build 10-question sets"
            icon="help-circle-outline"
            onPress={() => router.push('/admin/questions')}
          />
          <ActionCard
            title="Admin Profile"
            subtitle="Password and account"
            icon="settings-outline"
            onPress={() => router.push('/admin/profile')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Posts</Text>

        {analytics.recentPosts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No posts uploaded yet.</Text>
        ) : (
          analytics.recentPosts.map((post: any) => (
            <View key={post.id} style={styles.recentRow}>
              <View style={styles.recentDot} />
              <View style={styles.recentTextBlock}>
                <Text style={[styles.recentTitle, { color: theme.text }]}>{post.title}</Text>
                <Text style={[styles.recentMeta, { color: theme.muted }]}>
                  {post.likeCount} likes - {post.commentCount} comments
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, tone }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: tone }]}>
        <Ionicons name={icon} size={20} color="#121212" />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function ChartBar({ label, value, max, color }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const width = `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%`;

  return (
    <View style={styles.chartRow}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartLabel, { color: theme.muted }]}>{label}</Text>
        <Text style={[styles.chartValue, { color: theme.text }]}>{value}</Text>
      </View>
      <View style={[styles.chartTrack, { backgroundColor: theme.raised }]}>
        <View
          style={[
            styles.chartFill,
            { width: width as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function InsightCard({ label, title, value, icon, color }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <View
      style={[
        styles.insightCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.insightIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.insightCopy}>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={[styles.insightTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.insightValue, { color: theme.muted }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionCard({ title, subtitle, icon, onPress }: any) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);

  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={theme.text} />
      <Text style={[styles.actionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.actionSub, { color: theme.muted }]}>{subtitle}</Text>
    </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },

  eyebrow: {
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 4,
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  heroPanel: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    marginBottom: 18,
  },

  heroLabel: {
    color: '#888',
    fontSize: 14,
  },

  heroNumber: {
    color: '#fff',
    fontSize: 46,
    fontWeight: 'bold',
    marginTop: 4,
  },

  heroText: {
    color: '#aaa',
    marginTop: 4,
    marginBottom: 18,
  },

  graphBlock: {
    gap: 14,
  },

  chartRow: {
    gap: 8,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  chartLabel: {
    color: '#fff',
    fontWeight: '700',
  },

  chartValue: {
    color: '#888',
  },

  chartTrack: {
    height: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 5,
    overflow: 'hidden',
  },

  chartFill: {
    height: '100%',
    borderRadius: 5,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 15,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  statValue: {
    color: '#fff',
    fontSize: 25,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#888',
    marginTop: 3,
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
  },

  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  insightCopy: {
    flex: 1,
  },

  insightLabel: {
    color: '#888',
    fontSize: 13,
  },

  insightTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },

  insightValue: {
    color: '#aaa',
    marginTop: 5,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  actionCard: {
    width: '48%',
    minHeight: 124,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 15,
    justifyContent: 'space-between',
  },

  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
  },

  actionSub: {
    color: '#888',
    marginTop: 4,
  },

  emptyText: {
    color: '#888',
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  recentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7CFFB2',
    marginRight: 12,
  },

  recentTextBlock: {
    flex: 1,
  },

  recentTitle: {
    color: '#fff',
    fontWeight: '700',
  },

  recentMeta: {
    color: '#888',
    marginTop: 4,
  },
});
