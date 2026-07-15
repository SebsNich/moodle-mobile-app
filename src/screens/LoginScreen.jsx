// LOGIN SCREEN - Sebastian & Steven Integration
// Pantalla de autenticación real con Google OAuth 2.0 y validación de correo en Moodle
// Configurado con Google Sign-In Nativo para cargar las cuentas del celular directamente.

import React, { useState } from "react";
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
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { loginWithGoogle } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

// Configuración inicial de Google Sign-in Nativo
GoogleSignin.configure({
  webClientId: "189645847735-l0a3n6eudpgvbokl5bmbm5j5tbbprt0i.apps.googleusercontent.com", // Tu ID de Cliente Web de Google Cloud Console
  offlineAccess: false,
});

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");

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
    try {
      setLoading(true);
      
      // Comprobar la disponibilidad de Google Play Services en el teléfono
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Cerrar sesión previa de Google para asegurar que siempre muestre el selector de cuentas
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("No había sesión activa de Google para cerrar");
      }
      
      // Lanzar el selector de cuentas nativo de Google Play Services
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-In Exitoso:", userInfo);

      // Extraer el correo de la cuenta de Google seleccionada
      const email = userInfo.data?.user?.email || userInfo.user?.email;
      
      if (email) {
        await performMoodleLogin(email);
      } else {
        throw new Error("No se pudo obtener el correo de tu cuenta de Google.");
      }
    } catch (error) {
      console.error("Error en Google Sign-In Nativo:", error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // El usuario canceló la selección de cuenta
        console.log("El usuario canceló el inicio de sesión.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operación ya en curso
        console.log("Inicio de sesión en curso.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Servicios no Disponibles",
          "Google Play Services no está disponible en este dispositivo."
        );
      } else {
        Alert.alert(
          "Error de Inicio de Sesión",
          error.message || "No se pudo recuperar la información de Google."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MoodleMobile</Text>
        <Text style={styles.subtitle}>
          Accede a tu campus virtual desde cualquier lugar
        </Text>
      </View>

      {/* Caja de Login */}
      <View style={styles.loginContainer}>
        {/* Campo de simulador de correos rápido */}
        <Text style={styles.testLabel}>Entorno de Desarrollo (Simulador):</Text>
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

        {emailInput.trim() ? (
          <TouchableOpacity
            style={[styles.simulatedButton, loading && styles.disabledButton]}
            onPress={() => performMoodleLogin(emailInput.trim())}
            disabled={loading}
          >
            <Text style={styles.simulatedButtonText}>
              Ingresar con correo
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.disabledButton]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.googleButtonText}>
              Iniciar sesion con google
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
  simulatedButton: {
    backgroundColor: "#34A853",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.borderRadius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
    ...spacing.shadow.medium,
  },
  simulatedButtonText: {
    ...typography.button,
    color: colors.textWhite,
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