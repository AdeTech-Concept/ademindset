import {
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
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [input, setInput] = useState('');
  const [messages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Vidia Coach is coming soon. The AI feature is being prepared, so chatting is disabled for now.',
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (!params.prompt) return;

    setInput(params.prompt);
  }, [params.prompt]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[
        styles.keyboardView,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 60,
        }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusPill}>
            <Ionicons name="lock-closed" size={14} color="#121212" />
            <Text style={styles.statusText}>Coming soon</Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}>
            Vidia Coach
          </Text>

          <Text
            style={{
              color: colors.icon,
              marginTop: 4,
            }}>
            Your personal mindset coach is being prepared
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
              placeholder="Vidia Coach is coming soon"
              placeholderTextColor={colors.icon}
              multiline
              editable={false}
              style={[
                styles.input,
                {
                  color: colors.text,
                  opacity: 0.55,
                },
              ]}
            />

            <Pressable
              disabled
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.border,
                },
              ]}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={colors.icon}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD166',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },

  statusText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
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
