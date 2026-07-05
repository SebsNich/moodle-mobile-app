// FORUM SCREEN - Denisse Crespo & Steven Integration
// Pantalla para visualizar hilos de discusión de un foro y publicar aportaciones (respuestas).

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { getForumDiscussions, postForumReply } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export default function ForumScreen({ route, navigation }) {
  const { activity, course, token } = route.params || {};

  // Moodle requiere el ID de la instancia del foro (instanceId)
  const actualForumId = activity?.instanceId;

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para responder a una discusión
  const [activeDiscussionId, setActiveDiscussionId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadDiscussions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (actualForumId) {
        const data = await getForumDiscussions(token, actualForumId);
        setDiscussions(data || []);
      } else {
        console.warn("No se encontró el ID de instancia del foro.");
      }
    } catch (err) {
      console.error("Error al cargar discusiones:", err);
      Alert.alert("Error", "No se pudieron obtener las discusiones del foro.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, actualForumId]);

  useEffect(() => {
    loadDiscussions();
  }, [loadDiscussions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDiscussions(true);
  };

  const handlePostReply = async (discussion) => {
    if (!replyText.trim()) {
      Alert.alert("Respuesta vacía", "Por favor ingresa un mensaje antes de responder.");
      return;
    }

    // Usamos el ID del primer post (firstpost) o del ID del hilo
    const postId = discussion.firstpost || discussion.id;

    try {
      setSubmittingReply(true);
      const response = await postForumReply(token, postId, replyText);

      if (response.status === "success") {
        Alert.alert("Éxito", "Tu participación ha sido publicada.");
        setReplyText("");
        setActiveDiscussionId(null);
        // Recargar discusiones para ver el número actualizado de respuestas
        loadDiscussions(true);
      } else {
        Alert.alert("Error", "No se pudo publicar tu respuesta.");
      }
    } catch (err) {
      console.error("Error al enviar respuesta al foro:", err);
      Alert.alert("Error de Envío", err.message || "Ocurrió un error al enviar tu aporte.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderDiscussionItem = ({ item }) => {
    const isReplyingThis = activeDiscussionId === item.id;

    return (
      <View style={styles.discussionCard}>
        {/* Encabezado del Hilo */}
        <View style={styles.discussionHeader}>
          <Text style={styles.discussionSubject}>{item.subject}</Text>
          <Text style={styles.discussionMeta}>
            Por 👤 <Text style={styles.authorText}>{item.author}</Text> — 📅 {item.date}
          </Text>
        </View>

        {/* Contador de respuestas */}
        <View style={styles.repliesRow}>
          <Text style={styles.repliesText}>
            💬 {item.replies} {item.replies === 1 ? "respuesta" : "respuestas"}
          </Text>
          
          <TouchableOpacity
            style={styles.replyToggleButton}
            onPress={() => {
              if (isReplyingThis) {
                setActiveDiscussionId(null);
                setReplyText("");
              } else {
                setActiveDiscussionId(item.id);
                setReplyText("");
              }
            }}
          >
            <Text style={styles.replyToggleText}>
              {isReplyingThis ? "Cancelar" : "Responder"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input de respuesta expandible */}
        {isReplyingThis && (
          <View style={styles.replyForm}>
            <TextInput
              style={styles.replyInput}
              placeholder="Escribe tu aporte en este foro..."
              placeholderTextColor={colors.textLight}
              multiline
              value={replyText}
              onChangeText={setReplyText}
              editable={!submittingReply}
            />
            <TouchableOpacity
              style={[styles.sendReplyButton, !replyText.trim() && styles.disabledButton]}
              onPress={() => handlePostReply(item)}
              disabled={submittingReply || !replyText.trim()}
            >
              {submittingReply ? (
                <ActivityIndicator color={colors.textWhite} size="small" />
              ) : (
                <Text style={styles.sendReplyButtonText}>Publicar Aporte</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Encabezado general */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Foro: {activity?.name || "Foro"}
          </Text>
        </View>

        {/* Info del foro */}
        <View style={styles.infoBox}>
          <Text style={styles.courseName}>{course?.fullname}</Text>
          <Text style={styles.forumDescription}>
            {activity?.description || "Espacio de debate y consultas sobre los temas del curso."}
          </Text>
        </View>

        {/* Lista de discusiones */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando discusiones...</Text>
          </View>
        ) : (
          <FlatList
            data={discussions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDiscussionItem}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No hay discusiones activas en este foro todavía.
                </Text>
                <Text style={styles.emptySubText}>
                  Las discusiones iniciadas por el docente aparecerán aquí.
                </Text>
              </View>
            }
          />
        )}
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
  infoBox: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  courseName: {
    ...typography.label,
    color: colors.primary,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  forumDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  discussionCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...spacing.shadow.small,
    borderLeftWidth: 4,
    borderLeftColor: colors.forum,
  },
  discussionHeader: {
    marginBottom: spacing.sm,
  },
  discussionSubject: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: "bold",
    marginBottom: 4,
  },
  discussionMeta: {
    ...typography.caption,
    color: colors.textLight,
  },
  authorText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  repliesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  repliesText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  replyToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.divider,
    borderRadius: spacing.borderRadius.sm,
  },
  replyToggleText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  replyForm: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  replyInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sendReplyButton: {
    backgroundColor: colors.forum,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: colors.textLight,
  },
  sendReplyButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  emptySubText: {
    ...typography.body2,
    color: colors.textLight,
    textAlign: "center",
  },
});