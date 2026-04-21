// ─── KARMA APP — NAVIGATION (PHASE 6) ────────────────────────────────
// Apple-style tab bar. Gold active state. True black background.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Colors, Typography }  from '../constants/colors';
import HomeScreen              from '../screens/HomeScreen';
import AddHabitScreen          from '../screens/AddHabitScreen';
import HabitDetailScreen       from '../screens/HabitDetailScreen';
import CelebrationScreen       from '../screens/CelebrationScreen';
import StatsScreen             from '../screens/StatsScreen';
import HistoryScreen           from '../screens/HistoryScreen';
import { HabitsScreen, SettingsScreen } from '../screens/PlaceholderScreens';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const KarmaTabBar = ({ state, navigation }) => {
  const tabs = [
    { name: 'Home',     icon: '⊙',  iconActive: '⊙',  label: 'Home' },
    { name: 'Habits',   icon: '☰',  iconActive: '☰',  label: 'Habits' },
    { name: 'AddTab',   icon: '+',   label: 'Add', isCenter: true },
    { name: 'Stats',    icon: '◫',  iconActive: '◫',  label: 'Stats' },
    { name: 'Settings', icon: '◎',  iconActive: '◎',  label: 'More' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="add"
              style={styles.centerWrap}
              onPress={() => navigation.navigate('AddHabit')}
              activeOpacity={0.8}
            >
              <View style={styles.centerBtn}>
                <Text style={styles.centerIcon}>+</Text>
              </View>
            </TouchableOpacity>
          );
        }

        const isFocused  = state.routes[state.index]?.name === tab.name;
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => { if (routeIndex >= 0) navigation.navigate(tab.name); }}
            activeOpacity={0.7}
          >
            <View style={[styles.tabInner, isFocused && styles.tabInnerActive]}>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator tabBar={props => <KarmaTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home"     component={HomeScreen} />
    <Tab.Screen name="Habits"   component={HabitsScreen} />
    <Tab.Screen name="AddTab"   component={HomeScreen} />
    <Tab.Screen name="Stats"    component={StatsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main"        component={TabNavigator} />
    <Stack.Screen name="AddHabit"    component={AddHabitScreen}
      options={{ presentation: 'modal', gestureEnabled: true }} />
    <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
    <Stack.Screen name="Celebration" component={CelebrationScreen}
      options={{ presentation: 'modal', gestureEnabled: false }} />
    <Stack.Screen name="History"     component={HistoryScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:     'row',
    backgroundColor:   'rgba(0,0,0,0.95)',
    borderTopWidth:     1,
    borderTopColor:    'rgba(255,255,255,0.08)',
    paddingBottom:      Platform.OS === 'ios' ? 24 : 10,
    paddingTop:         12,
    paddingHorizontal:  8,
    alignItems:        'center',
  },
  tab:            { flex: 1, alignItems: 'center' },
  tabInner: {
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:      20,
  },
  tabInnerActive: { backgroundColor: 'rgba(245,166,35,0.12)' },
  tabLabel:       { ...Typography.caption1, color: 'rgba(235,235,245,0.35)', fontWeight: '500' },
  tabLabelActive: { color: Colors.gold, fontWeight: '700' },
  centerWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
  centerBtn: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.gold,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.gold,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
    elevation:        8,
  },
  centerIcon: { fontSize: 28, color: '#000', fontWeight: '300', lineHeight: 30 },
});

export default AppNavigator;