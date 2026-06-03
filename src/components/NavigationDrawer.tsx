import React, {useCallback, useEffect, useRef} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {useNavigationMenu} from '../app/navigation/NavigationMenuContext';
import {LeftNavigationBar, SIDEBAR_WIDTH} from './LeftNavigationBar';

export function NavigationDrawer(): React.JSX.Element {
  const {isOpen, closeMenu} = useNavigationMenu();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slideAnim]);

  const handleBackdropPress = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  return (
    <Modal
      animationType="none"
      onRequestClose={closeMenu}
      transparent
      visible={isOpen}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.drawer, {transform: [{translateX: slideAnim}]}]}
        >
          <LeftNavigationBar onNavigate={closeMenu} />
        </Animated.View>

        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  drawer: {
    height: '100%',
    width: SIDEBAR_WIDTH,
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    flex: 1,
    flexDirection: 'row',
  },
});
