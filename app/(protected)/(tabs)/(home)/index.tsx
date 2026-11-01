import {
  ActivityIndicator, FlatList, Image, Pressable, Text, View, NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import PostListItem from '@/components/PostListItem';
import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '@/services/posts';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideTabBar, showTabBar } from '@/components/AnimatedTabBar';

const SCROLL_THRESHOLD = 10;

export default function HomeScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const isTabBarVisible = useRef(true);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > SCROLL_THRESHOLD && isTabBarVisible.current) {
      // Scrolling down — hide tab bar
      isTabBarVisible.current = false;
      hideTabBar();
    } else if (diff < -SCROLL_THRESHOLD && !isTabBarVisible.current) {
      // Scrolling up — show tab bar
      isTabBarVisible.current = true;
      showTabBar();
    }

    lastScrollY.current = currentY;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      {/* Compact header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 8,
        backgroundColor: '#0f0f0f',
      }}>
        <View style={{ flex: 1 }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 30, height: 30, borderRadius: 15 }}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Pressable
            onPress={() => router.push('/(protected)/(tabs)/(home)/search')}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <Ionicons name="search-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Feed */}
      {isLoading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 40 }}>
          {error.message}
        </Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostListItem post={item} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
              No posts yet.
            </Text>
          )}
        />
      )}
    </View>
  );
}
