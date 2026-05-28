import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';

import MQTTService from './src/services/mqttService';
import StatusModal from './src/components/StatusModal';
import LightControl from './src/components/LightControl';
import Gauges from './src/components/Gauges';

import AsyncStorage from '@react-native-async-storage/async-storage';

const mqtt = new MQTTService();

export default function App() {

    const [isConnected, setIsConnected] = useState(false);
    const [showError, setShowError] = useState(false);

    const [isLightOn, setIsLightOn] = useState(false);

    const [temp, setTemp] = useState(0);
    const [hum, setHum] = useState(0);

    const [history, setHistory] = useState([]);

    const mqttConfig = {
        host: process.env.EXPO_PUBLIC_MQTT_HOST,
        port: parseInt(process.env.EXPO_PUBLIC_MQTT_PORT),
        path: "/mqtt",
        user: process.env.EXPO_PUBLIC_MQTT_USER,
        pass: process.env.EXPO_PUBLIC_MQTT_PASS,
        clientId: 'RN_App_' + Math.random(),
    };

    // =========================
    // SALVAR HISTÓRICO
    // =========================

    const saveSensorData = async (topic, value) => {

        try {

            const existingData = await AsyncStorage.getItem('sensorHistory');

            let historyData = existingData
                ? JSON.parse(existingData)
                : [];

            const newData = {
                topic,
                value,
                timestamp: new Date().toLocaleString(),
            };

            historyData.push(newData);

            await AsyncStorage.setItem(
                'sensorHistory',
                JSON.stringify(historyData)
            );

            setHistory(historyData);

        } catch (error) {

            console.log('Erro ao salvar:', error);

        }
    };

    // =========================
    // CARREGAR HISTÓRICO
    // =========================

    const loadHistory = async () => {

        try {

            const data = await AsyncStorage.getItem('sensorHistory');

            if (data) {

                setHistory(JSON.parse(data));

            }

        } catch (error) {

            console.log('Erro ao carregar:', error);

        }
    };

    // =========================
    // INICIAR APP
    // =========================

    useEffect(() => {

        loadHistory();

        startConnection();

    }, []);

    // =========================
    // CONEXÃO MQTT
    // =========================

    const startConnection = () => {

        setShowError(false);

        console.log(mqttConfig);

        mqtt.connect(

            mqttConfig,

            (topic, message) => {

                const value = parseFloat(message);

                // TEMPERATURA
                if (topic === 'casa/temp') {

                    setTemp(value);

                    saveSensorData('Temperatura', value);

                }

                // UMIDADE
                if (topic === 'casa/umid') {

                    setHum(value);

                    saveSensorData('Umidade', value);

                }

                // LUZ
                if (topic === 'casa/luz') {

                    setIsLightOn(message === "1");

                }
            },

            () => {

                setIsConnected(true);

                mqtt.subscribe('casa/temp');
                mqtt.subscribe('casa/umid');
                mqtt.subscribe('casa/luz');

            },

            (err) => {

                console.log(err);

                setIsConnected(false);

                setShowError(true);

            }
        );
    };

    // =========================
    // BOTÃO LUZ
    // =========================

    const toggleLight = () => {

        const newState = isLightOn ? "0" : "1";

        mqtt.publish('casa/luz', newState);

    };

    // =========================
    // INTERFACE
    // =========================

    return (

        <ScrollView
            style={styles.container}
            contentContainerStyle={{
                alignItems: 'center',
                paddingBottom: 40,
            }}
        >

            <Text style={styles.header}>
                Smart Home IoT
            </Text>

            <Text style={styles.status}>
                {isConnected
                    ? '🟢 Conectado'
                    : '🔴 Desconectado'}
            </Text>

            <LightControl
                isLightOn={isLightOn}
                onToggle={toggleLight}
            />

            <Gauges
                temp={temp}
                hum={hum}
            />

            {/* HISTÓRICO */}

            <View style={styles.historyContainer}>

                <Text style={styles.historyTitle}>
                    Histórico dos Sensores
                </Text>

                {
                    history.length === 0 && (
                        <Text style={styles.historyText}>
                            Nenhum dado salvo
                        </Text>
                    )
                }

                {
                    history
                        .slice(-10)
                        .reverse()
                        .map((item, index) => (

                            <View
                                key={index}
                                style={styles.historyItem}
                            >

                                <Text style={styles.historyText}>
                                    {item.topic}: {item.value}
                                </Text>

                                <Text style={styles.timeText}>
                                    {item.timestamp}
                                </Text>

                            </View>

                        ))
                }

            </View>

            {/* MODAL */}

            <StatusModal
                visible={showError}
                onRetry={startConnection}
                onLater={() => setShowError(false)}
            />

        </ScrollView>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },

    header: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 40,
        marginBottom: 10,
    },

    status: {
        color: '#AAA',
        fontSize: 16,
        marginBottom: 20,
    },

    historyContainer: {
        width: '100%',
        backgroundColor: '#1E1E1E',
        padding: 15,
        borderRadius: 15,
        marginTop: 20,
    },

    historyTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
    },

    historyItem: {
        backgroundColor: '#2A2A2A',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },

    historyText: {
        color: '#FFF',
        fontSize: 16,
    },

    timeText: {
        color: '#AAA',
        fontSize: 12,
        marginTop: 5,
    },
});