import { Role } from '../../common/interfaces/role.enum';

export class AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export class AuthResponseDto {
  user: AuthUserDto;
}
