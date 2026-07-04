import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCourseActivities, getCourses } from "../services/moodleApi";

const ACTIVITY_LABELS = {
  assign: "Tarea",
  forum: "Foro",
};

const STATUS_LABELS = {
  pending: "Pendiente",
  open: "Abierto",
  submitted: "Entregado",
  closed: "Cerrado",
};

const STATUS_STYLES = {
  pending: {
    backgroundColor: "#FFF7ED",
    color: "#9A3412",
  },
  open: {
    backgroundColor: "#ECFDF5",
    color: "#047857",
  },
  submitted: {
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
  },
  closed: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
  },
};

function formatDate(date) {
  if (!date) {
    return "Sin fecha limite";
  }

  const [year, month, day] = String(date).split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function getActivityAccent(type) {
  return type === "forum" ? styles.forumAccent : styles.assignmentAccent;
}

export default function CourseDetailScreen({ route, navigation }) {
  const params = route?.params ?? {};
  // Ronald/CoursesScreen debe enviar: { course, courseId: course.id, token }.
  const initialCourse = params.course ?? null;
  const requestedCourseId = initialCourse?.id ?? params.courseId ?? 1;
  const token = params.token;

  const [course, setCourse] = useState(initialCourse);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCourseDetail = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        let selectedCourse = initialCourse;

        if (!selectedCourse) {
          // Steven debe mantener getCourses(token) cuando conecte Moodle real.
          const courses = await getCourses(token);
          const courseList = Array.isArray(courses) ? courses : [];

          selectedCourse =
            courseList.find((item) => String(item.id) === String(requestedCourseId)) ??
            courseList[0] ??
            null;
        }

        if (!selectedCourse) {
          throw new Error("No se encontro el curso solicitado.");
        }

        // Steven debe mantener getCourseActivities(token, courseId).
        const courseActivities = await getCourseActivities(token, selectedCourse.id);

        setCourse(selectedCourse);
        setActivities(Array.isArray(courseActivities) ? courseActivities : []);
      } catch (currentError) {
        setError(currentError.message || "No se pudo cargar el curso.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [initialCourse, requestedCourseId, token],
  );

  useEffect(() => {
    loadCourseDetail();
  }, [loadCourseDetail]);

  const activitySummary = useMemo(() => {
    const assignments = activities.filter((activity) => activity.type === "assign");
    const forums = activities.filter((activity) => activity.type === "forum");
    const pending = assignments.filter((activity) => activity.status === "pending");

    return {
      assignments: assignments.length,
      forums: forums.length,
      pending: pending.length,
      total: activities.length,
    };
  }, [activities]);

  const handleActivityPress = (activity) => {
    if (activity.type === "assign") {
      // Natalia/AssignmentScreen debe leer: activity, assignmentId, course, token.
      navigation?.navigate("Assignment", {
        activity,
        assignmentId: activity.id,
        course,
        token,
      });
      return;
    }

    if (activity.type === "forum") {
      // Denisse/ForumScreen debe leer: activity, forumId, course, token.
      navigation?.navigate("Forum", {
        activity,
        course,
        forumId: activity.id,
        token,
      });
    }
  };

  if (isLoading && !course) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.centerContent}>
          <ActivityIndicator color="#2563EB" size="large" />
          <Text style={styles.loadingText}>Cargando detalle del curso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#2563EB"
            onRefresh={() => loadCourseDetail(true)}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Detalle del curso</Text>
        </View>

        {course?.image ? (
          <Image
            resizeMode="cover"
            source={{ uri: course.image }}
            style={styles.courseImage}
          />
        ) : (
          <View style={[styles.courseImage, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>{course?.shortname ?? "Curso"}</Text>
          </View>
        )}

        <View style={styles.courseIntro}>
          <View style={styles.shortNameBadge}>
            <Text style={styles.shortNameText}>{course?.shortname ?? "CURSO"}</Text>
          </View>
          <Text style={styles.courseTitle}>{course?.fullname ?? "Curso Moodle"}</Text>
          <Text style={styles.courseSummary}>
            {course?.summary ?? "Sin resumen disponible."}
          </Text>
        </View>

        <View style={styles.teacherBox}>
          <Text style={styles.teacherLabel}>Profesor</Text>
          <Text style={styles.teacherName}>
            {course?.teacher ?? "Docente por confirmar"}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>No se pudieron cargar los datos</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadCourseDetail()}>
              <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activitySummary.total}</Text>
            <Text style={styles.summaryLabel}>Actividades</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activitySummary.assignments}</Text>
            <Text style={styles.summaryLabel}>Tareas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activitySummary.forums}</Text>
            <Text style={styles.summaryLabel}>Foros</Text>
          </View>
        </View>

        {activitySummary.pending > 0 ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Tareas pendientes</Text>
            <Text style={styles.noticeText}>
              Tienes {activitySummary.pending} actividad(es) por revisar.
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actividades del curso</Text>
          <Text style={styles.sectionCount}>{activities.length}</Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sin actividades publicadas</Text>
            <Text style={styles.emptyText}>
              Cuando el docente publique tareas o foros, apareceran aqui.
            </Text>
          </View>
        ) : (
          activities.map((activity) => {
            const statusStyle = STATUS_STYLES[activity.status] ?? STATUS_STYLES.closed;

            return (
              <Pressable
                accessibilityRole="button"
                key={activity.id}
                style={({ pressed }) => [
                  styles.activityCard,
                  pressed ? styles.activityCardPressed : null,
                ]}
                onPress={() => handleActivityPress(activity)}
              >
                <View style={[styles.activityAccent, getActivityAccent(activity.type)]} />
                <View style={styles.activityContent}>
                  <View style={styles.activityTopRow}>
                    <Text style={styles.activityType}>
                      {ACTIVITY_LABELS[activity.type] ?? "Actividad"}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.backgroundColor },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {STATUS_LABELS[activity.status] ?? activity.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.activityDescription}>{activity.description}</Text>

                  <View style={styles.activityFooter}>
                    <Text style={styles.dueDate}>
                      Fecha limite: {formatDate(activity.duedate)}
                    </Text>
                    <Text style={styles.openAction}>Abrir</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
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
    color: "#0F172A",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 14,
    textAlign: "right",
  },
  courseImage: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    height: 174,
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: "#1E3A8A",
    fontSize: 30,
    fontWeight: "900",
  },
  courseIntro: {
    marginTop: 18,
  },
  shortNameBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shortNameText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  courseTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  courseSummary: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  teacherBox: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  teacherLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  teacherName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  errorTitle: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "800",
  },
  errorText: {
    color: "#7F1D1D",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  summaryItem: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  noticeBox: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  noticeTitle: {
    color: "#92400E",
    fontSize: 15,
    fontWeight: "800",
  },
  noticeText: {
    color: "#78350F",
    fontSize: 14,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionCount: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    overflow: "hidden",
  },
  activityCardPressed: {
    opacity: 0.78,
  },
  activityAccent: {
    width: 6,
  },
  assignmentAccent: {
    backgroundColor: "#2563EB",
  },
  forumAccent: {
    backgroundColor: "#059669",
  },
  activityContent: {
    flex: 1,
    padding: 16,
  },
  activityTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityType: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  activityName: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },
  activityDescription: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  activityFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  dueDate: {
    color: "#64748B",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 12,
  },
  openAction: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
  },
});
