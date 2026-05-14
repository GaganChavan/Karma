// ─── KARMA APP — NAVIGATION (PHASE F-4) ──────────────────────────────
// Phase F-4: NotificationSettingsScreen added to stack
// Phase F-1: SIPMigrationScreen already handled in App.js (not navigator)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { useTheme, Typography }      from '../constants/colors';

import HomeScreen                from '../screens/HomeScreen';
import AddHabitScreen            from '../screens/AddHabitScreen';
import HabitDetailScreen         from '../screens/HabitDetailScreen';
import CelebrationScreen         from '../screens/CelebrationScreen';
import StatsScreen               from '../screens/StatsScreen';
import HistoryScreen             from '../screens/HistoryScreen';
import HabitsScreen              from '../screens/HabitsScreen';
import SettingsScreen            from '../screens/SettingsScreen';
import MoodLogScreen             from '../screens/MoodLogScreen';
import WeeklyReflectionScreen    from '../screens/WeeklyReflectionScreen';
import WFOModeScreen             from '../screens/WFOModeScreen';
import NeuralProgressScreen      from '../screens/NeuralProgressScreen';
import BeforeNowScreen           from '../screens/BeforeNowScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';  // Phase F-4
import KnowKarmaScreen            from '../screens/KnowKarmaScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const KarmaTabBar = ({ state, navigation }) => {
  const { colors } = useTheme();
  const tabs = [
    { name: 'Home',     label: 'Home' },
    { name: 'Habits',   label: 'Habits' },
    { name: 'AddTab',   label: 'Add', isCenter: true },
    { name: 'Stats',    label: 'Stats' },
    { name: 'Settings', label: 'More' },
  ];

  return (
    <View style={[styles.tabBar, {
      backgroundColor: colors.isDark !== false ? 'rgba(0,0,0,0.96)' : 'rgba(242,242,247,0.97)',
      borderTopColor:  colors.separator,
    }]}>
      {tabs.map((tab) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="add"
              style={styles.centerWrap}
              onPress={() => navigation.navigate('AddHabit')}
              activeOpacity={0.85}
            >
              <View style={[styles.centerBtn, { backgroundColor: colors.gold, shadowColor: colors.gold }]}>
                <Text style={styles.centerIcon}>+</Text>
              </View>
            </TouchableOpacity>
          );
        }
        const isFocused    = state.routes[state.index]?.name === tab.name;
        const routeIndex   = state.routes.findIndex(r => r.name === tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => { if (routeIndex >= 0) navigation.navigate(tab.name); }}
            activeOpacity={0.7}
          >
            <View style={[styles.tabInner, isFocused && { backgroundColor: colors.goldAlpha15 }]}>
              <Text style={[styles.tabLabel, {
                color:      isFocused ? colors.gold : colors.textDim,
                fontWeight: isFocused ? '700' : '500',
              }]}>
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
    {/* Core */}
    <Stack.Screen name="Main"        component={TabNavigator} />
    <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
    <Stack.Screen name="History"     component={HistoryScreen} />

    {/* Modals */}
    <Stack.Screen name="AddHabit"    component={AddHabitScreen}    options={{ presentation: 'modal', gestureEnabled: true }} />
    <Stack.Screen name="Celebration" component={CelebrationScreen} options={{ presentation: 'modal', gestureEnabled: false }} />
    <Stack.Screen name="MoodLog"     component={MoodLogScreen}     options={{ presentation: 'modal', gestureEnabled: true }} />

    {/* Phase B */}
    <Stack.Screen name="WeeklyReflection" component={WeeklyReflectionScreen} />

    {/* Phase D */}
    <Stack.Screen name="WFOMode"       component={WFOModeScreen} />
    <Stack.Screen name="NeuralProgress" component={NeuralProgressScreen} />
    <Stack.Screen name="BeforeNow"      component={BeforeNowScreen} />

    {/* Phase F-4 */}
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />

    {/* Phase F-5 */}
    <Stack.Screen name="KnowKarma" component={KnowKarmaScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar:     { flexDirection: 'row', borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 24 : 10, paddingTop: 12, paddingHorizontal: 8, alignItems: 'center' },
  tab:        { flex: 1, alignItems: 'center' },
  tabInner:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tabLabel:   { ...Typography.caption1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
  centerBtn:  { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  centerIcon: { fontSize: 28, color: '#000', fontWeight: '300', lineHeight: 30 },
});

export default AppNavigator;