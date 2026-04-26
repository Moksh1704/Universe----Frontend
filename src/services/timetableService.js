/**
 * src/services/timetableService.js
 *
 * Faculty timetable service.
 *
 * ROUTE MAP
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /timetable/faculty/me           – fetch own timetable (JWT)
 * GET    /timetable/faculty/{faculty_id} – fetch any faculty's timetable
 * POST   /timetable/faculty/me           – create a slot for the current user
 * PUT    /timetable/faculty/{slot_id}    – update a slot by its PK
 * DELETE /timetable/faculty/{slot_id}    – delete a slot by its PK
 * POST   /timetable/faculty/admin/create – admin: create for any faculty_id
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IMPORTANT: slot_id == entry.id (the row PK), NOT entry.faculty_id.
 *            Passing faculty_id to PUT/DELETE caused 405 errors previously.
 */
import { apiRequest } from '../../api/api';
import BASE_URL from '../../api/config';
import { getToken } from '../../api/storage';

// ─── Faculty routes (auth required via JWT) ───────────────────────────────────

/**
 * Fetch the current logged-in faculty's full timetable.
 * GET /timetable/faculty/me
 * Returns: [{ id, faculty_id, day, time_slot, subject, section, year }]
 */
export const fetchFacultyTimetable = () =>
  apiRequest('/timetable/faculty/me');

/**
 * Fetch timetable for any faculty by their integer faculty_db ID.
 * GET /timetable/faculty/{faculty_id}
 * NOTE: faculty_id is the integer `id` from the faculty table, NOT the student_db UUID.
 */
export const fetchFacultyTimetableById = (facultyId) =>
  apiRequest(`/timetable/faculty/${facultyId}`);

/**
 * Create a new timetable slot for the currently authenticated faculty member.
 * POST /timetable/faculty/me
 *
 * The backend derives faculty_id from the JWT — do NOT include it in the payload.
 *
 * Payload: { day, time_slot, subject, section, year? }
 */
export const addTimetableEntry = (entry) =>
  apiRequest('/timetable/faculty/me', 'POST', entry);

/**
 * Update a timetable slot by its slot id (entry.id — the row PK, NOT faculty_id).
 * PUT /timetable/faculty/{slot_id}
 *
 * Faculty may only update their own slots; admins may update any slot.
 *
 * Payload: { day, time_slot, subject, section, year? }
 */
export const editTimetableEntry = (slotId, entry) =>
  apiRequest(`/timetable/faculty/${slotId}`, 'PUT', entry);

/**
 * Delete a timetable slot by its slot id (entry.id — the row PK, NOT faculty_id).
 * DELETE /timetable/faculty/{slot_id}
 *
 * Faculty may only delete their own slots; admins may delete any slot.
 *
 * NOTE: Passing faculty_id here (instead of entry.id) was the original
 *       cause of the 405 Method Not Allowed errors.
 */
export const deleteTimetableEntry = (slotId) =>
  apiRequest(`/timetable/faculty/${slotId}`, 'DELETE');

// ─── Admin route (no auth required — dev / internal use) ──────────────────────

/**
 * Admin: create a timetable slot for any faculty member.
 * POST /timetable/faculty/admin/create
 *
 * Requires faculty_id explicitly in the payload.
 * Payload: { faculty_id, day, time_slot, subject, section, year? }
 */
export const adminAddTimetableEntry = (entry) =>
  apiRequest('/timetable/faculty/admin/create', 'POST', entry);

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Upload a timetable image.
 * POST /attendance/timetable/upload-image  (multipart/form-data)
 */
export const uploadTimetableImage = async (uri) => {
  const token = await getToken();
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'timetable.jpg' });

  const res = await fetch(`${BASE_URL}/attendance/timetable/upload-image`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
};