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
import * as FileSystem from "expo-file-system/legacy";

const getMimeType = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    txt: "text/plain",
    zip: "application/zip",
  };
  return mimeTypes[ext] || "application/octet-stream";
};
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
 
  const isPastDeadline = activity?.duedate ? new Date() > new Date(activity.duedate) : false;

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
          
          if (status.files && status.files.length > 0) {
            const downloadedAttachments = [];
            for (const f of status.files) {
              try {
                const localUri = `${FileSystem.cacheDirectory}${f.filename}`;
                await FileSystem.downloadAsync(f.fileurl, localUri);
                downloadedAttachments.push({
                  name: f.filename,
                  size: f.filesize,
                  uri: localUri,
                  originalUrl: f.fileurl,
                  mimeType: getMimeType(f.filename),
                });
              } catch (downloadError) {
                console.error("Error al descargar archivo previo:", f.filename, downloadError);
                downloadedAttachments.push({
                  name: f.filename,
                  size: f.filesize,
                  uri: f.fileurl,
                  originalUrl: f.fileurl,
                });
              }
            }
            setAttachments(downloadedAttachments);
          }

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

  const handleOpenFile = async (file) => {
    try {
      const urlToOpen = file.originalUrl || file.uri;
      if (urlToOpen) {
        const supported = await Linking.canOpenURL(urlToOpen);
        if (supported) {
          await Linking.openURL(urlToOpen);
        } else {
          Alert.alert("Archivo local", `El archivo "${file.name}" está listo para enviarse.`);
        }
      }
    } catch (error) {
      console.error("Error al abrir el archivo:", error);
      Alert.alert("Error", "No se pudo abrir el archivo.");
    }
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
        Alert.alert("Error de Envío", response.message || "No se pudo registrar tu entrega. Intenta nuevamente.");
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
              editable={!loading && !isPastDeadline}
              placeholder={isPastDeadline ? "Ya no se pueden realizar envíos de texto (fecha límite vencida)." : "Escribe tu respuesta aquí..."}
            />
          </View>

          {/* Adjuntar Archivos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Archivos adjuntos</Text>

            {!isPastDeadline && (
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handlePickFile}
                disabled={loading}
              >
                <Text style={styles.attachButtonText}>📎 Adjuntar archivo</Text>
              </TouchableOpacity>
            )}
 
            {attachments.length > 0 && (
              <View style={styles.descriptionBox}>
                {attachments.map((file, index) => (
                  <View key={`${file.name}-${index}`} style={styles.fileRow}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                      onPress={() => handleOpenFile(file)}
                    >
                      <Text style={styles.fileRowIcon}>
                        {file.originalUrl ? "📥" : "📄"}
                      </Text>
                      <View style={{ flex: 1, paddingRight: spacing.sm }}>
                        <Text style={styles.fileRowName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        {file.originalUrl && (
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                            (Ya entregado - Toca para abrir/descargar)
                          </Text>
                        )}
                      </View>
                      <Text style={styles.fileRowSize}>{formatFileSize(file.size)}</Text>
                    </TouchableOpacity>
                    {!isPastDeadline && (
                      <TouchableOpacity
                        onPress={() => handleRemoveAttachment(index)}
                        disabled={loading}
                        style={styles.removeFileButton}
                      >
                        <Text style={styles.removeFileButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
 
          {/* Botón de Enviar o Mensaje de fecha límite */}
          {isPastDeadline ? (
            <View style={styles.deadlineMessageContainer}>
              <Text style={styles.deadlineMessageText}>
                ⚠️ Ya no se puede enviar más tareas
              </Text>
            </View>
          ) : (
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
                  {submitted ? "Editar Envío" : "Enviar Tarea"}
                </Text>
              )}
            </TouchableOpacity>
          )}

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
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    backgroundColor: colors.assignment,
    paddingVertical: spacing.md,
    borderRadius: 8,
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
  deadlineMessageContainer: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    ...spacing.shadow.small,
  },
  deadlineMessageText: {
    ...typography.button,
    color: "#B91C1C",
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
});