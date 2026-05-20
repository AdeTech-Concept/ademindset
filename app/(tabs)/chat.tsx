import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hey 👋 I’m Ademindset AI. How can I help you today?',
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput('');
    setLoading(true);

    try {
      // Temporary fake AI response
     const response = await fetch('http://10.95.102.227:3000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
      }),
    });

    const data = await response.json();

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.reply,
    };

    setMessages((prev) => [...prev, aiMessage]);

    setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          flex: 1,
          paddingTop: 60,
        }}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}>
            Ademindset AI
          </Text>

          <Text
            style={{
              color: colors.icon,
              marginTop: 4,
            }}>
            Your personal AI assistant
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 20,
          }}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';

            return (
              <View
                style={[
                  styles.messageWrapper,
                  {
                    justifyContent: isUser
                      ? 'flex-end'
                      : 'flex-start',
                  },
                ]}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isUser
                        ? colors.primary
                        : colors.card,
                    },
                  ]}>
                  <Text
                    style={{
                      color: isUser ? '#fff' : colors.text,
                      fontSize: 16,
                      lineHeight: 24,
                    }}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Typing Indicator */}
        {loading && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 10,
            }}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
              },
            ]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Ademindset AI anything..."
              placeholderTextColor={colors.icon}
              multiline
              style={[
                styles.input,
                {
                  color: colors.text,
                },
              ]}
            />

            <Pressable
              onPress={sendMessage}
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}>
              <Ionicons
                name="send"
                size={20}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
  },

  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  input: {
    flex: 1,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingTop: 10,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});