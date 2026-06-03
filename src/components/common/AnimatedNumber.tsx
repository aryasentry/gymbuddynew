import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextStyle, StyleProp } from 'react-native';

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
  duration?: number;
}

// Smoothly counts up/down to the target value — feels alive on a 120Hz panel
export function AnimatedNumber({ value, style, suffix = '', duration = 700 }: Props) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{Math.round(display)}{suffix}</Text>;
}
