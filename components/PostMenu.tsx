import { View, Text, Pressable, Modal, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePost } from '@/services/posts';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function PostMenu({
  postId,
  postContent,
  authorName,
  createdAt,
  isOwnPost,
}: {
  postId: string;
  postContent: string;
  authorName: string;
  createdAt?: string;
  isOwnPost: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      setConfirmVisible(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      try { router.back(); } catch (_) {}
    },
  });

  const handleShare = async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: `${authorName ?? 'Someone'} posted: "${postContent}"`,
      });
    } catch (_) {}
  };

  return (
    <>
      {/* Three-dot trigger */}
      <Pressable
        hitSlop={12}
        onPress={() => setMenuVisible(true)}
        className="p-1"
      >
        <View className="flex-row items-center gap-1">
          {/* Timestamp shown inline next to dots */}
          {createdAt ? (
            <Text className="text-neutral-500 text-xs">
              {dayjs(createdAt).fromNow(true)}
            </Text>
          ) : null}
          <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
        </View>
      </Pressable>

      {/* Options bottom sheet */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />

            {/* Timestamp in menu header */}
            {createdAt ? (
              <View style={{ paddingHorizontal: 24, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}>
                <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                  Posted {dayjs(createdAt).format('MMM D, YYYY [at] h:mm A')}
                </Text>
              </View>
            ) : null}

            {/* Share */}
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}
              onPress={handleShare}
            >
              <Ionicons name="paper-plane-outline" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16 }}>Share Post</Text>
            </Pressable>

            {/* Delete — own posts only */}
            {isOwnPost && (
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}
                disabled={isDeleting}
                onPress={() => { setMenuVisible(false); setConfirmVisible(true); }}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 16 }}>
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </Text>
              </Pressable>
            )}

            {/* Cancel */}
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}
              onPress={() => setMenuVisible(false)}
            >
              <Ionicons name="close" size={22} color="#6b7280" />
              <Text style={{ color: '#9ca3af', fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
          onPress={() => !isDeleting && setConfirmVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, gap: 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              Delete Post?
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
              Are you sure? This cannot be undone.
            </Text>

            {isDeleting && <ActivityIndicator color="#f97316" />}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center' }}
                disabled={isDeleting}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, paddingVertical: 12, borderRadius: 100, backgroundColor: '#ef4444', alignItems: 'center' }}
                disabled={isDeleting}
                onPress={() => handleDelete()}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
