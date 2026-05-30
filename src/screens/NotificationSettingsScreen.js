// ─── KARMA APP — NOTIFICATION SETTINGS SCREEN (PHASE F-4) ───────────
// Configurable notification builder.
// User can: toggle each notification, change time, change message, pick days.
// Changes saved to settings key 'notification_configs' as JSON.
// On save, reschedules all notifications immediately.
//
// Day format stored: Expo weekday numbers (1=Sun, 2=Mon...7=Sat)
// Display format: M T W T F S S (index 0=Mon...6=Sun for UI)

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, TextInput, Switch, Modal,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import {
  getNotificationConfigs, scheduleConfigurableNotifications,
  DEFAULT_NOTIFICATION_CONFIGS,
} from '../services/notificationService';
import { setSetting } from '../database/habitService';

// ── Day display config ────────────────────────────────────────────────
// UI: Mon=0...Sun=6 (display order)
// Expo weekday: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
const DAYS_UI = [
  { label: 'M', expoDay: 2, display: 'Mon' },
  { label: 'T', expoDay: 3, display: 'Tue' },
  { label: 'W', expoDay: 4, display: 'Wed' },
  { label: 'T', expoDay: 5, display: 'Thu' },
  { label: 'F', expoDay: 6, display: 'Fri' },
  { label: 'S', expoDay: 7, display: 'Sat' },
  { label: 'S', expoDay: 1, display: 'Sun' },
];

const NOTIFICATION_ICONS = {
  morning_intention: '🌅',
  evening_log:       '🌙',
  streak_protection: '🔥',
  sunday_reflection: '📖',
  pattern_warning:   '⚡',
  custom:            '🔔',
};

