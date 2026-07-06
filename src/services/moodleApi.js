// MOODLE API SERVICE
// Aquí van todas las llamadas reales a la API de Moodle
// Conectado al servidor local de Moodle en http://192.168.100.196:8080/moodle

// Variable de estado local para recordar el ID del usuario autenticado
let currentUserId = null;

// Token de Administrador provisto para consultas y validaciones generales
const ADMIN_TOKEN = "72e87e8fcee65873b7c03cd16fd76d9f";

// URL base del servidor Moodle
// Para pruebas remotas con tus compañeros, reemplaza esta URL por tu dirección de Ngrok (ej: https://xxxx.ngrok-free.app)
const MOODLE_URL = "https://gesture-chatty-macaroni.ngrok-free.dev/moodle";
const WEBSERVICE_URL = `${MOODLE_URL}/webservice/rest/server.php`;

// Extraer el host automáticamente para la cabecera Host de Nginx
const getHostFromUrl = (url) => {
  const match = url.match(/https?:\/\/([^\/]+)/);
  return match ? match[1] : "mobileappdam.com:8080";
};

// Cabecera Host requerida por Nginx para evitar error 404 al llamar por IP o túneles
const HEADERS = {
  "Host": getHostFromUrl(MOODLE_URL)
};

// AUTENTICACIÓN
export const loginWithGoogle = async (googleToken) => {
  let email = "john.quijijetov@ug.edu.ec";
  if (googleToken && googleToken.includes("@")) {
    email = googleToken;
  }

  try {
    const url = `${WEBSERVICE_URL}?wstoken=${ADMIN_TOKEN}&wsfunction=core_user_get_users_by_field&moodlewsrestformat=json&field=email&values[0]=${encodeURIComponent(email)}`;
    const response = await fetch(url, { headers: HEADERS });
    const users = await response.json();

    if (users && users.length > 0) {
      const moodleUser = users[0];
      currentUserId = moodleUser.id;
      
      return {
        token: ADMIN_TOKEN,
        user: {
          id: moodleUser.id,
          fullname: moodleUser.fullname,
          email: moodleUser.email,
          profileimage: moodleUser.profileimageurl || "https://i.pravatar.cc/150?img=1",
        },
      };
    } else {
      throw new Error(`El correo ${email} no está registrado en Moodle.`);
    }
  } catch (error) {
    console.error("Error en loginWithGoogle:", error);
    throw error;
  }
};

// CURSOS
export const getCourses = async (token) => {
  const userId = currentUserId || 2;
  try {
    const url = `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${userId}`;
    const response = await fetch(url, { headers: HEADERS });
    const moodleCourses = await response.json();

    if (moodleCourses.exception) {
      throw new Error(moodleCourses.message);
    }

    return moodleCourses.map((course) => {
      let imageUrl = "https://picsum.photos/seed/dam/400/200";
      if (course.courseimage) {
        imageUrl = course.courseimage;
      } else if (course.overviewfiles && course.overviewfiles.length > 0) {
        imageUrl = `${course.overviewfiles[0].fileurl}?token=${token}`;
      }

      return {
        id: course.id,
        fullname: course.fullname,
        shortname: course.shortname,
        summary: course.summary ? course.summary.replace(/<[^>]*>/g, "").trim() : "Sin descripción",
        teacher: course.contacts && course.contacts.length > 0 
          ? course.contacts.map(c => c.fullname).join(", ") 
          : "Docente por confirmar",
        image: imageUrl,
      };
    });
  } catch (error) {
    console.error("Error en getCourses:", error);
    throw error;
  }
};

