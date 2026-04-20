// ─── KARMA APP — ERROR BOUNDARY ─────────────────────────────────────
// Catches any unhandled React render errors.
// Shows a clean recovery screen instead of a white crash.

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar
} from 'react-native';
import { Colors } from '../constants/colors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:    false,
      error:       null,
      errorInfo:   null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ErrorBoundary caught an error:');
    console.error('Error:', error?.message);
    console.error('Stack:', errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  _handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

          {/* Karma wheel */}
          <Text style={styles.icon}>☸</Text>

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.message}>
            {this.state.error?.message ||
             'An unexpected error occurred. Karma is recalibrating.'}
          </Text>

          {/* Debug info — dev only */}
          {__DEV__ && this.state.errorInfo && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText} numberOfLines={5}>
                {this.state.errorInfo.componentStack}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this._handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <Text style={styles.subtext}>
            If this keeps happening, restart the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         32,
  },
  icon: {
    fontSize:    64,
    marginBottom: 16,
  },
  title: {
    fontSize:    22,
    color:       Colors.textPrimary,
    fontWeight:  'bold',
    marginBottom: 12,
    textAlign:   'center',
  },
  message: {
    fontSize:    14,
    color:       Colors.textMuted,
    textAlign:   'center',
    marginBottom: 24,
    lineHeight:  22,
  },
  debugBox: {
    backgroundColor: Colors.whiteDim,
    borderRadius:    8,
    padding:         12,
    width:           '100%',
    marginBottom:    20,
  },
  debugText: {
    fontSize:   10,
    color:      Colors.red,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 40,
    paddingVertical:   14,
    borderRadius:      16,
    marginBottom:      16,
  },
  buttonText: {
    color:      Colors.white,
    fontSize:   16,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 12,
    color:    Colors.textDim,
  },
});

export default ErrorBoundary;