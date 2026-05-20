import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7CFFB2',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          backgroundColor: '#151515',
          borderTopColor: '#252525',
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'home' : 'home-outline'}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'bookmark' : 'bookmark-outline'}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'heart' : 'heart-outline'}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'compass' : 'compass-outline'}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'notifications' : 'notifications-outline'}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'person-circle' : 'person-circle-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
