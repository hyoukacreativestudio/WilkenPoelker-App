import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureError } from '../../config/sentry';

const defaultColors = {
  background: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  error: '#F44336',
  primary: '#2E7D32',
  card: '#FFFFFF',
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report to Sentry
    try {
      captureError(error, {
        componentStack: errorInfo?.componentStack,
        boundary: this.props.name || 'ErrorBoundary',
      });
    } catch (_) { /* Sentry not available */ }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // If a custom fallback is provided, use it
    if (this.props.fallback) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} onReset={this.handleReset} />;
    }

    const colors = this.props.colors || defaultColors;
    const isScreenLevel = this.props.level === 'screen';

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name={isScreenLevel ? 'reload-alert' : 'alert-circle-outline'}
          size={isScreenLevel ? 48 : 64}
          color={colors.error}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          {this.props.title || 'Etwas ist schiefgelaufen'}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {isScreenLevel
            ? 'Dieser Bereich hat einen Fehler. Versuche es erneut.'
            : 'Ein unerwarteter Fehler ist aufgetreten. Bitte starte die App neu.'}
        </Text>

        {__DEV__ && this.state.error && (
          <ScrollView style={styles.debugContainer} horizontal={false}>
            <Text style={styles.debugText}>
              {this.state.error.toString()}
            </Text>
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={this.handleReset}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="restart"
            size={20}
            color={colors.card}
            style={styles.buttonIcon}
          />
          <Text style={[styles.buttonText, { color: colors.card }]}>
            {this.props.resetLabel || (isScreenLevel ? 'Erneut versuchen' : 'Neu starten')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  debugContainer: {
    marginTop: 16,
    maxHeight: 120,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#D32F2F',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
