import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../components/UIComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// ─── Campus Locations (from universe_navigation.xlsx) ─────────────────────────
const CAMPUS_LOCATIONS = [
  { id: 'c1',  name: 'Algorithm', description: 'Cse classes', category: 'academic', lat: 17.7303553153865, lng: 83.318259654478, keywords: 'classes, cse classes, cse dept' },
  { id: 'c2',  name: 'Department of Computer science and Systems Engineering', description: 'Cse dept', category: 'academic', lat: 17.7300571933786, lng: 83.3178629956212, keywords: 'classes, cse classes, cse dept' },
  { id: 'c3',  name: 'Department of Information Technology and Computer Applications', description: 'It dept', category: 'academic', lat: 17.7303612187876, lng: 83.3176832595767, keywords: 'classes, it classes, it dept' },
  { id: 'c4',  name: 'Library', description: 'Library and knowledge center', category: 'library', lat: 17.7301191791835, lng: 83.3189352140935, keywords: 'library, knowledge center' },
  { id: 'c5',  name: 'Department of Electronics and Communication Engineering', description: 'Ece dept', category: 'academic', lat: 17.7302461024361, lng: 83.3195735869917, keywords: 'classes, ece classes, ece dept' },
  { id: 'c6',  name: 'The Digifac / Codeiam', description: 'Student club', category: 'innovation', lat: 17.7304350112897, lng: 83.3196758506032, keywords: 'classes, student classes, student dept' },
  { id: 'c7',  name: 'Nasscom', description: 'Center of excellence', category: 'innovation', lat: 17.7300483382667, lng: 83.3201623774823, keywords: 'nasscom' },
  { id: 'c8',  name: 'Department of Naval Architecture and Marine Engineering', description: 'Marine dept', category: 'academic', lat: 17.7305855479032, lng: 83.3199795425463, keywords: 'classes, marine classes, marine dept' },
  { id: 'c9',  name: 'Andhra University Incubation Hub (a - hub)', description: 'A hub', category: 'innovation', lat: 17.7322304155373, lng: 83.3211205911226, keywords: 'incubation, a hub' },
  { id: 'c10', name: 'Department of Instrumentation Engineering', description: 'Instrumentation dept', category: 'academic', lat: 17.7289058537745, lng: 83.3237052486849, keywords: 'classes, instrumentation classes, instrumentation dept' },
  { id: 'c11', name: 'Placement Office, Andhra University College of Engineering', description: 'Placements office', category: 'administration', lat: 17.7284941749465, lng: 83.3225091103808, keywords: 'classes, placements classes, placements dept' },
  { id: 'c12', name: 'Department of Chemical Engineering', description: 'Chemical dept', category: 'academic', lat: 17.7284394869141, lng: 83.3217037106461, keywords: 'classes, chemical classes, chemical dept' },
  { id: 'c13', name: 'Department of Civil Engineering', description: 'Civil dept', category: 'academic', lat: 17.7272682745528, lng: 83.3198814160729, keywords: 'classes, civil classes, civil dept' },
  { id: 'c14', name: 'Department of Metallurgical Engineering', description: 'Metallurical dept', category: 'academic', lat: 17.7276765088209, lng: 83.3194545418147, keywords: 'classes, metallurgical classes, metallurical dept' },
  { id: 'c15', name: 'Department of Mechanical Engineering', description: 'Mech dept', category: 'academic', lat: 17.7279179854716, lng: 83.3190125403997, keywords: 'classes, mech classes, mech dept' },
  { id: 'c16', name: 'Department of Electrical and Electronics Engineering', description: 'Eee dept', category: 'academic', lat: 17.728915212601, lng: 83.3184097688413, keywords: 'classes, eee classes, eee dept' },
  { id: 'c17', name: 'Department of Geo-Engineering', description: 'Geo dept', category: 'academic', lat: 17.7267789910535, lng: 83.3208858268795, keywords: 'classes, geo classes, geo dept' },
  { id: 'c18', name: 'New Class Room Complex', description: 'Ncrc', category: 'academic', lat: 17.7291552315372, lng: 83.3174018230348, keywords: 'classes, ncrc classes, ncrc' },
  { id: 'c19', name: 'Siemens Centre of Excellence Andhra University', description: 'Skill development center', category: 'innovation', lat: 17.728311430328, lng: 83.3194497404863, keywords: 'siemens centre of excellence andhra university' },
  { id: 'c20', name: 'Examination Block', description: 'Examination hall', category: 'administration', lat: 17.7284263978216, lng: 83.3187470017059, keywords: 'classes, examination classes, examination dept' },
  { id: 'c21', name: 'A U Health Centre', description: 'Hospital', category: 'health', lat: 17.7272789125115, lng: 83.3207601770985, keywords: 'hospital, health center' },
  { id: 'c22', name: 'Department of Architecture', description: 'Arch dept', category: 'academic', lat: 17.7263939774306, lng: 83.3201321417151, keywords: 'classes, arch classes, arch dept' },
  { id: 'c23', name: 'Hotspot', description: 'Hotspot canteen', category: 'food', lat: 17.729055663928, lng: 83.3190576113853, keywords: 'classes, hotspot classes, hotspot dept' },
  { id: 'c24', name: 'CSE Breeze', description: 'Cse canteen', category: 'food', lat: 17.7299953217735, lng: 83.3179877563838, keywords: 'classes, cse classes, cse dept' },
  { id: 'c25', name: 'Chemical Dept Canteen', description: 'Chem canteen', category: 'food', lat: 17.728593701316, lng: 83.3210688133808, keywords: 'dept canteen, chem canteen' },
  { id: 'c26', name: 'Mechanical Dept Canteen', description: 'Mech canteen', category: 'food', lat: 17.727728743949, lng: 83.3192392846236, keywords: 'dept canteen, mech canteen' },
  { id: 'c27', name: 'Union Bank', description: 'ATM', category: 'bank', lat: 17.7280779602653, lng: 83.3208692137961, keywords: 'bank, atm' },
  { id: 'c28', name: 'Indian Institute of Petroleum and Energy', description: 'IPE', category: 'academic', lat: 17.7335826788892, lng: 83.3202205748435, keywords: 'classes, ipe classes, ipe' },
  { id: 'c29', name: 'Dr YVS Murty Auditorium', description: 'Auditorium', category: 'entertainment', lat: 17.7318531066938, lng: 83.3206013627947, keywords: 'classes, auditorium classes, auditorium' },
  { id: 'c30', name: 'AUCE Basketball Court', description: 'BB court', category: 'sports', lat: 17.7300423160455, lng: 83.3204820113914, keywords: 'basketball court, bb court' },
  { id: 'c31', name: 'AUCE Volleyball Court', description: 'Volleyball court', category: 'sports', lat: 17.7293954073385, lng: 83.3203711850379, keywords: 'volleyball court' },
  { id: 'c32', name: 'Administrative Office', description: 'Principal office', category: 'administration', lat: 17.7286564669053, lng: 83.3198227366575, keywords: 'classes, principal classes, principle dept' },
  { id: 'c33', name: 'A.U Engineering College Ground', description: 'Ground', category: 'sports', lat: 17.7296815207826, lng: 83.3219599960119, keywords: 'au ground, ground' },
  { id: 'c34', name: 'Bezawada Ruchulu', description: 'Canteen', category: 'food', lat: 17.7295749466663, lng: 83.3197548432895, keywords: 'canteen, food' },
  { id: 'c35', name: 'Department of Engineering Chemistry (Applied Chemistry)', description: 'Chem dept', category: 'academic', lat: 17.72826255, lng: 83.32025062, keywords: 'classes, dept classes, chem dept' },
  { id: 'c36', name: 'AU Girls Hostel', description: 'Girls hostel', category: 'hostel', lat: 17.72952719, lng: 83.32436513, keywords: 'hostel, rooms, girls hostel' },
  { id: 'c37', name: 'AU College of Engineering Hostel (Boys)', description: 'Boys hostel', category: 'hostel', lat: 17.7299352, lng: 83.32819633, keywords: 'hostel, rooms, boys hostel' },
  { id: 'c38', name: 'Samatha Hostel', description: 'Boys hostel', category: 'hostel', lat: 17.73106253, lng: 83.32698714, keywords: 'hostel, rooms, boys hostel' },
  { id: 'c39', name: 'PG Block Boys Hostel', description: 'Boys hostel', category: 'hostel', lat: 17.73249818, lng: 83.32355416, keywords: 'hostel, rooms, boys hostel' },
  { id: 'c40', name: 'Block 6, Isaac Newton Boys Hostel', description: 'Boys hostel', category: 'hostel', lat: 17.73159537, lng: 83.32523795, keywords: 'hostel, rooms, boys hostel' },
  { id: 'c41', name: 'Swami Vivekanand Boys Hostel (Block-7)', description: 'Boys hostel', category: 'hostel', lat: 17.73078649, lng: 83.32493836, keywords: 'hostel, rooms, boys hostel' },
];

