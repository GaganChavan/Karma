// ─── KARMA APP — NAVIGATION ───────────────────────────────────────────
// Bottom tab navigator. 5 tabs: Home, Habits, Add, Stats, Settings.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/colors';
import HomeScreen from '../screens/HomeScreen';
import {
  HabitsScreen,
  StatsScreen,
  SettingsScreen,
} from '../screens/PlaceholderScreens';

const Tab = createBottomTabNavigator();

// Custom tab bar for full design control
const KarmaTabBar = ({ state, descriptors, navigation }) => {
  const tabs = [
    { key: 'Home',     icon: '🏠', label: 'Home' },
    { key: 'Habits',   icon: '✅', label: 'Habits' },
    { key: 'Add',      icon: '✚',  label: 'Add',  isCenter: true },
    { key: 'Stats',    icon: '📊', label: 'Stats' },
    { key: 'Settings', icon: '⚙️', label: 'More' },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const tab       = tabs[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type:   'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.centerTab}
              activeOpacity={0.8}
            >
              <View style={styles.centerButton}>
                <Text style={styles.centerIcon}>✚</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
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

// Placeholder Add screen
const AddScreen = () => (
  <View style={{ flex: 1, backgroundColor: Colors.background }} />
);

const AppNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <KarmaTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home"     component={HomeScreen} />
    <Tab.Screen name="Habits"   component={HabitsScreen} />
    <Tab.Screen name="Add"      component={AddScreen} />
    <Tab.Screen name="Stats"    component={StatsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:    'row',
    backgroundColor:  'rgba(5,10,24,0.97)',
    borderTopWidth:    1,
    borderTopColor:    Colors.borderBlue,
    paddingBottom:     Platform.OS === 'ios' ? 20 : 8,
    paddingTop:        10,
    paddingHorizontal: 8,
    alignItems:        'center',
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             2,
  },
  tabIcon: {
    fontSize: 18,
    opacity:  0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize:     8,
    color:        Colors.textDim,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.blue,
  },
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
    elevation:       8,
  },
  centerIcon: {
    fontSize:   22,
    color:      Colors.white,
    fontWeight: 'bold',
  },
});

export default AppNavigator;