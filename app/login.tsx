import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, } from 'firebase/firestore';
import { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { app, db } from '../firebaseConfig';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const auth = getAuth(app);

    const handleLogin = async () => {
      try {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

        const user = userCredential.user;
        const userRef = doc( db, 'users', user.uid );
        const userSnap = await getDoc(userRef);

        if (userSnap.data()?.banned) {
          alert(
            'Your account has been suspended.'
          );
          await signOut(auth);
          return;
        }

        console.log("Logged in:", user.email);

        if (
          user.email?.trim().toLowerCase() ===
          'josh0mathew@gmail.com'
        ) {

          router.replace('/admin');

        } else {

          router.replace('/(tabs)');

        }

      } catch (error) {
        console.log( "Login error:", error.message );
      }
    };

  return (
    <View style={styles.container}>

      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
        />
      </View>
      
      <Text style={styles.title}>Ademindset</Text>
      <Text style={styles.subtitle}>
        For those who refuse to stay average
      </Text>

      <View style={styles.form}>
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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Enter the Grind</Text>
        </TouchableOpacity>
        <Text
          style={styles.registerLink}
          onPress={() => router.push('/register')}
        >
          New here? Create account
        </Text>

      </View>

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
  },
  subtitle: {
    color: '#888',
    marginBottom: 30,
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
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  form: {
    width: '100%',
  },

  adminButton: {
    marginTop: 15,
    alignItems: 'center',
  },

  adminText: {
    color: '#888',
    fontSize: 14,
  },

  registerLink: {
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
});