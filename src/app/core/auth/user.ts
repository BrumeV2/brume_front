/** Réponse de `GET /api/users/me` (UserResponseDto côté brume_back). */
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}
