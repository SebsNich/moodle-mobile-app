// ============================================
// MOCK DATA - Datos de prueba para desarrollo
// Estos datos simulan las respuestas de la API de Moodle
// TODO STEVEN: cuando el servidor esté listo, estos datos
// serán reemplazados por llamadas reales a la API
// ============================================

export const MOCK_USER = {
  id: 1,
  fullname: "Estudiante Prueba",
  email: "estudiante@labdigital.com",
  profileimage: "https://i.pravatar.cc/150?img=1",
};

export const MOCK_COURSES = [
  {
    id: 1,
    fullname: "Desarrollo de Aplicaciones Móviles",
    shortname: "DAM",
    summary: "Curso de desarrollo móvil con Android y React Native",
    teacher: "Ing. Francisco Álvarez Solís",
    image: "https://picsum.photos/seed/dam/400/200",
  },
  {
    id: 2,
    fullname: "Seguridad Informática",
    shortname: "SI",
    summary: "Fundamentos de seguridad en sistemas informáticos",
    teacher: "Ing. Eleanor Varela Tapia",
    image: "https://picsum.photos/seed/si/400/200",
  },
  {
    id: 3,
    fullname: "Verificación y Validación del Software",
    shortname: "VVS",
    summary: "Técnicas de testing y aseguramiento de calidad",
    teacher: "Ing. Eleanor Varela Tapia",
    image: "https://picsum.photos/seed/vvs/400/200",
  },
];

export const MOCK_ACTIVITIES = [
  {
    id: 1,
    courseId: 1,
    name: "Taller 12 - Servidor LEMP",
    type: "assign",
    duedate: "2026-07-17",
    status: "pending",
    description: "Instalar y configurar un servidor LEMP en Ubuntu Server",
  },
  {
    id: 2,
    courseId: 1,
    name: "Proyecto Final - App Móvil Moodle",
    type: "assign",
    duedate: "2026-07-17",
    status: "pending",
    description: "Desarrollar una aplicación móvil cliente para Moodle",
  },
  {
    id: 3,
    courseId: 1,
    name: "Foro - Experiencias con React Native",
    type: "forum",
    duedate: null,
    status: "open",
    description: "Comparte tu experiencia desarrollando con React Native",
  },
];

export const MOCK_FORUM_DISCUSSIONS = [
  {
    id: 1,
    activityId: 3,
    subject: "¿Qué librería de navegación recomiendan?",
    author: "Natalia Cepeda",
    date: "2026-07-01",
    replies: 3,
  },
  {
    id: 2,
    activityId: 3,
    subject: "Problema con Expo Go en Android 14",
    author: "Ronald Mota",
    date: "2026-07-02",
    replies: 1,
  },
];

export const MOCK_TOKEN = "mock-token-123456789";
export const MOCK_MOODLE_URL = "http://TU-IP-SERVIDOR/moodle";
//STEVEN: reemplazar MOCK_MOODLE_URL con la IP real del servidor