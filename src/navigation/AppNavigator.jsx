import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import CoursesScreen from "../screens/CoursesScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import AssignmentScreen from "../screens/AssignmentScreen";
import ForumScreen from "../screens/ForumScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="Courses"
          component={CoursesScreen}
          options={{ title: "Mis Cursos" }}
        />
        <Stack.Screen
          name="CourseDetail"
          component={CourseDetailScreen}
          options={{ title: "Detalle del Curso" }}
        />
        <Stack.Screen
          name="Assignment"
          component={AssignmentScreen}
          options={{ title: "Enviar Tarea" }}
        />
        <Stack.Screen
          name="Forum"
          component={ForumScreen}
          options={{ title: "Foro" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}