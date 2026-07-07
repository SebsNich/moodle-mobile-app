// ASSIGNMENT SCREEN - Natalia Cepeda & Steven Integration
// Pantalla para visualizar los detalles de una tarea y realizar envíos de texto.

import React, { useState, useEffect } from "react";
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
  Linking,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  submitAssignment,
  getSubmissionStatus,
  uploadFileToMoodle,
  submitAssignmentForGrading,
} from "../services/moodleApi";
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

  // Estado de la entrega ya existente en Moodle (si la hay)
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState("new"); // "new" | "draft" | "submitted"
  const [previousFiles, setPreviousFiles] = useState([]); // archivos que ya estaban en Moodle

  // Archivos nuevos elegidos en esta sesión, pendientes de subir
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Al entrar a la pantalla, se consulta si el estudiante ya tiene algo entregado,
  // para no pisar un borrador ni hacer creer que nunca ha enviado nada.
  useEffect(() => {
    let isMounted = true;

    const checkExistingSubmission = async () => {
      if (!actualAssignId || !token) {
        setCheckingStatus(false);
        return;
      }
      try {
        const status = await getSubmissionStatus(token, actualAssignId);
        if (!isMounted) return;

        setSubmissionStatus(status.status);
        if (status.hasSubmission) {
          setText(status.text || "");
          setPreviousFiles(status.files || []);
          if (status.status === "submitted") {
            setSubmitted(true);
          }
        }
      } catch (error) {
        // No es bloqueante: si falla la consulta, el estudiante puede entregar igual desde cero
        console.warn("No se pudo verificar entregas previas:", error.message);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    };

    checkExistingSubmission();
    return () => {
      isMounted = false;
    };
  }, [actualAssignId, token]);

  // Abre el selector de archivos del dispositivo; permite elegir varios a la vez.
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets || [];
      setAttachments((prev) => [...prev, ...picked]);
    } catch (error) {
      console.error("Error al seleccionar archivo:", error);
      Alert.alert("Error", "No se pudo abrir el selector de archivos.");
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!text.trim() && attachments.length === 0) {
      Alert.alert(
        "Entrega vacía",
        "Escribe una respuesta o adjunta al menos un archivo antes de enviar."
      );
      return;
    }

    try {
      setLoading(true);

      // 1. Si hay archivos nuevos, primero se suben a Moodle (todos a la misma área de borrador)
      let fileItemId = null;
      if (attachments.length > 0) {
        setUploadingFiles(true);
        for (const file of attachments) {
          fileItemId = await uploadFileToMoodle(token, file, fileItemId);
        }
        setUploadingFiles(false);
      }

      // 2. Se guarda la entrega (texto + referencia a los archivos subidos)
      const response = await submitAssignment(token, actualAssignId, text, fileItemId);

      if (response.status === "success") {
        // 3. Si la tarea requiere confirmación explícita para calificación, se intenta.
        // Si no aplica, Moodle devuelve una excepción que se ignora silenciosamente.
        await submitAssignmentForGrading(token, actualAssignId);

        setSubmitted(true);
        setSubmissionStatus("submitted");
        setAttachments([]);
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
      setUploadingFiles(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Sin fecha límite";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      
      return `${day}/${month}/${year} a las ${hours}:${minutes}`;
    } catch (e) {
      return date;
    }
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

          {/* Estado de la entrega actual en Moodle */}
          {checkingStatus ? (
            <View style={styles.statusBanner}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.statusBannerText}>Verificando entregas previas...</Text>
            </View>
          ) : submissionStatus === "submitted" ? (
            <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
              <Text style={styles.statusBannerText}>
                ✓ Ya entregaste esta tarea. Puedes editarla y volver a enviarla.
              </Text>
            </View>
          ) : submissionStatus === "draft" ? (
            <View style={[styles.statusBanner, styles.statusBannerWarning]}>
              <Text style={styles.statusBannerText}>
                📝 Tienes un borrador guardado. Se cargó automáticamente abajo.
              </Text>
            </View>
          ) : null}

          {/* Archivos que ya estaban entregados en Moodle */}
          {previousFiles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Archivos ya entregados</Text>
              <View style={styles.descriptionBox}>
                {previousFiles.map((f, index) => (
                  <TouchableOpacity
                    key={`${f.filename}-${index}`}
                    style={styles.fileRow}
                    onPress={() => Linking.openURL(f.fileurl)}
                  >
                    <Text style={styles.fileRowIcon}>📎</Text>
                    <Text style={styles.fileRowName} numberOfLines={1}>
                      {f.filename}
                    </Text>
                    <Text style={styles.fileRowSize}>{formatFileSize(f.filesize)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
              editable={!loading}
            />
          </View>

          {/* Adjuntar Archivos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Archivos adjuntos</Text>

            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickFile}
              disabled={loading}
            >
              <Text style={styles.attachButtonText}>📎 Adjuntar archivo</Text>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <View style={styles.descriptionBox}>
                {attachments.map((file, index) => (
                  <View key={`${file.name}-${index}`} style={styles.fileRow}>
                    <Text style={styles.fileRowIcon}>📄</Text>
                    <Text style={styles.fileRowName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileRowSize}>{formatFileSize(file.size)}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(index)}
                      disabled={loading}
                      style={styles.removeFileButton}
                    >
                      <Text style={styles.removeFileButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Botón de Enviar */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || (!text.trim() && attachments.length === 0)) &&
                styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={loading || (!text.trim() && attachments.length === 0)}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.textWhite} />
                <Text style={styles.submitButtonText}>
                  {uploadingFiles ? " Subiendo archivos..." : " Enviando..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {submitted ? "Reenviar Tarea" : "Enviar Tarea"}
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statusBannerSuccess: {
    backgroundColor: "#e6f4ea",
    borderColor: colors.success,
  },
  statusBannerWarning: {
    backgroundColor: "#fef7e0",
    borderColor: colors.warning,
  },
  statusBannerText: {
    ...typography.body2,
    color: colors.textPrimary,
    flexShrink: 1,
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
  attachButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },
  attachButtonText: {
    color: colors.textWhite,
    fontWeight: "600",
    fontSize: 14,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  fileRowIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  fileRowName: {
    ...typography.body2,
    color: colors.textPrimary,
    flex: 1,
  },
  fileRowSize: {
    ...typography.caption,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
  removeFileButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  removeFileButtonText: {
    color: colors.error,
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
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