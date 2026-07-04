// SPLASH SCREEN
// Pantalla de bienvenida inicial

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export default function SplashScreen({ navigation }) {
    useEffect(() => {
        // Espera 2 segundos y navega al Login
        const timer = setTimeout(() => {
        navigation.replace("Login");
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
        <Text style={styles.title}>MoodleMobile</Text>
        <Text style={styles.subtitle}>Universidad de Guayaquil</Text>
        <ActivityIndicator
            size="large"
            color={colors.white}
            style={styles.loader}
        />
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: colors.white,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body1,
        color: colors.white,
        opacity: 0.8,
        marginBottom: spacing.xl,
    },
    loader: {
        marginTop: spacing.md,
    },
});