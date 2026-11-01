import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ 
        headerShown: false,
       }} />
      <Stack.Screen
        name='posts/[id]'
        options={{
          title: 'Post',
          headerBackButtonDisplayMode: 'generic',
        }}
      />
      <Stack.Screen name='search' options={{ headerShown: false }} />
    </Stack>
  );
}