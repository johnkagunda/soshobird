import { router, Tabs } from 'expo-router';
import AnimatedTabBar from '@/components/AnimatedTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen
        name="plus"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/new');
          },
        }}
      />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="soshoai" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