// ─── Indoor Locations (from cleaned_navigation.xlsx) ─────────────────────────
const INDOOR_LOCATIONS = [
  { id: 'i1',  name: 'CSE Lab 1', category: 'lab', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lab 1', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter through the main gate. The lab is directly opposite the entrance', landmark: 'CSE Main entrance', keywords: 'lab' },
  { id: 'i2',  name: 'CSE Lab 2', category: 'lab', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lab 2', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter through the main gate, go to the 1st floor. The lab is seen on the left', landmark: 'CSE Main entrance', keywords: 'lab' },
  { id: 'i3',  name: 'Dr. A. Gauthami Latha', category: 'cabin', building: 'Algorithm', floor: 'Third Floor', room: 'Cab 1', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of algorithm building, go to the 3rd floor, to the left, go straight for a few steps, to your left opposite to the steps is madams cabin', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i4',  name: 'Dr. Sandhya Devi Gogula', category: 'cabin', building: 'Algorithm', floor: 'Third Floor', room: 'Cab 2', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i5',  name: 'Dr. B. Prakash', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 3', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i6',  name: 'Dr. D. Paul Joseph', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 4', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i7',  name: 'Dr. Y. Vishnu Tej', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 5', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i8',  name: 'Mrs. A. Tulasi', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 6', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i9',  name: 'Mrs. Sweta Balakrishna Ramteke', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 7', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i10', name: 'Mrs. S. Priyanja', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 8', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i11', name: 'Mr. B.J.M. Ravi Kumar', category: 'cabin', building: 'Algorithm', floor: 'Ground Floor', room: 'Cab 9', department: 'CSE', lat: 17.7303316611071, lng: 83.318212078584, entrance: 'Enter from Algorithm Main Gate', steps: 'Enter through the main gate of the Algorithm building, go straight and then left, keep going straight till the very end', landmark: 'Algorithm main entrance', keywords: 'cabin, faculty' },
  { id: 'i12', name: 'Prof. Ch. Satyananda Reddy', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 10', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the last room just beside the office entrance side to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i13', name: 'Dept Office', category: 'office', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Office', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the second last room just beside the office entrance side to the left.', landmark: 'CSE Main entrance', keywords: 'office, admin' },
  { id: 'i14', name: 'Prof. M. Shashi', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 11', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the second room on the left side', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i15', name: 'Dr. S. Jhansi Rani', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 12', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the first room on the left side', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i16', name: 'Student Counselling Center / Lobby', category: 'office', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lobby', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the last room to the right just beside the office entrance.', landmark: 'CSE Main entrance', keywords: 'office, counselling, lobby' },
  { id: 'i17', name: 'HOD Cabin', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 13', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the second last room to the right just beside the office entrance.', landmark: 'CSE Main entrance', keywords: 'cabin, hod, head of department' },
  { id: 'i18', name: 'Prof. K. Venkata Rao', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 14', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the second room to the right.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i19', name: 'Dr. K. Raja Kumar', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 15', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go left — it\'s the first room to the right.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i22', name: 'Prof. D. Lalitha Bhaskari', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 16', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the 1st room after the black gate to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i23', name: 'Computer Engineering Workshop Lab', category: 'lab', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lab 3', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the 2nd room after the stairs to the left.', landmark: 'CSE Main entrance', keywords: 'lab, workshop' },
  { id: 'i24', name: 'Embedded Systems and IOT Lab', category: 'lab', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lab 4', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the 3rd room after the stairs to the right.', landmark: 'CSE Main entrance', keywords: 'lab, iot, embedded' },
  { id: 'i25', name: 'E - Class Room', category: 'classroom', building: 'CSE Main Building', floor: 'Ground Floor', room: 'E-Class', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the 4th room after the stairs to the right.', landmark: 'CSE Main entrance', keywords: 'classroom, e-class' },
  { id: 'i26', name: 'Computer Architecture and Organization Lab', category: 'lab', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Lab 5', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the 4th room after the stairs to the left.', landmark: 'CSE Main entrance', keywords: 'lab, computer architecture' },
  { id: 'i27', name: 'Smt. K.S.S. Soujanya Kumari', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 17', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the last room after the stairs to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i28', name: 'Mr. M. Bala Naga Bhushanamu', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 22', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the last room after the stairs to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i29', name: 'Mrs. L. Yamini Swathi', category: 'cabin', building: 'CSE Main Building', floor: 'Ground Floor', room: 'Cab 18', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance go right — it is the last room after the stairs to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i30', name: 'Projects Lab', category: 'lab', building: 'CSE Main Building', floor: 'First Floor', room: 'Lab 6', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the last room before the faculty washroom to the left.', landmark: 'CSE Main entrance', keywords: 'lab, projects' },
  { id: 'i31', name: 'Prof. Prasad Reddy P.V.G.D.', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 19', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the third room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i32', name: 'Dr. G. Lavanya Devi', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 20', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the second room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i33', name: 'Prof. Kunjam Nageswara Rao', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 21', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the 1st room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i34', name: 'Mrs. N. Padmaja Lavanya Kumari', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 23', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go right — it\'s the 1st room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i35', name: 'Dr. G. Sharmila Sujatha', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 24', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go right — it\'s the 2nd room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i36', name: 'Prof. Kuda Nageswara Rao', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 25', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go right — it\'s the 3rd room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i37', name: 'Dr. A. Mary Sowjanya', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 26', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the 2nd last room to the right before faculty washroom.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i38', name: 'Prof. V. Valli Kumari', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 27', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the 3rd room to the right.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i39', name: 'Prof. S. Viziananda Row', category: 'cabin', building: 'CSE Main Building', floor: 'First Floor', room: 'Cab 28', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the 1st room to the right.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i41', name: 'R & D Lab', category: 'lab', building: 'CSE Main Building', floor: 'First Floor', room: 'Lab 5', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from main entrance, take stairs to the left, go to 1st floor, go left — it\'s the last room to the right before faculty washroom.', landmark: 'CSE Main entrance', keywords: 'lab, r&d, research' },
  { id: 'i42', name: 'Dr. K. Venkata Ramana', category: 'cabin', building: 'CSE Main Building', floor: 'Second Floor', room: 'Cab 29', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance, take stairs to the left, go to the 2nd floor, go right — it\'s the 1st room to the left.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
  { id: 'i43', name: 'Prof. B. Prajna', category: 'cabin', building: 'CSE Main Building', floor: 'Second Floor', room: 'Cab 30', department: 'CSE', lat: 17.7299687494293, lng: 83.318021708325, entrance: 'Enter from Dept Main gate', steps: 'Enter from the main entrance, take stairs to the left, go to the 2nd floor, go right — it\'s the 1st room to the right.', landmark: 'CSE Main entrance', keywords: 'cabin, faculty' },
];

// ─── Category configs ─────────────────────────────────────────────────────────
const CAMPUS_CAT = {
  academic:       { icon: 'school-outline',        color: '#2471A3', label: 'Academic'   },
  library:        { icon: 'library-outline',        color: '#117A65', label: 'Library'    },
  innovation:     { icon: 'bulb-outline',           color: '#784212', label: 'Innovation' },
  administration: { icon: 'business-outline',       color: '#6C3483', label: 'Admin'      },
  health:         { icon: 'medkit-outline',         color: '#C0392B', label: 'Health'     },
  food:           { icon: 'restaurant-outline',     color: '#D68910', label: 'Food'       },
  bank:           { icon: 'card-outline',           color: '#1A5276', label: 'Bank'       },
  entertainment:  { icon: 'musical-notes-outline',  color: '#7D6608', label: 'Events'     },
  sports:         { icon: 'football-outline',       color: '#1E8449', label: 'Sports'     },
  hostel:         { icon: 'home-outline',           color: '#5D6D7E', label: 'Hostel'     },
};

const INDOOR_CAT = {
  classroom:      { icon: 'school-outline',    color: '#2471A3', label: 'Classroom' },
  lab:            { icon: 'flask-outline',     color: '#117A65', label: 'Lab'       },
  cabin:          { icon: 'person-outline',    color: '#6C3483', label: 'Faculty'   },
  washroom:       { icon: 'water-outline',     color: '#5D6D7E', label: 'Washroom'  },
  office:         { icon: 'briefcase-outline', color: '#784212', label: 'Office'    },
  'seminar hall': { icon: 'people-outline',    color: '#C0392B', label: 'Seminar'   },
};

// ─── Campus Location Card ─────────────────────────────────────────────────────
const CampusCard = ({ loc, onPress }) => {
  const cat = CAMPUS_CAT[loc.category] || { icon: 'location-outline', color: COLORS.primary };
  return (
    <TouchableOpacity style={st.locCard} onPress={() => onPress(loc)} activeOpacity={0.85}>
      <View style={[st.locIcon, { backgroundColor: cat.color + '18' }]}>
        <Ionicons name={cat.icon} size={20} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.locName} numberOfLines={1}>{loc.name}</Text>
        <Text style={st.locMeta}>{loc.description}</Text>
      </View>
      <Ionicons name="navigate-circle-outline" size={26} color={COLORS.accent} />
    </TouchableOpacity>
  );
};

// ─── Indoor Location Card ─────────────────────────────────────────────────────
const IndoorCard = ({ loc, onPress }) => {
  const catKey = (loc.category || '').toLowerCase();
  const cat = INDOOR_CAT[catKey] || { icon: 'location-outline', color: COLORS.primary };
  return (
    <TouchableOpacity style={st.locCard} onPress={() => onPress(loc)} activeOpacity={0.85}>
      <View style={[st.locIcon, { backgroundColor: cat.color + '18' }]}>
        <Ionicons name={cat.icon} size={20} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.locName} numberOfLines={1}>{loc.name}</Text>
        <Text style={st.locMeta}>{loc.building}  ·  {loc.floor}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
// ✅ CHANGE: Accept `navigation` prop from React Navigation stack
export default function NavigationScreen({ navigation }) {
  const [tab,    setTab]    = useState('campus');   // 'campus' | 'CSE Indoor'
  const [search, setSearch] = useState('');

  // ✅ CHANGE: Instead of setSelected, push to NavigationDetailScreen
  const openDetail = (loc, type) => {
    navigation.navigate('NavigationDetailScreen', { location: loc, type });
  };

  // ── Filtered campus list ────────────────────────────────────────────────────
  const filteredCampus = CAMPUS_LOCATIONS.filter(l => {
    const q = search.toLowerCase().trim();
    return !q || l.name.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) || l.keywords.toLowerCase().includes(q);
  });

  // ── Filtered indoor list ────────────────────────────────────────────────────
  const filteredIndoor = INDOOR_LOCATIONS.filter(l => {
    const q = search.toLowerCase().trim();
    return !q || l.name.toLowerCase().includes(q) ||
      l.building.toLowerCase().includes(q) || l.floor.toLowerCase().includes(q) ||
      (l.room || '').toLowerCase().includes(q) || (l.department || '').toLowerCase().includes(q) ||
      (l.landmark || '').toLowerCase().includes(q) || (l.keywords || '').toLowerCase().includes(q);
  });

  const currentList = tab === 'campus' ? filteredCampus : filteredIndoor;
  const resultCount = currentList.length;

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={st.header}>
        <Text style={st.headerTitle}>Campus Map</Text>
        <Text style={st.headerSub}>Navigate Andhra University · {CAMPUS_LOCATIONS.length + INDOOR_LOCATIONS.length} locations</Text>
      </LinearGradient>

      <View style={st.body}>
        {/* Search */}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search locations, rooms, faculty..." />

        {/* Tab switcher */}
        <View style={st.tabSwitcher}>
          <TouchableOpacity
            style={[st.tabBtn, tab === 'campus' && st.tabBtnActive]}
            onPress={() => { setTab('campus'); setSearch(''); }}
            activeOpacity={0.8}
          >
            <Text style={[st.tabBtnTxt, tab === 'campus' && st.tabBtnTxtActive]}>
              Campus  ({CAMPUS_LOCATIONS.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tabBtn, tab === 'CSE Indoor' && st.tabBtnActive]}
            onPress={() => { setTab('CSE Indoor'); setSearch(''); }}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={15} color={tab === 'CSE Indoor' ? COLORS.secondary : COLORS.textSecondary} />
            <Text style={[st.tabBtnTxt, tab === 'CSE Indoor' && st.tabBtnTxtActive]}>
              CSE Indoor  ({INDOOR_LOCATIONS.length})
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={st.resultCount}>{resultCount} location{resultCount !== 1 ? 's' : ''} found</Text>

        <FlatList
          key={tab}
          data={currentList}
          keyExtractor={i => i.id}
          renderItem={({ item }) =>
            tab === 'campus'
              ? <CampusCard  loc={item} onPress={l => openDetail(l, 'campus')} />
              : <IndoorCard  loc={item} onPress={l => openDetail(l, 'indoor')} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.list}
          ListEmptyComponent={
            <View style={st.emptyWrap}>
              <Ionicons name="search-outline" size={38} color={COLORS.textMuted} />
              <Text style={st.emptyTxt}>No locations found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bgLight },
  header:       { paddingTop: 62, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  headerTitle:  { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:    { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  body:         { flex: 1, padding: SPACING.md, gap: SPACING.sm },

  tabSwitcher:     { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.full, padding: 3, borderWidth: 1, borderColor: COLORS.cardBorder },
  tabBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: RADIUS.full },
  tabBtnActive:    { backgroundColor: COLORS.primary },
  tabBtnTxt:       { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTxtActive: { color: COLORS.secondary },

  resultCount: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textMuted },
  list:        { paddingBottom: 100 },
  emptyWrap:   { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt:    { fontSize: FONTS.sizes.md, color: COLORS.textMuted, fontWeight: '600' },

  locCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 7, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder, gap: SPACING.sm },
  locIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  locName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  locMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
});