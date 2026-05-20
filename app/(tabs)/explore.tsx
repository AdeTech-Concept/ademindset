import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const focusAreas = [
  {
    title: 'Discipline',
    text: 'Build habits that keep you moving when motivation drops.',
    icon: 'flame-outline',
    color: '#FF4D67',
  },
  {
    title: 'Growth',
    text: 'Save lessons, revisit ideas, and keep sharpening your mindset.',
    icon: 'trending-up-outline',
    color: '#7CFFB2',
  },
  {
    title: 'Consistency',
    text: 'Come back daily and stack small wins into something bigger.',
    icon: 'repeat-outline',
    color: '#FFD166',
  },
];

export default function ExploreScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.eyebrow}>Explore</Text>
        <Text style={styles.title}>Choose your next edge</Text>
        <Text style={styles.subtitle}>
          A cleaner space for the themes that power Ademindset.
        </Text>
      </View>

      <View style={styles.focusList}>
        {focusAreas.map(item => (
          <View key={item.title} style={styles.focusCard}>
            <View style={[styles.focusIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={22} color="#121212" />
            </View>

            <View style={styles.focusCopy}>
              <Text style={styles.focusTitle}>{item.title}</Text>
              <Text style={styles.focusText}>{item.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.quoteCard}>
        <Ionicons name="sparkles-outline" size={24} color="#7CFFB2" />
        <Text style={styles.quote}>
          Refuse average. Train your mind like it matters.
        </Text>
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
    paddingTop: 58,
    paddingBottom: 34,
  },

  hero: {
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 22,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 18,
  },

  eyebrow: {
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    color: '#fff',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 8,
  },

  subtitle: {
    color: '#AAA',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  focusList: {
    gap: 12,
  },

  focusCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#292929',
  },

  focusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  focusCopy: {
    flex: 1,
  },

  focusTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

  focusText: {
    color: '#999',
    marginTop: 5,
    lineHeight: 20,
  },

  quoteCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#292929',
    marginTop: 22,
  },

  quote: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 12,
  },
});
