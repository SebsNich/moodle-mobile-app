// LOGIN SCREEN
// Pantalla de autenticación con Google OAuth 2.0

import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { loginWithGoogle } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export default function LoginScreen({ navigation }) {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
        setLoading(true);

        // TODO STEVEN: reemplazar con token real de Google OAuth 2.0
        const googleToken = "mock-google-token";

        const response = await loginWithGoogle(googleToken);

        if (response.token) {
            navigation.replace("Courses", {
            token: response.token,
            user: response.user,
            });
        } else {
            Alert.alert("Error", "No se pudo iniciar sesión. Intenta de nuevo.");
        }
        } catch (error) {
        Alert.alert("Error", "Ocurrió un error al iniciar sesión.");
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>MoodleMobile</Text>
            <Text style={styles.subtitle}>
            Accede a tu campus virtual desde cualquier lugar
            </Text>
        </View>

        {/* Botón Google */}
        <View style={styles.loginContainer}>
            <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color={colors.textWhite} />
            ) : (
                <Text style={styles.googleButtonText}>
                🔐 Iniciar sesión con Google
                </Text>
            )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
            Usa tu cuenta institucional de la Universidad de Guayaquil
            </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
            <Text style={styles.footerText}>
            Universidad de Guayaquil — DAM 2025-2026
            </Text>
        </View>
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    header: {
        alignItems: "center",
        marginTop: spacing.xl,
    },
    title: {
        ...typography.h1,
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body1,
        color: colors.textSecondary,
        textAlign: "center",
    },
    loginContainer: {
        width: "100%",
        alignItems: "center",
    },
    googleButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: spacing.borderRadius.md,
        width: "100%",
        alignItems: "center",
        ...spacing.shadow.medium,
    },
    googleButtonText: {
        ...typography.button,
        color: colors.textWhite,
    },
    disclaimer: {
        marginTop: spacing.md,
        ...typography.label,
        color: colors.textLight,
        textAlign: "center",
    },
    footer: {
        alignItems: "center",
    },
    footerText: {
        ...typography.caption,
        color: colors.border,
    },
});