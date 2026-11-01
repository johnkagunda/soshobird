import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SupabaseImage from './SupabaseImage';
import { createPost } from '@/services/posts';

export type PostReplyInputRef = { focus: () => void };

const PostReplyInput = forwardRef<PostReplyInputRef, {
  postId: string;
  replyTo?: { postId: string; username: string } | null;
  onReplyToClear?: () => void;
}>(
  ({ postId, replyTo, onReplyToClear }, ref) => {
    const [text, setText] = useState('');
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const inputRef = useRef<TextInput>(null);
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const { mutate, isPending } = useMutation({
      mutationFn: () => {
        if (!user) throw new Error('Not authenticated');
        return createPost({
          content: text.trim(),
          user_id: user.id,
          parent_id: postId,
          reply_to_id: replyTo?.postId ?? null,
        });
      },
      onSuccess: () => {
        setText('');
        onReplyToClear?.();
        queryClient.invalidateQueries({ queryKey: ['posts', postId, 'replies'] });
        queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message ?? 'Could not post reply');
      },
    });

    const canSubmit = text.trim().length > 0 && !isPending;
    const placeholder = replyTo
      ? `Replying to @${replyTo.username}...`
      : 'Write a reply...';

    return (
      <View
        style={{ backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#262626', paddingBottom: insets.bottom + 10, paddingHorizontal: 12, paddingTop: 8 }}
      >
        {/* Reply-to chip */}
        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <View style={{ width: 2, height: 16, backgroundColor: '#f97316', borderRadius: 1 }} />
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>
              Replying to{' '}
              <Text style={{ color: '#f97316', fontWeight: '600' }}>@{replyTo.username}</Text>
            </Text>
            <Pressable onPress={onReplyToClear} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <SupabaseImage
            bucket="avatars"
            path={profile?.avatar_url}
            style={{ width: 34, height: 34, borderRadius: 17, marginTop: 2 }}
            transform={{ width: 34, height: 34 }}
          />
          <View style={{ flex: 1, backgroundColor: '#1a1a1a', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor="#6b7280"
              multiline
              style={{ color: '#fff', fontSize: 15, textAlignVertical: 'top', maxHeight: 100 }}
            />
          </View>
          <Pressable
            onPress={() => mutate()}
            disabled={!canSubmit}
            style={{ marginTop: 6 }}
          >
            <Ionicons
              name="send"
              size={24}
              color={canSubmit ? '#f97316' : '#374151'}
            />
          </Pressable>
        </View>
      </View>
    );
  }
);

export default PostReplyInput;