// ── Day Picker Row ────────────────────────────────────────────────────
const DayPicker = ({ selectedDays, onChange, colors }) => (
  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
    {DAYS_UI.map((d, i) => {
      const isSelected = selectedDays.includes(d.expoDay);
      return (
        <TouchableOpacity
          key={i}
          style={{
            width: 36, height: 36, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5,
            borderColor:     isSelected ? colors.gold : colors.separator,
            backgroundColor: isSelected ? colors.goldAlpha15 : colors.backgroundCard,
          }}
          onPress={() => {
            const next = isSelected
              ? selectedDays.filter(x => x !== d.expoDay)
              : [...selectedDays, d.expoDay];
            if (next.length === 0) return; // must have at least 1 day
            onChange(next);
          }}
        >
          <Text style={{
            ...Typography.caption2,
            color:      isSelected ? colors.gold : colors.textDim,
            fontWeight: isSelected ? '700' : '400',
          }}>
            {d.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Notification Card ─────────────────────────────────────────────────
const NotifCard = ({ config, onUpdate, onDelete, colors }) => {
  const [expanded, setExpanded] = useState(false);
  const icon = NOTIFICATION_ICONS[config.id] || '🔔';

  const selectedDayLabels = DAYS_UI
    .filter(d => config.days.includes(d.expoDay))
    .map(d => d.display)
    .join(', ');

  return (
    <View style={{
      backgroundColor: colors.backgroundCard,
      borderRadius: Radius.lg,
      borderWidth: config.enabled ? 1.5 : 1,
      borderColor: config.enabled ? colors.gold + '40' : colors.separator,
      marginBottom: Spacing.md,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md }}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600' }}>
            {config.name}
          </Text>
          <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>
            {config.time} · {selectedDayLabels}
          </Text>
        </View>
        <Switch
          value={config.enabled}
          onValueChange={(v) => onUpdate({ ...config, enabled: v })}
          trackColor={{ false: colors.separator, true: colors.goldAlpha40 }}
          thumbColor={config.enabled ? colors.gold : colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded editor */}
      {expanded && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.separator }}>

          {/* Time picker */}
          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>TIME</Text>
            <TextInput
              style={{
                ...Typography.body,
                color:           colors.textPrimary,
                backgroundColor: colors.backgroundElevated,
                borderRadius:    Radius.md,
                borderWidth:     1,
                borderColor:     colors.separator,
                padding:         Spacing.md,
                textAlign:       'center',
                letterSpacing:   2,
              }}
              value={config.time}
              onChangeText={(v) => onUpdate({ ...config, time: v })}
              placeholder="HH:MM  e.g. 06:30"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>

          {/* Message editor */}
          <View style={{ gap: Spacing.sm }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>MESSAGE</Text>
            <TextInput
              style={{
                ...Typography.callout,
                color:           colors.textPrimary,
                backgroundColor: colors.backgroundElevated,
                borderRadius:    Radius.md,
                borderWidth:     1,
                borderColor:     colors.separator,
                padding:         Spacing.md,
                minHeight:       64,
                textAlignVertical: 'top',
              }}
              value={config.message}
              onChangeText={(v) => onUpdate({ ...config, message: v })}
              placeholder="Notification message..."
              placeholderTextColor={colors.textPlaceholder}
              multiline
              maxLength={120}
            />
            <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'right' }}>
              {(config.message || '').length}/120
            </Text>
          </View>

          {/* Day picker */}
          <View style={{ gap: Spacing.sm }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>
              DAYS · {selectedDayLabels}
            </Text>
            <DayPicker
              selectedDays={config.days || []}
              onChange={(days) => onUpdate({ ...config, days })}
              colors={colors}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.separator }}
                onPress={() => onUpdate({ ...config, days: [2,3,4,5,6] })}
              >
                <Text style={{ ...Typography.caption2, color: colors.textMuted }}>Mon–Fri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.separator }}
                onPress={() => onUpdate({ ...config, days: [7,1] })}
              >
                <Text style={{ ...Typography.caption2, color: colors.textMuted }}>Weekends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.separator }}
                onPress={() => onUpdate({ ...config, days: [1,2,3,4,5,6,7] })}
              >
                <Text style={{ ...Typography.caption2, color: colors.textMuted }}>Every day</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delete (only for custom notifications) */}
          {config.id.startsWith('custom_') && (
            <TouchableOpacity onPress={() => onDelete(config.id)}>
              <Text style={{ ...Typography.callout, color: colors.red, textAlign: 'center' }}>
                Delete Notification
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────
const NotificationSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [configs,  setConfigs]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { _load(); }, []);

  const _load = async () => {
    try {
      const c = await getNotificationConfigs();
      setConfigs(c);
    } catch (e) {
      console.warn('NotifSettings load:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const _updateConfig = (updated) => {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const _deleteConfig = (id) => {
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setConfigs(prev => prev.filter(c => c.id !== id));
      }},
    ]);
  };

  const _addCustom = () => {
    const newConfig = {
      id:      `custom_${Date.now()}`,
      name:    'Custom Notification',
      enabled: true,
      time:    '09:00',
      message: 'Your karma awaits.',
      days:    [2, 3, 4, 5, 6, 7, 1],
    };
    setConfigs(prev => [...prev, newConfig]);
  };

  const _resetDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will restore all 5 default notifications and remove any custom ones.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => {
          setConfigs(DEFAULT_NOTIFICATION_CONFIGS);
        }},
      ]
    );
  };

  const _save = async () => {
    // Validate times
    for (const c of configs) {
      if (!c.enabled) continue;
      const parts = (c.time || '').split(':');
      if (parts.length !== 2) {
        Alert.alert('Invalid Time', `"${c.name}" has an invalid time: "${c.time}". Use HH:MM format.`);
        return;
      }
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        Alert.alert('Invalid Time', `"${c.name}" time "${c.time}" is not valid. Use 00:00 to 23:59.`);
        return;
      }
    }

    setSaving(true);
    try {
      await setSetting('notification_configs', JSON.stringify(configs));
      await scheduleConfigurableNotifications();
      Alert.alert(
        '✅ Saved',
        `${configs.filter(c => c.enabled).length} notification${configs.filter(c => c.enabled).length !== 1 ? 's' : ''} active.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', `Couldn't save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  const activeCount = configs.filter(c => c.enabled).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Notifications</Text>
        <TouchableOpacity onPress={_save} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.gold} />
            : <Text style={{ ...Typography.body, color: colors.gold, fontWeight: '700' }}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Status */}
        <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.lg, marginBottom: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Text style={{ fontSize: 24 }}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ ...Typography.callout, color: colors.gold, fontWeight: '600' }}>
              {activeCount} notification{activeCount !== 1 ? 's' : ''} active
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2, lineHeight: 17 }}>
              Tap any card to expand and edit. Toggle the switch to enable/disable.
            </Text>
          </View>
        </View>

        {/* Notification cards */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5, marginBottom: Spacing.md }}>
          NOTIFICATIONS · {configs.length}
        </Text>

        {configs.map(config => (
          <NotifCard
            key={config.id}
            config={config}
            onUpdate={_updateConfig}
            onDelete={_deleteConfig}
            colors={colors}
          />
        ))}

        {/* Add custom */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: colors.blue + '50', borderStyle: 'dashed', paddingVertical: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.xl }}
          onPress={_addCustom}
        >
          <Text style={{ fontSize: 20, color: colors.blue }}>+</Text>
          <Text style={{ ...Typography.callout, color: colors.blue }}>Add Custom Notification</Text>
        </TouchableOpacity>

        {/* Help */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg }}>
          <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>HOW DAYS WORK</Text>
          <Text style={{ ...Typography.caption1, color: colors.textDim, lineHeight: 18 }}>
            Each selected day fires a separate weekly notification. E.g. if you select Mon–Fri, you get 5 notifications per week at the same time.{'\n\n'}
            The <Text style={{ color: colors.gold }}>Evening Log Reminder</Text> defaults to Mon–Fri because you tend to open the app on weekends already. Change this to all 7 if you prefer.{'\n\n'}
            The <Text style={{ color: colors.gold }}>Sunday Reflection</Text> is Sunday only — triggered at 8 PM to help you reflect on the week.
          </Text>
        </View>

        {/* Reset defaults */}
        <TouchableOpacity onPress={_resetDefaults} style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
          <Text style={{ ...Typography.callout, color: colors.textMuted }}>Reset to Defaults</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsScreen;