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
  Image,
} from "react-native";
import {
  getForumDiscussions,
  postForumReply,
  getDiscussionPosts,
} from "../services/moodleApi";
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
  const [expandedDiscussionId, setExpandedDiscussionId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

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

  const isOverdue = useCallback(() => {
    if (!activity?.duedate) return false;
    const now = new Date();
    const dueTime = new Date(activity.duedate);
    return now > dueTime;
  }, [activity]);

  const loadDiscussions = useCallback(
    async (silent = false) => {
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
        Alert.alert(
          "Error",
          "No se pudieron obtener las discusiones del foro."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, actualForumId]
  );

  useEffect(() => {
    loadDiscussions();
  }, [loadDiscussions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDiscussions(true);
  };
  const handleTogglePosts = async (discussion) => {
    if (expandedDiscussionId === discussion.id) {
      setExpandedDiscussionId(null);
      setPosts([]);
      return;
    }

    setExpandedDiscussionId(discussion.id);
    setLoadingPosts(true);
    try {
      const data = await getDiscussionPosts(token, discussion.id);
      setPosts(data || []);
    } catch (err) {
      console.error("Error al cargar mensajes:", err);
      Alert.alert(
        "Error",
        "No se pudieron cargar los mensajes de esta discusión."
      );
    } finally {
      setLoadingPosts(false);
    }
  };

  const handlePostReply = async (discussion) => {
    if (!replyText.trim()) {
      Alert.alert(
        "Respuesta vacía",
        "Por favor ingresa un mensaje antes de responder."
      );
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

        // Recargar los posts del hilo expandido para mostrar el nuevo aporte inmediatamente
        setLoadingPosts(true);
        try {
          const data = await getDiscussionPosts(token, discussion.id);
          setPosts(data || []);
        } catch (err) {
          console.error("Error al recargar mensajes:", err);
        } finally {
          setLoadingPosts(false);
        }
      } else {
        Alert.alert("Error", "No se pudo publicar tu respuesta.");
      }
    } catch (err) {
      console.error("Error al enviar respuesta al foro:", err);
      Alert.alert(
        "Error de Envío",
        err.message || "Ocurrió un error al enviar tu aporte."
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return colors.primary;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorsList = ["#1a73e8", "#34a853", "#673ab7", "#e91e63", "#009688", "#ff5722", "#3f51b5", "#00bcd4"];
    return colorsList[Math.abs(hash) % colorsList.length];
  };

  const isTeacher = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes("alvarez") || lower.includes("solis") || lower.includes("profesor") || lower.includes("docente") || lower.includes("francisco");
  };

  const getAvatarSource = (url, token) => {
    if (!url) return null;
    if (url.includes("pluginfile.php")) {
      const separator = url.includes("?") ? "&" : "?";
      return { uri: `${url}${separator}token=${token}` };
    }
    return { uri: url };
  };

  const renderDiscussionItem = ({ item }) => {
    const isReplyingThis = activeDiscussionId === item.id;
    const isExpanded = expandedDiscussionId === item.id;
    const avatarSource = getAvatarSource(item.userpictureurl, token);

    return (
      <View style={styles.discussionCard}>
        {/* Encabezado del Hilo */}
        <View style={styles.discussionHeader}>
          <Text style={styles.discussionSubject}>{item.subject}</Text>
          <View style={styles.discussionMetaRow}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.miniAvatarImage} />
            ) : null}
            <View style={styles.metaTextContainer}>
              <Text style={styles.authorText}>
                {item.author} {isTeacher(item.author) && <Text style={styles.teacherBadge}>Docente</Text>}
              </Text>
              <Text style={styles.dateText}>Publicado el {formatDate(item.date)}</Text>
            </View>
          </View>
        </View>

        {/* Mensaje principal del docente/creador del hilo (Siempre al principio) */}
        {item.message ? (
          <View style={styles.mainMessageContainer}>
            <Text style={styles.mainMessageText}>{item.message}</Text>
          </View>
        ) : null}

        {/* Contador de respuestas e Hilo de acciones */}
        <View style={styles.repliesRow}>
          <View style={styles.repliesBadge}>
            <Text style={styles.repliesText}>
              💬 {item.replies} {item.replies === 1 ? "respuesta" : "respuestas"}
            </Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionIconButton, isExpanded && styles.activeIconButton]}
              onPress={() => handleTogglePosts(item)}
            >
              <Text style={[styles.actionIconText, isExpanded && styles.activeIconText]}>
                {isExpanded ? "Ocultar" : "Ver respuestas"}
              </Text>
            </TouchableOpacity>

            {!isOverdue() && (
              <TouchableOpacity
                style={[styles.actionIconButton, isReplyingThis && styles.activeReplyButton]}
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
                <Text style={[styles.actionIconText, isReplyingThis && styles.activeReplyText]}>
                  {isReplyingThis ? "Cancelar" : "Responder"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Formulario para escribir aporte */}
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
              style={[
                styles.sendReplyButton,
                !replyText.trim() && styles.disabledButton,
              ]}
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

        {/* Respuestas reales (excluyendo el post principal) */}
        {isExpanded && (
          <View style={styles.postsContainer}>
            <Text style={styles.postsSectionTitle}>Respuestas del debate:</Text>
            {loadingPosts ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : posts.filter(p => p.hasparent).length === 0 ? (
              <Text style={styles.noPostsText}>
                No hay respuestas en este tema todavía.
              </Text>
            ) : (
              posts
                .filter(p => p.hasparent)
                .map((post) => {
                  const isPostTeacher = isTeacher(post.author);
                  const postAvatarSource = getAvatarSource(post.avatar, token);
                  return (
                    <View key={post.id} style={[styles.postItemCard, isPostTeacher && styles.postItemTeacherCard]}>
                      <View style={styles.postItemHeader}>
                        {postAvatarSource ? (
                          <Image source={postAvatarSource} style={[styles.miniAvatarImage, { width: 28, height: 28, borderRadius: 14, marginRight: 8 }]} />
                        ) : null}
                        <View style={styles.postItemMeta}>
                          <Text style={styles.postAuthorName}>
                            {post.author} {isPostTeacher && <Text style={styles.teacherBadgeMini}>Docente</Text>}
                          </Text>
                          <Text style={styles.postItemDate}>Publicado el {formatDate(post.date)}</Text>
                        </View>
                      </View>
                      <Text style={styles.postItemMessage}>{post.message}</Text>
                    </View>
                  );
                })
            )}
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
            {activity?.description ||
              "Espacio de debate y consultas sobre los temas del curso."}
          </Text>
          {activity?.duedate && (
            <Text style={[styles.dueDateBadge, isOverdue() && styles.dueDateBadgeOverdue]}>
              {isOverdue() 
                ? `🔴 Cerrado: Venció el ${formatDate(activity.duedate)}` 
                : `🟢 Disponible hasta: ${formatDate(activity.duedate)}`}
            </Text>
          )}
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
  discussionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  miniAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
  mainMessageContainer: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: "#CBD5E1",
  },
  mainMessageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  miniAvatarText: {
    color: colors.textWhite,
    fontWeight: "bold",
    fontSize: 13,
  },
  metaTextContainer: {
    flex: 1,
  },
  authorText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  dateText: {
    color: colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  teacherBadge: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    overflow: "hidden",
  },
  teacherBadgeMini: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
    overflow: "hidden",
  },
  repliesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  repliesBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  repliesText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionIconText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  activeIconButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  activeIconText: {
    color: "#1D4ED8",
  },
  activeReplyButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  activeReplyText: {
    color: "#DC2626",
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
    padding: spacing.md,
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
  postsContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  postsSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  postItemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  postItemTeacherCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  postItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  postItemMeta: {
    flex: 1,
    marginLeft: 8,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  postItemDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  postItemMessage: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    paddingLeft: 2,
  },
  noPostsText: {
    ...typography.body2,
    color: colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  dueDateBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "#ECFDF5",
    color: "#047857",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  dueDateBadgeOverdue: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
  },
});
