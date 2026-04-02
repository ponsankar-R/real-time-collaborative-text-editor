export interface User {
  id: number;
  google_id?: string;
  email: string;
  name: string;
  avatar: string;
  created_at?: string;
}

export interface Document {
  id: string;
  title: string;
  content: any;
  owner_id: number;
  owner_name: string;
  owner_avatar: string;
  owner_email?: string;
  permission: 'owner' | 'editor' | 'viewer';
  collaborator_count: number;
  created_at: string;
  updated_at: string;
}

export interface Collaborator extends User {
  permission: 'owner' | 'editor' | 'viewer';
  granted_at: string;
  granted_by?: number;
}

export interface SharePermission {
  email: string;
  permission: 'editor' | 'viewer';
}

export interface AwarenessUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { start: number; end: number };
  line?: number;
}

export interface AuthResponse {
  id: number;
  email: string;
  name: string;
  avatar: string;
}

export interface ApiError {
  error: string;
  message?: string;
}