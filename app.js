import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>VIDIA</Text>
      <Text style={styles.subHeader}>
        For those who refuse to stay average
      </Text>

      <ScrollView style={styles.feed}>
        <View style={styles.card}>
          <Text style={styles.text}>
            Nobody is coming to save you. Work harder.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}>
            Discipline will take you where motivation can&apos;t.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}>
            Stay focused. Stay hungry. Stay winning.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subHeader: {
    color: '#888888',
    marginBottom: 20,
  },
  feed: {
    marginTop: 10,
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
