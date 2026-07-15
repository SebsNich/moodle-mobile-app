// COURSES SCREEN - Ronald Mota
// Pantalla que lista los cursos matriculados del usuario

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getCourses } from "../services/moodleApi";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export default function CoursesScreen({ navigation, route }) {
  // Datos recibidos desde LoginScreen (navigation.replace("Courses", { token, user }))
  const token = route?.params?.token;
  const user = route?.params?.user;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        console.warn("Error al cerrar sesión de Google:", googleError);
      }
      // Volver a la pantalla de login
      navigation.replace("Login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const loadCourses = useCallback(async () => {
    try {
      setError(null);
      const data = await getCourses(token);
      setCourses(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los cursos. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const handleOpenCourse = (course) => {
    navigation.navigate("CourseDetail", {
      courseId: course.id,
      courseName: course.fullname,
      token,
    });
  };

  const renderCourse = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => handleOpenCourse(item)}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.fullname}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.shortname}</Text>
          </View>
        </View>

        <Text style={styles.cardTeacher}>👤 {item.teacher}</Text>

        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando tus cursos...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado con datos del usuario */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Cursos</Text>
          {user?.fullname ? (
            <Text style={styles.headerSubtitle}>Hola, {user.fullname}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {user?.profileimage ? (
            <Image source={{ uri: user.profileimage }} style={styles.avatar} />
          ) : null}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCourse}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No estás matriculado en ningún curso todavía.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textWhite,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerRight: {
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoutButton: {
    marginTop: 4,
    backgroundColor: colors.error,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  logoutButtonText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textWhite,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...spacing.shadow.small,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.divider,
  },
  cardBody: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textWhite,
    fontWeight: "600",
  },
  cardTeacher: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardSummary: {
    ...typography.body2,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  emptyText: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
  },
});