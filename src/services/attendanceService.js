/**
 * src/services/attendanceService.js
 *
 * All attendance + timetable API calls.
 * No mock data — fully API-driven.
 *
 * Faculty flow:
 *   1. Load timetable:  GET /timetable/faculty/me
 *   2. Select a slot →  GET /attendance/faculty/students?section=CSE06&year=4
 *   3. Mark & submit:   POST /attendance/mark     ← ✅ FIXED (was /attendance)
 *
 * Student flow:
 *   GET /attendance/me/overview  → fetchOverallAttendance()
 *   GET /attendance/me           → fetchSubjectAttendance()
 *   GET /attendance/me/overview  → fetchDailyGroupedAttendance() (days array)
 *
 * FIX LOG (this version):
 *   ✅ submitAttendance  → POST /attendance/mark  (was POST /attendance → 404)
 *   ✅ submitAttendance  → payload uses `attendance` array + `section_id`
 *                          matching attendance_v2 MarkAttendanceBody schema exactly
 *   ✅ submitAttendance  → student_id uses st.regnum (not st.id) — regnum is the
 *                          registration number the backend stores in DayAttendance
 *   ✅ updateAttendance  → POST /attendance/mark  (was PUT /attendance/update → 404)
 *                          attendance_v2 /mark is idempotent: re-submitting the same
 *                          slot updates existing DayAttendance rows automatically
 *   ✅ checkAttendance   → status comparison uses string "present"/"absent"
 *                          (backend returns strings, not booleans)
 */
import { apiRequest } from '../../api/api';

// ─── Section normalizer ───────────────────────────────────────────────────────
/**
 * Normalize section string to match DB format.
 * 'CSE 06' → 'CSE06'  |  'CSE-06' → 'CSE06'  |  'cse06' → 'CSE06'
 */
const normalizeSection = (section) => {
  if (!section) return section;
  return section.replace(/[\s\-]+/g, '').toUpperCase();
};

// ─── Student: Overview ────────────────────────────────────────────────────────

/**
 * Fetch student's full attendance overview.
 * GET /attendance/me/overview
 *
 * Returns:
 * {
 *   percentage: number,
 *   total_classes: number,
 *   attended_classes: number,
 *   subjects: [{ subject, present, total, percentage }],
 *   days: [{ date, classes: [{ time_slot, subject, status }] }]
 * }
 */
export const fetchOverallAttendance = () =>
  apiRequest('/attendance/me/overview');

/**
 * Fetch subject-wise attendance list.
 * GET /attendance/me
 *
 * Returns: [{ subject, present, total, percentage }]
 */
export const fetchSubjectAttendance = () =>
  apiRequest('/attendance/me');

/**
 * Fetch day-wise grouped attendance (days[] from overview endpoint).
 * GET /attendance/me/overview → returns days array only.
 */
export const fetchDailyGroupedAttendance = async () => {
  const data = await apiRequest('/attendance/me/overview');
  return Array.isArray(data?.days) ? data.days : [];
};

/** Aliases used by older screens */
export const fetchStudentAttendanceOverview = fetchOverallAttendance;
export const fetchStudentAttendance = fetchOverallAttendance;

// ─── Student: Detail endpoints ────────────────────────────────────────────────

/**
 * Fetch attendance summary with overall percentage.
 * GET /attendance/me/summary
 */
export const fetchAttendanceSummary = () =>
  apiRequest('/attendance/me/summary');

/**
 * Fetch day-wise attendance with optional filters.
 * GET /attendance/me/daily?subject=...&from_date=...&to_date=...
 */
export const fetchDailyAttendance = ({ subject, fromDate, toDate } = {}) => {
  const params = new URLSearchParams();
  if (subject)  params.append('subject',   subject);
  if (fromDate) params.append('from_date', fromDate);
  if (toDate)   params.append('to_date',   toDate);
  const qs = params.toString();
  return apiRequest(`/attendance/me/daily${qs ? '?' + qs : ''}`);
};

// ─── Faculty: Timetable ───────────────────────────────────────────────────────

/**
 * Fetch the current faculty's full timetable from faculty_db.
 * GET /timetable/faculty/me
 * Returns: [{ id, faculty_id, day, time_slot, subject, section, year }]
 */
export const fetchMyTimetable = () =>
  apiRequest('/timetable/faculty/me');

/**
 * Fetch all timetable slots for the current faculty on a specific day.
 * GET /timetable/faculty/me/slots?day=Monday
 */
export const fetchSlotsForDay = (day) =>
  apiRequest(`/timetable/faculty/me/slots?day=${encodeURIComponent(day)}`);

/**
 * Fetch timetable for any faculty by integer ID.
 * GET /timetable/faculty/{faculty_id}
 */
export const fetchFacultyTimetableById = (facultyId) =>
  apiRequest(`/timetable/faculty/${facultyId}`);

// ─── Faculty: Students ────────────────────────────────────────────────────────

/**
 * Fetch students for a section + year from the attendance backend.
 * GET /attendance/faculty/students?section=CSE06&year=4
 *
 * Returns: [{ id, name, fullname, regnum, registration_number }]
 *
 * Section is normalized inline to avoid percent-encoding issues.
 */
export const fetchStudentsForSection = (section, year) => {
  const normalizedSection = normalizeSection(section);
  console.log('[attendanceService] fetchStudentsForSection section:', normalizedSection, 'year:', year);
  const url = `/attendance/faculty/students?section=${normalizedSection}${year != null ? `&year=${year}` : ''}`;
  return apiRequest(url);
};

