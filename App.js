import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [laps, setLaps] = useState([]);
  const [lastLapTime, setLastLapTime] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState); // Оголошуємо локальний стан для appState

  useEffect(() => {
    let interval;
    if (isRunning) {
      const startTime = Date.now() - timeElapsed;
      interval = setInterval(() => {
        const currentTime = Date.now() - startTime;
        setTimeElapsed(currentTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeElapsed]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // Додаток повернувся в активний стан
      } else if (nextAppState.match(/inactive|background/)) {
        // Додаток перейшов у фоновий режим
        scheduleNotification(timeElapsed);
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, timeElapsed]);

  async function scheduleNotification(time) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Секундомір у фоні',
        body: `Актуальний час: ${formatTime(time)}`,
        data: { time: formatTime(time) },
      },
      trigger: { seconds: 1 }, // Затримка для демонстрації, може бути змінена або видалена
    });
  }

  const handleLap = useCallback(() => {
    const lapTime = timeElapsed - lastLapTime;
    setLaps((currentLaps) => [...currentLaps, lapTime]);
    setLastLapTime(timeElapsed);
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Круг записано!",
        body: `Час кругу: ${formatTime(lapTime)}`,
      },
      trigger: null,
    });
  }, [timeElapsed, lastLapTime]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeElapsed(0);
    setLaps([]);
    setLastLapTime(0);
  }, []);

  const formatTime = useCallback((time) => {
    const minutes = Math.floor(time / 60000) % 60;
    const seconds = Math.floor(time / 1000) % 60;
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds)}`;
  }, []);

  const pad = useCallback((num, size = 2) => num.toString().padStart(size, '0'), []);

  const saveState = useCallback(async () => {
    const stateToSave = { isRunning, timeElapsed, laps, lastLapTime };
    try {
      await AsyncStorage.setItem('stopwatchState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [isRunning, timeElapsed, laps, lastLapTime]);

  const restoreState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem('stopwatchState');
      if (savedState) {
        const { isRunning, timeElapsed, laps, lastLapTime } = JSON.parse(savedState);
        setIsRunning(isRunning);
        setTimeElapsed(timeElapsed);
        setLaps(laps);
        setLastLapTime(lastLapTime);
      }
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(timeElapsed)}</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity onPress={reset} style={[styles.button, styles.buttonReset]} disabled={isRunning || timeElapsed === 0}>
          <Text style={styles.buttonText}>Стерти</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsRunning(!isRunning)} style={[styles.button, isRunning ? styles.buttonStop : styles.buttonStart]}>
          <Text style={styles.buttonText}>{isRunning ? 'Стоп' : 'Старт'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLap} style={[styles.button, styles.buttonLap]} disabled={!isRunning}>
          <Text style={styles.buttonText}>Круг</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.lapsList}>
        {laps.map((lap, index) => (
          <View key={index} style={styles.lap}>
            <Text style={styles.lapText}>{`Круг ${index + 1}`}</Text>
            <Text style={styles.lapTime}>{formatTime(lap)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  timer: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '200',
    padding: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 30,
    justifyContent: 'space-around',
  },
  button: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
  },
  buttonStart: {
    backgroundColor: '#4CAF50',
  },
  buttonStop: {
    backgroundColor: '#F44336',
  },
  buttonReset: {
    backgroundColor: 'orange',
  },
  buttonLap: {
    backgroundColor: '#2196F3',
  },
  lapsList: {
    marginTop: 30,
    alignSelf: 'stretch',
  },
  lap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderColor: '#424242',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  lapText: {
    color: '#FFF',
    fontSize: 16,
  },
  lapTime: {
    color: '#FFF',
    fontSize: 16,
  },
});
