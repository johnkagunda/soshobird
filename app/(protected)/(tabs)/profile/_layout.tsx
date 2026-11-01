import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileLayout() {
  const { postUserId, username } = useLocalSearchParams();
  const name = Array.isArray(username) ? username[0] : username;

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(protected)/(tabs)/profile/settings')}
              hitSlop={10}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="settings-outline" size={24} color="#f97316" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen
        name="[postUserId]/index"
        options={{
          title: name ? `${name.toLowerCase()}` : 'Profile',
        }}
      />
      <Stack.Screen
        name="[postUserId]/followers"
        options={{ title: 'Followers' }}
      />
      <Stack.Screen
        name="[postUserId]/following"
        options={{ title: 'Following' }}
      />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
