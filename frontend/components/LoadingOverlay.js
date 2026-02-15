import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

const LoadingBike = ({ size = 120, color = '#4CAF50' }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Rahmen + Lenker + Sattel (stillstehend) */}
      <View style={[styles.frame, { borderColor: color }]}>
        {/* Vorderrad */}
        <Animated.View style={[styles.wheel, styles.frontWheel, { transform: [{ rotate: spin }] }]}>
          <View style={[styles.spokes, { backgroundColor: color }]} />
        </Animated.View>

        {/* Hinterrad */}
        <Animated.View style={[styles.wheel, styles.rearWheel, { transform: [{ rotate: spin }] }]}>
          <View style={[styles.spokes, { backgroundColor: color }]} />
        </Animated.View>

        {/* Lenker */}
        <View style={[styles.handlebar, { backgroundColor: color }]} />

        {/* Sattel */}
        <View style={[styles.saddle, { backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
    borderWidth: 6,
    borderRadius: 12,
    position: 'relative',
  },
  wheel: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 6,
    borderColor: '#388E3C', // dunkleres Grün für Rad
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frontWheel: {
    top: 20,
    left: 20,
  },
  rearWheel: {
    bottom: 20,
    right: 20,
  },
  spokes: {
    width: 4,
    height: 40,
    borderRadius: 2,
    position: 'absolute',
  },
  handlebar: {
    position: 'absolute',
    top: 10,
    left: 30,
    width: 60,
    height: 10,
    borderRadius: 5,
  },
  saddle: {
    position: 'absolute',
    top: 30,
    right: 40,
    width: 40,
    height: 12,
    borderRadius: 6,
  },
});

export default LoadingBike;