// COURSES SCREEN - Ronald Mota
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function CoursesScreen() {
    return (
        <View style={styles.container}>
        <Text style={styles.text}>Lista de Cursos</Text>
        <Text style={styles.sub}>Ronald Mota — En desarrollo</Text>
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    text: { fontSize: 24, fontWeight: "bold", color: colors.primary },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
});