// ─── Faculty: Submit ──────────────────────────────────────────────────────────

/**
 * ✅ FIXED: Submit attendance using POST /attendance/mark
 *
 * Was: POST /attendance  → 404 Not Found
 * Now: POST /attendance/mark → 200 OK
 *
 * Payload matches attendance_v2 MarkAttendanceBody exactly:
 * {
 *   section_id: "CSE06",          ← normalized section (no spaces/dashes)
 *   subject:    "HCI",
 *   date:       "2026-04-19",     ← YYYY-MM-DD string
 *   time_slot:  "9:00-10:40",
 *   attendance: [                 ← key is "attendance" (NOT "records" or "students")
 *     { student_id: "3225...", status: "present" },   ← status is STRING not boolean
 *     { student_id: "3225...", status: "absent"  },
 *   ]
 * }
 *
 * FIELD NOTES:
 *   - student_id uses st.regnum — this is the registration number stored in
 *     DayAttendance.registration_number on the backend.
 *     (st.id is also regnum per backend response, but st.regnum is explicit)
 *   - status must be the string "present" or "absent" — NOT a boolean.
 */
export const submitAttendance = (
  subject,
  section,
  year,       // kept for API signature compat — not needed by /mark endpoint
  date,
  timeSlot,
  facultyId,  // kept for API signature compat — not needed by /mark endpoint
  students,
) => {
  const payload = {
    section_id: normalizeSection(section),   // ✅ "CSE 06" → "CSE06"
    subject,
    date,                                     // ✅ "YYYY-MM-DD"
    time_slot: timeSlot,
    attendance: students.map((st) => ({
      student_id: st.regnum || st.registration_number || st.id,  // ✅ use regnum
      status: st.present ? 'present' : 'absent',                 // ✅ string status
    })),
  };

  console.log('[attendanceService] Submitting attendance payload:', payload);

  return apiRequest('/attendance/mark', 'POST', payload);  // ✅ FIXED endpoint
};

// ─── Faculty: Check ───────────────────────────────────────────────────────────

/**
 * Check whether attendance already exists for a slot.
 * GET /attendance/check?section=...&subject=...&date=...&time_slot=...
 *
 * Returns { exists: false }
 *      or { exists: true, data: [{ student_id: str, status: "present"|"absent" }] }
 *
 * ✅ NOTE: status values are strings "present"/"absent" — NOT booleans.
 *    AttendanceScreen.js presentSet should compare: r.status === 'present'
 */
export const checkAttendance = (section, subject, date, timeSlot) => {
  const normalizedSection = normalizeSection(section);
  const params = new URLSearchParams({
    section:   normalizedSection,
    subject,
    date,
    time_slot: timeSlot,
  });
  return apiRequest(`/attendance/check?${params.toString()}`);
};

// ─── Faculty: Update (after unlock) ──────────────────────────────────────────

/**
 * ✅ FIXED: Re-submit attendance after unlock using POST /attendance/mark
 *
 * Was: PUT /attendance/update → 404 Not Found
 * Now: POST /attendance/mark  → 200 OK
 *
 * attendance_v2 /mark is fully idempotent — re-submitting the same
 * section/subject/date/time_slot updates existing DayAttendance rows
 * rather than creating duplicates. No separate update endpoint needed.
 *
 * Payload is identical to submitAttendance.
 */
export const updateAttendance = (
  subject,
  section,
  year,
  date,
  timeSlot,
  facultyId,
  students,
) => {
  const payload = {
    section_id: normalizeSection(section),
    subject,
    date,
    time_slot: timeSlot,
    attendance: students.map((st) => ({
      student_id: st.regnum || st.registration_number || st.id,
      status: st.present ? 'present' : 'absent',
    })),
  };

  console.log('[attendanceService] Updating attendance payload:', payload);

  return apiRequest('/attendance/mark', 'POST', payload);  // ✅ FIXED endpoint
};

// ─── Faculty: Unlock ──────────────────────────────────────────────────────────

/**
 * Verify faculty password before allowing edits.
 * POST /attendance/unlock
 *
 * FIX: faculty_id removed from payload entirely.
 *      The backend now identifies the user via the JWT token (get_current_user)
 *      which holds a UUID — sending an integer faculty_id caused Postgres to
 *      throw "operator does not exist: uuid = integer" (500 error).
 *
 * Payload: { password: "..." }   ← faculty_id intentionally omitted
 * Returns { status: "unlocked" } on success, throws on 401.
 */
export const unlockAttendance = (password) => {
  console.log('[attendanceService] UNLOCK PASSWORD:', password, typeof password);
  return apiRequest('/attendance/unlock', 'POST', {
    password,
  });
};

// ─── Legacy ───────────────────────────────────────────────────────────────────

/**
 * Legacy submit alias — kept for backward compat only.
 * Points to /attendance/mark now to avoid 404.
 */
export const submitAttendanceLegacy = (
  subject,
  section,
  year,
  date,
  timeSlot,
  students,
) => {
  const payload = {
    section_id: normalizeSection(section),
    subject,
    date,
    time_slot: timeSlot,
    attendance: students.map((st) => ({
      student_id: st.regnum || st.registration_number || st.id,
      status: st.present ? 'present' : 'absent',
    })),
  };
  console.log('[attendanceService] submitAttendanceLegacy payload:', payload);
  return apiRequest('/attendance/mark', 'POST', payload);
};