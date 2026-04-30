// ============================================================
// KARMA — QuantifiableCheckinModal.js
// Save as: src/components/QuantifiableCheckinModal.js
//
// USAGE in HabitDetailScreen.js:
//   import QuantifiableCheckinModal from '../components/QuantifiableCheckinModal';
//
//   // State:
//   const [showValueModal, setShowValueModal] = useState(false);
//   const [pendingCheckin, setPendingCheckin] = useState(null);
//
//   // When user taps Done on a quantifiable habit:
//   const handleMarkDone = () => {
//     if (habit.is_quantifiable) {
//       setPendingCheckin({ status: 'done' });
//       setShowValueModal(true);
//     } else {
//       performCheckin('done', null);
//     }
//   };
//
//   // Render:
//   <QuantifiableCheckinModal
//     visible={showValueModal}
//     habit={habit}
//     onConfirm={(value) => {
//       setShowValueModal(false);
//       performCheckin(pendingCheckin.status, value);
//     }}
//     onCancel={() => setShowValueModal(false)}
//   />
//
// In performCheckin, pass value to saveCheckin:
//   await saveCheckin(habit.id, today, status, note, value);
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';

const QuantifiableCheckinModal = ({ visible, habit, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(null); // 'under' | 'exact' | 'over'

  const target = habit?.daily_target || 0;
  const unit = habit?.unit || '';

  useEffect(() => {
    if (visible) {
      setValue('');
      setFeedback(null);
    }
  }, [visible]);

  const handleChange = (text) => {
    // Only allow numbers
    const clean = text.replace(/[^0-9]/g, '');
    setValue(clean);

    const num = parseInt(clean);
    if (!isNaN(num) && target > 0) {
      if (num < target) setFeedback('under');
      else if (num === target) setFeedback('exact');
      else setFeedback('over');
    } else {
      setFeedback(null);
    }
  };

  const handleConfirm = () => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) return; // Don't allow 0 or empty
    onConfirm(num);
  };

  const feedbackConfig = {
    under: {
      emoji: '💪',
      color: '#E8A838',
      // XP will be proportional
      text: `${Math.round((parseInt(value) / target) * 100)}% of target — partial XP awarded. Still counts!`,
    },
    exact: {
      emoji: '🎯',
      color: '#FFD700',
      text: `Exactly on target — full XP!`,
    },
    over: {
      emoji: '🔥',
      color: '#4CAF50',
      text: `Beyond target — bonus XP! The rein held strong.`,
    },
  };

  const fb = feedback ? feedbackConfig[feedback] : null;
  const numValue = parseInt(value) || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onCancel} activeOpacity={1} />

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Habit name */}
          <Text style={[styles.habitName, { color: colors.textMuted }]}>
            {habit?.icon} {habit?.name}
          </Text>

          {/* Question */}
          <Text style={[styles.question, { color: colors.text }]}>
            How many {unit} did you actually do?
          </Text>

          {/* Target reminder */}
          <Text style={[styles.target, { color: colors.textMuted }]}>
            🎯 Target: {target} {unit}
          </Text>

          {/* Number input */}
          <View style={[styles.inputWrap, { borderColor: fb?.color || colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              keyboardType="number-pad"
              value={value}
              onChangeText={handleChange}
              placeholder={`Enter ${unit}...`}
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
            {unit ? (
              <Text style={[styles.unitLabel, { color: colors.textMuted }]}>{unit}</Text>
            ) : null}
          </View>

          {/* Progress bar */}
          {numValue > 0 && target > 0 && (
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round((numValue / target) * 100))}%`,
                    backgroundColor: fb?.color || '#FFD700',
                  },
                ]}
              />
            </View>
          )}

          {/* Feedback message */}
          {fb && (
            <View style={[styles.feedbackBox, { borderColor: fb.color + '40' }]}>
              <Text style={styles.feedbackEmoji}>{fb.emoji}</Text>
              <Text style={[styles.feedbackText, { color: fb.color }]}>{fb.text}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: numValue > 0 ? (fb?.color || '#FFD700') : colors.border },
              ]}
              onPress={handleConfirm}
              disabled={numValue <= 0}
            >
              <Text style={[styles.confirmText, { color: numValue > 0 ? '#000' : colors.textMuted }]}>
                Log {numValue > 0 ? `${numValue} ${unit}` : '—'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip option — for days you genuinely couldn't do */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => onConfirm(0)} // 0 = skipped/partial
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              Skip logging (mark as skipped instead)
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 8,
  },
  habitName: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  target: {
    fontSize: 13,
    textAlign: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  feedbackEmoji: {
    fontSize: 20,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 12,
  },
});

export default QuantifiableCheckinModal;