// ASSIGNMENT SCREEN - Natalia Cepeda & Steven Integration
// Pantalla para visualizar los detalles de una tarea y realizar envíos de texto.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { submitAssignment } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export default function AssignmentScreen({ route, navigation }) {
  const { activity, assignmentId, course, token } = route.params || {};

  // Moodle requiere el ID de la instancia de la tarea (instanceId)
  const actualAssignId = activity?.instanceId || assignmentId;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert("Campo vacío", "Por favor escribe tu respuesta antes de enviar.");
      return;
    }

    try {
      setLoading(true);
      const response = await submitAssignment(token, actualAssignId, text);

      if (response.status === "success") {
        setSubmitted(true);
        Alert.alert(
          "Éxito",
          "Tu tarea ha sido enviada correctamente al servidor Moodle.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", "No se pudo registrar tu entrega. Intenta nuevamente.");
      }
    } catch (error) {
      console.error("Error al enviar tarea:", error);
      Alert.alert("Error de Envío", error.message || "Ocurrió un error al enviar la tarea.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Sin fecha límite";
    const [year, month, day] = String(date).split("-");
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Entregar Tarea
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Tarjeta del Curso y Tarea */}
          <View style={styles.detailsCard}>
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{course?.shortname || "Curso"}</Text>
            </View>
            <Text style={styles.activityName}>{activity?.name || "Detalle de Tarea"}</Text>
            <Text style={styles.dueDate}>
              🗓️ Fecha límite: {formatDate(activity?.duedate)}
            </Text>
          </View>

          {/* Instrucciones de la Tarea */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrucciones</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>
                {activity?.description || "No hay instrucciones adicionales para esta tarea."}
              </Text>
            </View>
          </View>

          {/* Formulario de Entrega */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu entrega (Texto en línea)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe tu respuesta aquí..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={8}
              value={text}
              onChangeText={setText}
              editable={!loading && !submitted}
            />
          </View>

          {/* Botón de Enviar */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || submitted || !text.trim()) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={loading || submitted || !text.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.submitButtonText}>
                {submitted ? "✓ Tarea Enviada" : "Enviar Tarea"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    backgroundColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    ...spacing.shadow.small,
  },
  courseBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.sm,
  },
  courseBadgeText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  activityName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dueDate: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    fontWeight: "bold",
  },
  descriptionBox: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionText: {
    ...typography.body1,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  textInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    textAlignVertical: "top",
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 180,
    ...spacing.shadow.small,
  },
  submitButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    ...spacing.shadow.medium,
  },
  disabledButton: {
    backgroundColor: colors.textLight,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontWeight: "bold",
  },
});