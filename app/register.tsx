import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth, } from 'firebase/auth';
import { doc, setDoc, } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { app, db } from '../firebaseConfig';

export default function RegisterScreen() {
  const router = useRouter();

  const auth = getAuth(app);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return alert('Fill all fields');
    }

    setLoading(true);

    try {
      // CREATE USER
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // SAVE USER INFO
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        bio: '',
        avatar: '',
        createdAt: new Date(),
        likedPosts: [],
        savedPosts: [],
      });

      alert('Account created 🔥');

      router.replace('/(tabs)');

    } catch (error) {
      console.log(error);
      alert(error.message);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>
        Create Account
      </Text>

      <TextInput
        placeholder="Name"
        placeholderTextColor="#888"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>
            Register
          </Text>
        )}
      </TouchableOpacity>

      <Text
        style={styles.loginLink}
        onPress={() => router.push('/login')}
      >
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },

  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  button: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  loginLink: {
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
});