// ACTIVIDADES
export const getCourseActivities = async (token, courseId) => {
  try {
    const url = `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${courseId}`;
    const response = await fetch(url, { headers: HEADERS });
    const contents = await response.json();

    if (contents.exception) {
      throw new Error(contents.message);
    }

    let assignmentsMap = {};
    try {
      const assignUrl = `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json&courseids[0]=${courseId}`;
      const assignResponse = await fetch(assignUrl, { headers: HEADERS });
      const assignData = await assignResponse.json();
      if (assignData && assignData.courses) {
        assignData.courses.forEach((c) => {
          c.assignments.forEach((a) => {
            assignmentsMap[a.cmid] = a;
          });
        });
      }
    } catch (e) {
      console.warn("No se pudieron obtener las fechas de entrega detalladas:", e);
    }

    let activities = [];
    if (Array.isArray(contents)) {
      contents.forEach((section) => {
        if (section.modules) {
          section.modules.forEach((mod) => {
            if (mod.modname === "assign" || mod.modname === "forum") {
              let duedate = null;
              let description = mod.description || "";

              if (mod.modname === "assign" && assignmentsMap[mod.id]) {
                const assignInfo = assignmentsMap[mod.id];
                if (assignInfo.duedate) {
                  const d = new Date(assignInfo.duedate * 1000);
                  duedate = d.toISOString().split("T")[0];
                }
                if (assignInfo.intro) {
                  description = assignInfo.intro;
                }
              }

              activities.push({
                id: mod.id,
                instanceId: mod.instance,
                courseId: courseId,
                name: mod.name,
                type: mod.modname,
                duedate: duedate,
                status: mod.modname === "assign" ? "pending" : "open",
                description: description.replace(/<[^>]*>/g, "").trim() || "Sin descripción disponible",
              });
            }
          });
        }
      });
    }
    return activities;
  } catch (error) {
    console.error("Error en getCourseActivities:", error);
    throw error;
  }
};

// TAREAS

// Consulta si el usuario ya tiene una entrega (borrador o enviada) para esta tarea.
// Se usa al entrar a AssignmentScreen para no perder lo que el estudiante ya había guardado.
export const getSubmissionStatus = async (token, assignmentId) => {
  const userId = currentUserId || 2;
  try {
    const url = `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=mod_assign_get_submission_status&moodlewsrestformat=json&assignid=${assignmentId}&userid=${userId}`;
    const response = await fetch(url, { headers: HEADERS });
    const result = await response.json();

    if (result.exception) {
      throw new Error(result.message);
    }

    const submission = result.lastattempt?.submission;

    // "new" significa que Moodle no tiene ninguna entrega registrada todavía
    if (!submission || submission.status === "new") {
      return { hasSubmission: false, status: "new", text: "", files: [] };
    }

    let text = "";
    let files = [];

    (submission.plugins || []).forEach((plugin) => {
      if (plugin.type === "onlinetext" && plugin.editorfields?.length > 0) {
        text = plugin.editorfields[0].text.replace(/<[^>]*>/g, "").trim();
      }
      if (plugin.type === "file" && plugin.fileareas?.length > 0) {
        plugin.fileareas.forEach((area) => {
          (area.files || []).forEach((f) => {
            files.push({
              filename: f.filename,
              fileurl: `${f.fileurl}?token=${token}`,
              filesize: f.filesize,
            });
          });
        });
      }
    });

    return {
      hasSubmission: true,
      status: submission.status, // "draft" o "submitted"
      text,
      files,
      timemodified: submission.timemodified,
    };
  } catch (error) {
    console.error("Error en getSubmissionStatus:", error);
    throw error;
  }
};

// Sube un archivo al área de borrador (draft area) de Moodle.
// Devuelve el itemid del draft, que luego se asocia a la entrega en submitAssignment.
// Si ya existe un itemId de un archivo subido antes en esta misma sesión de envío,
// se reutiliza para que todos los archivos queden en la MISMA área de borrador.
export const uploadFileToMoodle = async (token, file, existingItemId = null) => {
  try {
    const formData = new FormData();
    formData.append("token", token);
    if (existingItemId) {
      formData.append("itemid", String(existingItemId));
    }
    formData.append("file_1", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    });

    const uploadUrl = `${MOODLE_URL}/webservice/upload.php`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: HEADERS, // No fijar Content-Type manualmente: fetch arma el boundary del multipart
      body: formData,
    });

    const result = await response.json();

    if (result?.exception || result?.error) {
      throw new Error(result.message || result.error || "No se pudo subir el archivo.");
    }

    const uploaded = Array.isArray(result) ? result[0] : result;
    if (!uploaded || !uploaded.itemid) {
      throw new Error("Respuesta inesperada del servidor al subir el archivo.");
    }

    return uploaded.itemid;
  } catch (error) {
    console.error("Error en uploadFileToMoodle:", error);
    throw error;
  }
};

