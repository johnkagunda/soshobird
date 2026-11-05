/**
 * SoshoAI — in-app chat powered by Ollama (morio-simple:latest)
 *
 * Connects directly to Ollama running on the local machine (localhost:11434).
 * Uses streaming responses so text appears word-by-word like ChatGPT.
 *
 * NOTE: On Android device / web (Render), Ollama must be accessible.
 *   • Dev (same machine): http://localhost:11434 works automatically.
 *   • Android device on same Wi-Fi: change OLLAMA_URL to your PC's local IP
 *     e.g. http://192.168.x.x:11434
 *   • Production / web: expose Ollama via a reverse proxy or ngrok.
 */
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useCallback } from 'react';

const OLLAMA_URL = 'http://192.168.100.30:11434';
const MODEL = 'morio-simple:latest';
const ORANGE = '#f97316';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; text: string };

let msgCounter = 0;
const newId = () => String(++msgCounter);

export default function SoshoAIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: newId(),
      role: 'assistant',
      text: "Hi! I'm SoshoAI 🐦 powered by Ollama. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');

    // Add user message
    const userMsg: Message = { id: newId(), role: 'user', text };
    const assistantId = newId();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    scrollToBottom();

    try {
      // Build conversation history for context
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));

      abortRef.current = new AbortController();

      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: history,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Each line is a JSON object
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const token: string = json?.message?.content ?? '';
            accumulated += token;

            // Update the assistant message in place
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: accumulated } : m
              )
            );
          } catch {
            // Partial JSON — ignore
          }
        }

        scrollToBottom();
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const errText =
        e?.message?.includes('Failed to fetch') || e?.message?.includes('Network')
          ? "Can't reach Ollama. Make sure it's running on your PC."
          : e?.message ?? 'Something went wrong.';

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, text: `⚠️ ${errText}` } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginHorizontal: 12,
          marginVertical: 4,
        }}
      >
        {!isUser && (
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: ORANGE,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 8, marginTop: 2,
          }}>
            <Text style={{ fontSize: 16 }}>🐦</Text>
          </View>
        )}
        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isUser ? ORANGE : '#1e1e1e',
            borderRadius: 18,
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          {item.text === '' && !isUser ? (
            <ActivityIndicator size="small" color={ORANGE} />
          ) : (
            <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#0f0f0f',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: ORANGE,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>🐦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
            SoshoAI
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>
            {isStreaming ? 'Thinking...' : `${MODEL}`}
          </Text>
        </View>
        {isStreaming && (
          <Pressable onPress={stopStreaming} hitSlop={8}
            style={{ backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Stop</Text>
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: '#0f0f0f',
          borderTopWidth: 1,
          borderTopColor: '#2a2a2a',
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: '#2a2a2a',
            paddingHorizontal: 16,
            paddingVertical: 10,
            maxHeight: 120,
          }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask SoshoAI anything..."
              placeholderTextColor="#6b7280"
              multiline
              style={{ color: '#fff', fontSize: 15, textAlignVertical: 'top' }}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
          </View>
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 44, height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() && !isStreaming ? ORANGE : '#2a2a2a',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={input.trim() && !isStreaming ? '#fff' : '#4b5563'}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
