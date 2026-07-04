// MOODLE API SERVICE
// Aquí van todas las llamadas reales a la API de Moodle
// Por ahora retorna datos mock para desarrollo
// TODO STEVEN: reemplazar cada función con la llamada real

import {
  MOCK_USER,
  MOCK_COURSES,
  MOCK_ACTIVITIES,
  MOCK_FORUM_DISCUSSIONS,
  MOCK_TOKEN,
} from "../mocks/mockData";

// URL base del servidor Moodle
// reemplazar con la IP real del servidor
const MOODLE_URL = "http://TU-IP-SERVIDOR/moodle";
const WEBSERVICE_URL = `${MOODLE_URL}/webservice/rest/server.php`;

// AUTENTICACIÓN
export const loginWithGoogle = async (googleToken) => {
  // STEVEN: implementar autenticación OAuth 2.0 con Moodle
  // const response = await fetch(`${MOODLE_URL}/local/oauth/login.php`, {
  //   method: "POST",
  //   body: JSON.stringify({ token: googleToken }),
  // });
  // return await response.json();

  // MOCK - Simula login exitoso
  return {
    token: MOCK_TOKEN,
    user: MOCK_USER,
  };
};

// CURSOS
export const getCourses = async (token) => {
  // STEVEN: reemplazar con llamada real
  // const response = await fetch(
  //   `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=USER_ID`
  // );
  // return await response.json();

  // MOCK
  return MOCK_COURSES;
};

// ACTIVIDADES
export const getCourseActivities = async (token, courseId) => {
  // STEVEN: reemplazar con llamada real
  // const response = await fetch(
  //   `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${courseId}`
  // );
  // return await response.json();

  // MOCK
  return MOCK_ACTIVITIES.filter((a) => a.courseId === courseId);
};

// TAREAS

export const submitAssignment = async (token, assignmentId, text) => {
  // STEVEN: reemplazar con llamada real
  // const response = await fetch(WEBSERVICE_URL, {
  //   method: "POST",
  //   body: new URLSearchParams({
  //     wstoken: token,
  //     wsfunction: "mod_assign_save_submission",
  //     moodlewsrestformat: "json",
  //     assignmentid: assignmentId,
  //     "plugindata[onlinetext_editor][text]": text,
  //   }),
  // });
  // return await response.json();

  // MOCK
  console.log("MOCK: Tarea enviada", { assignmentId, text });
  return { status: "success" };
};

// FOROS
export const getForumDiscussions = async (token, forumId) => {
  // STEVEN: reemplazar con llamada real
  // const response = await fetch(
  //   `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=mod_forum_get_forum_discussions&moodlewsrestformat=json&forumid=${forumId}`
  // );
  // return await response.json();

  // MOCK
  return MOCK_FORUM_DISCUSSIONS.filter((d) => d.activityId === forumId);
};

export const postForumReply = async (token, discussionId, message) => {
  // STEVEN: reemplazar con llamada real
  // const response = await fetch(WEBSERVICE_URL, {
  //   method: "POST",
  //   body: new URLSearchParams({
  //     wstoken: token,
  //     wsfunction: "mod_forum_add_discussion_post",
  //     moodlewsrestformat: "json",
  //     postid: discussionId,
  //     subject: "Re:",
  //     message: message,
  //   }),
  // });
  // return await response.json();

  // MOCK
  console.log("MOCK: Respuesta publicada", { discussionId, message });
  return { status: "success" };
};