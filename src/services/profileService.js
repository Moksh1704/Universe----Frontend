import { apiRequest } from '../../api/api';
import BASE_URL from '../../api/config';
import { getToken } from '../../api/storage';

export const fetchProfile = () => apiRequest('/users/me');

export const uploadProfilePicture = async (uri) => {
  const token = await getToken();
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'profile.jpg' });
  const res = await fetch(`${BASE_URL}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
};