export const submitAssignment = async (token, assignmentId, text, fileItemId = null) => {
  try {
    const params = new URLSearchParams();
    params.append("wstoken", token);
    params.append("wsfunction", "mod_assign_save_submission");
    params.append("moodlewsrestformat", "json");
    params.append("assignmentid", assignmentId);
    params.append("plugindata[onlinetext_editor][text]", text);
    params.append("plugindata[onlinetext_editor][format]", "1");
    params.append("plugindata[onlinetext_editor][itemid]", "0");

    // Solo se envía si hubo archivos subidos previamente a uploadFileToMoodle
    if (fileItemId) {
      params.append("plugindata[files_filemanager]", fileItemId);
    }

    const response = await fetch(WEBSERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...HEADERS
      },
      body: params.toString(),
    });

    const result = await response.json();
    if (result.exception) {
      throw new Error(result.message);
    }
    return { status: "success", result };
  } catch (error) {
    console.error("Error en submitAssignment:", error);
    throw error;
  }
};

// Algunas tareas de Moodle están configuradas con "submissiondrafts" activado,
// lo que significa que guardar la entrega (arriba) solo la deja como BORRADOR
// y hace falta este segundo paso para que cuente como entrega final.
// Si la tarea no lo requiere, Moodle responde con una excepción que aquí se ignora
// (no es un error real, simplemente ese paso no aplicaba).
export const submitAssignmentForGrading = async (token, assignmentId) => {
  try {
    const params = new URLSearchParams();
    params.append("wstoken", token);
    params.append("wsfunction", "mod_assign_submit_for_grading");
    params.append("moodlewsrestformat", "json");
    params.append("assignmentid", assignmentId);
    params.append("acceptsubmissionstatement", "1");

    const response = await fetch(WEBSERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...HEADERS
      },
      body: params.toString(),
    });

    const result = await response.json();
    if (result.exception) {
      console.warn("submitAssignmentForGrading (no crítico):", result.message);
      return { status: "skipped", message: result.message };
    }
    return { status: "success", result };
  } catch (error) {
    console.warn("Error en submitAssignmentForGrading (no crítico):", error);
    return { status: "skipped", message: error.message };
  }
};

// FOROS
export const getForumDiscussions = async (token, forumId) => {
  try {
    const url = `${WEBSERVICE_URL}?wstoken=${token}&wsfunction=mod_forum_get_forum_discussions&moodlewsrestformat=json&forumid=${forumId}`;
    const response = await fetch(url, { headers: HEADERS });
    const result = await response.json();

    if (result.exception) {
      throw new Error(result.message);
    }

    const discussions = result.discussions || [];

    return discussions.map((d) => {
      const dateObj = new Date(d.created * 1000);
      return {
        id: d.discussion,
        firstpost: d.firstpost,
        activityId: forumId,
        subject: d.name,
        author: d.userfullname,
        date: dateObj.toISOString().split("T")[0],
        replies: d.numreplies,
      };
    });
  } catch (error) {
    console.error("Error en getForumDiscussions:", error);
    throw error;
  }
};

export const postForumReply = async (token, postId, message) => {
  try {
    const params = new URLSearchParams();
    params.append("wstoken", token);
    params.append("wsfunction", "mod_forum_add_discussion_post");
    params.append("moodlewsrestformat", "json");
    params.append("postid", postId);
    params.append("subject", "Re:");
    params.append("message", message);
    params.append("messageformat", "1");

    const response = await fetch(WEBSERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...HEADERS
      },
      body: params.toString(),
    });

    const result = await response.json();
    if (result.exception) {
      throw new Error(result.message);
    }
    return { status: "success", result };
  } catch (error) {
    console.error("Error en postForumReply:", error);
    throw error;
  }
};