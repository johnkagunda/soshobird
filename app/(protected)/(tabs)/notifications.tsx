import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { useAuth } from '@/providers/AuthProvider';
import { hideTabBar, showTabBar } from '@/components/AnimatedTabBar';
import SupabaseImage from '@/components/SupabaseImage';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  NotificationItem,
} from '@/services/notifications';
import { useNotificationBanner } from '@/components/NotificationBanner';

dayjs.extend(relativeTime);

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showBanner } = useNotificationBanner();

  const goToProfile = (userId: string, username: string) => {
    if (userId === user?.id) {
      router.push('/(protected)/(tabs)/profile');
    } else {
      router.push(
        `/(protected)/(tabs)/profile/${userId}?username=${encodeURIComponent(username)}`
      );
    }
  };
  const queryClient = useQueryClient();

  const lastY = useRef(0);
  const tabVisible = useRef(true);

  const {
    data: notifications = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => markAllNotificationsAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Auto mark-all-read 3s after screen opens with unread items
  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => markAllRead(), 3000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    if (diff > 10 && tabVisible.current) {
      tabVisible.current = false;
      hideTabBar();
    } else if (diff < -10 && !tabVisible.current) {
      tabVisible.current = true;
      showTabBar();
    }
    lastY.current = y;
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const actor = item.actor;
    const actorName = actor?.full_name || actor?.username || 'Someone';

    return (
      <Pressable
        onPress={() => {
          if (item.type === 'follow') {
            goToProfile(item.actor_id, actor?.username ?? '');
          } else if (item.type === 'post' && item.post_id) {
            router.push(`/posts/${item.post_id}`);
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: item.read ? '#0f0f0f' : '#151515',
          borderBottomWidth: 1,
          borderBottomColor: '#2a2a2a',
        }}
      >
        {/* Actor avatar */}
        <SupabaseImage
          bucket="avatars"
          path={actor?.avatar_url}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />

        {/* Notification text */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 20 }}>
            <Text style={{ fontWeight: '600' }}>{actorName}</Text>
            {item.type === 'follow'
              ? ' started following you'
              : ' shared a new post'}
          </Text>

          {item.type === 'post' && item.post?.content && (
            <Text
              style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}
              numberOfLines={2}
            >
              {item.post.content}
            </Text>
          )}

          <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            {dayjs(item.created_at).fromNow()}
          </Text>
        </View>

        {/* Unread dot */}
        {!item.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#f97316',
              marginTop: 6,
            }}
          />
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          backgroundColor: '#0f0f0f',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          Notifications
          {unreadCount > 0 && (
            <Text style={{ color: '#f97316', fontSize: 16 }}> {unreadCount}</Text>
          )}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Test button — tap to verify banner works */}
          <Pressable
            onPress={() => showBanner('Test notification 🐦', 'Banner is working!', 'follow')}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color="#f97316" />
          </Pressable>

          {unreadCount > 0 && (
            <Pressable onPress={() => markAllRead()} hitSlop={8}>
              <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '600' }}>
                Mark all read
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 64, gap: 12 }}>
          <Ionicons name="notifications-outline" size={52} color="#2a2a2a" />
          <Text style={{ color: '#6b7280', fontSize: 15 }}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#f97316"
            />
          }
        />
      )}
    </View>
  );
}
