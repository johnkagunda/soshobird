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
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideTabBar, showTabBar } from '@/components/AnimatedTabBar';
import SupabaseImage from '@/components/SupabaseImage';

/**
 * Fetch posts sorted by engagement (likes_count desc).
 * Top-level posts only (no replies).
 */
async function fetchDiscoverPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `*,
       user:profiles(id, full_name, username, avatar_url)`
    )
    .is('parent_id', null)
    .order('likes_count', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return data ?? [];
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const lastY = useRef(0);
  const tabVisible = useRef(true);

  const {
    data: posts = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['discover'],
    queryFn: fetchDiscoverPosts,
  });

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

  const renderItem = ({ item }: { item: any }) => {
    const hasImage = Array.isArray(item.images) && item.images.length > 0;

    return (
      <Pressable
        onPress={() => router.push(`/posts/${item.id}`)}
        style={{
          flex: 1,
          margin: 3,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
          aspectRatio: 1,
        }}
      >
        {hasImage ? (
          <SupabaseImage
            bucket="media"
            path={item.images[0]}
            style={{ width: '100%', height: '100%' }}
            transform={{ width: 300, height: 300 }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              padding: 14,
              justifyContent: 'center',
              backgroundColor: '#1e1e1e',
            }}
          >
            <Text
              style={{ color: '#d1d5db', fontSize: 13, lineHeight: 18 }}
              numberOfLines={5}
            >
              {item.content}
            </Text>
          </View>
        )}

        {/* Overlay: author + likes at the bottom */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 10,
            paddingVertical: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: '600',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.user?.full_name ?? 'User'}
          </Text>
          <Ionicons name="heart" size={12} color="#f97316" />
          <Text style={{ color: '#d1d5db', fontSize: 11 }}>
            {item.likes_count ?? 0}
          </Text>
        </View>
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
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          backgroundColor: '#0f0f0f',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          Discover
        </Text>
      </View>

      {/* 2-column grid */}
      {isLoading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 64, gap: 12 }}>
          <Ionicons name="compass-outline" size={52} color="#2a2a2a" />
          <Text style={{ color: '#6b7280', fontSize: 15 }}>
            No posts to discover yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 100 }}
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
