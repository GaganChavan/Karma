// ─── KARMA APP — NAVIGATION (UPDATED PHASE 2) ────────────────────────
// Stack navigator wraps tab navigator.
// AddHabit and HabitDetail are stack screens (full screen).

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Colors }             from '../constants/colors';
import HomeScreen             from '../screens/HomeScreen';
import AddHabitScreen         from '../screens/AddHabitScreen';
import HabitDetailScreen      from '../screens/HabitDetailScreen';
import {
  HabitsScreen,
  StatsScreen,
  SettingsScreen,
} from '../screens/PlaceholderScreens';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Custom Tab Bar ────────────────────────────────────────────────────

const KarmaTabBar = ({ state, navigation }) => {
  const tabs = [
    { name: 'Home',     icon: '🏠', label: 'Home' },
    { name: 'Habits',   icon: '✅', label: 'Habits' },
    { name: 'AddTab',   icon: '✚',  label: 'Add',  isCenter: true },
    { name: 'Stats',    icon: '📊', label: 'Stats' },
    { name: 'Settings', icon: '⚙️', label: 'More' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => {
        // Map AddTab to the stack navigation
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="add"
              style={styles.centerTab}
              onPress={() => navigation.navigate('AddHabit')}
              activeOpacity={0.8}
            >
              <View style={styles.centerButton}>
                <Text style={styles.centerIcon}>✚</Text>
              </View>
            </TouchableOpacity>
          );
        }

        const isFocused = state.routes[state.index]?.name === tab.name ||
                          (tab.name === 'Home' && state.index === 0);
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => {
              if (routeIndex >= 0) {
                navigation.navigate(tab.name);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Tab Navigator ─────────────────────────────────────────────────────

const TabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <KarmaTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"     component={HomeScreen} />
    <Tab.Screen name="Habits"   component={HabitsScreen} />
    <Tab.Screen name="AddTab"   component={HomeScreen} />
    <Tab.Screen name="Stats"    component={StatsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// ── Root Stack Navigator ──────────────────────────────────────────────

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main"        component={TabNavigator} />
    <Stack.Screen
      name="AddHabit"
      component={AddHabitScreen}
      options={{
        presentation:      'modal',
        gestureEnabled:    true,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [{
              translateY: current.progress.interpolate({
                inputRange:  [0, 1],
                outputRange: [layouts.screen.height, 0],
              }),
            }],
          },
        }),
      }}
    />
    <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:     'row',
    backgroundColor:   'rgba(5,10,24,0.97)',
    borderTopWidth:     1,
    borderTopColor:     Colors.borderBlue,
    paddingBottom:      Platform.OS === 'ios' ? 20 : 8,
    paddingTop:         10,
    paddingHorizontal:  8,
    alignItems:        'center',
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             2,
  },
  tabIcon:       { fontSize: 18, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel:      { fontSize: 8, color: Colors.textDim, letterSpacing: 0.5 },
  tabLabelActive:{ color: Colors.blue },
  centerTab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      -20,
  },
  centerButton: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.blue,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.blue,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.5,
    shadowRadius:    12,
    elevation:        8,
  },
  centerIcon: {
    fontSize:   22,
    color:      Colors.white,
    fontWeight: 'bold',
  },
});

export default AppNavigator;