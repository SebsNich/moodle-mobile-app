// LOGIN SCREEN - Sebastian & Steven Integration
// Pantalla de autenticación real con Google OAuth 2.0 y validación de correo en Moodle

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { loginWithGoogle } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

// Permite completar la redirección del navegador seguro
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  
  // Caja de texto opcional para simular correos alternativos de manera rápida en desarrollo
  const [emailInput, setEmailInput] = useState("");

  // Configuración de Google Sign-In
  // STEVEN: Registra tu proyecto en Google Cloud Console y obtén tus Client IDs.
  // Requisitos para probar en Expo Go: registrar el redirect URI de Expo.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "TU-ANDROID-CLIENT-ID.apps.googleusercontent.com",
    iosClientId: "TU-IOS-CLIENT-ID.apps.googleusercontent.com",
    webClientId: "TU-WEB-CLIENT-ID.apps.googleusercontent.com", // Necesario para Expo Go / Web Redirect
  });

  // Escuchar cuando el flujo de Google responda con éxito
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchGoogleUserProfile(authentication.accessToken);
      }
    }
  }, [response]);

  // Obtener el perfil del usuario de Google
  const fetchGoogleUserProfile = async (accessToken) => {
    try {
      setLoading(true);
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();

      if (profile?.email) {
        await performMoodleLogin(profile.email);
      } else {
        throw new Error("No se pudo obtener el correo desde tu cuenta de Google.");
      }
    } catch (error) {
      console.error("Error al obtener datos de Google:", error);
      Alert.alert("Error de Google", "No se pudo recuperar tu información de Google.");
      setLoading(false);
    }
  };

  // Validar el correo en Moodle e iniciar sesión
  const performMoodleLogin = async (email) => {
    try {
      setLoading(true);
      const moodleSession = await loginWithGoogle(email);

      if (moodleSession.token) {
        // Guardamos la sesión y navegamos
        navigation.replace("Courses", {
          token: moodleSession.token,
          user: moodleSession.user,
        });
      } else {
        Alert.alert("Error", "No se pudo validar el correo en tu servidor Moodle.");
      }
    } catch (error) {
      console.error("Error al validar sesión en Moodle:", error);
      Alert.alert(
        "Acceso Denegado",
        error.message || "Tu correo de Google no coincide con ningún usuario registrado en Moodle."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Si el usuario escribe manualmente un correo en el campo de prueba,
    // simulamos el login directo con ese correo para facilitar el testeo de roles.
    if (emailInput.trim()) {
      await performMoodleLogin(emailInput.trim());
      return;
    }

    // Flujo real de Google OAuth 2.0
    if (request) {
      try {
        setLoading(true);
        const result = await promptAsync();
        if (result?.type !== "success") {
          setLoading(false); // Si canceló o falló, apagamos la carga
        }
      } catch (err) {
        console.error("Error de promptAsync:", err);
        setLoading(false);
      }
    } else {
      // Modo demostrativo por defecto
      Alert.alert(
        "Simulación de Login",
        "Como estás en desarrollo local sin Client IDs configurados, simularemos el login con tu correo de administrador.\n\n(También puedes escribir cualquier correo en la casilla de arriba para probar).",
        [
          {
            text: "Cancelar",
            onPress: () => setLoading(false),
            style: "cancel",
          },
          {
            text: "Iniciar como Admin",
            onPress: () => performMoodleLogin("john.quijijetov@ug.edu.ec"),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MoodleMobile</Text>
        <Text style={styles.subtitle}>
          Accede a tu campus virtual desde cualquier lugar
        </Text>
      </View>

      {/* Caja de Login y Pruebas */}
      <View style={styles.loginContainer}>
        {/* Campo de simulador de correos */}
        <Text style={styles.testLabel}>Entorno de Desarrollo:</Text>
        <TextInput
          style={styles.emailInput}
          placeholder="Escribe un correo para simular login..."
          placeholderTextColor={colors.textLight}
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.disabledButton]}
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
    </SafeAreaView>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + spacing.lg : spacing.xxl,
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
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    ...spacing.shadow.medium,
  },
  testLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    alignSelf: "flex-start",
    marginBottom: 4,
    fontWeight: "bold",
  },
  emailInput: {
    width: "100%",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: "center",
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
  disabledButton: {
    backgroundColor: colors.textLight,
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
    color: colors.textLight,
  },
});