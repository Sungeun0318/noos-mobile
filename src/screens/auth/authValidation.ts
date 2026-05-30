const loginIdPattern = /^[A-Za-z0-9]{4,20}$/;

interface ApiErrorLike {
  status: number;
  code: string;
  detail?: string;
}

export interface SignupValidationInput {
  loginId: string;
  password: string;
  passwordConfirm: string;
  displayName: string;
  agreed: boolean;
}

export interface SignupValidationErrors {
  loginId?: string;
  password?: string;
  passwordConfirm?: string;
  displayName?: string;
  agreed?: string;
}

export function validateLoginId(loginId: string) {
  return loginIdPattern.test(loginId);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export function validateSignupInput(input: SignupValidationInput): SignupValidationErrors {
  const errors: SignupValidationErrors = {};

  if (!validateLoginId(input.loginId)) {
    errors.loginId = '아이디는 4~20자 영숫자로 입력해 주세요';
  }

  if (!validatePassword(input.password)) {
    errors.password = '비밀번호는 8자 이상이어야 해요';
  }

  if (input.password !== input.passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않아요';
  }

  if (!input.displayName.trim()) {
    errors.displayName = '표시 이름을 입력해 주세요';
  }

  if (!input.agreed) {
    errors.agreed = '약관에 동의해야 가입할 수 있어요';
  }

  return errors;
}

export function hasSignupErrors(errors: SignupValidationErrors) {
  return Object.keys(errors).length > 0;
}

export function authErrorMessage(error: unknown, intent: 'login' | 'signup') {
  if (!isApiErrorLike(error)) {
    return '잠시 후 다시 시도해주세요';
  }

  if (error.status === 0) {
    return '네트워크 연결을 확인하고 다시 시도해주세요';
  }

  if (intent === 'login' && (error.status === 400 || error.status === 401)) {
    return '아이디 또는 비밀번호가 일치하지 않아요';
  }

  if (intent === 'signup' && error.status === 409 && error.code === 'LOGIN_ID_TAKEN') {
    return '이미 사용 중인 아이디예요';
  }

  if (intent === 'signup' && error.status === 400) {
    return '입력한 정보를 다시 확인해주세요';
  }

  if (error.status >= 500) {
    return '잠시 후 다시 시도해주세요';
  }

  return error.detail || '잠시 후 다시 시도해주세요';
}

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    'code' in error &&
    typeof (error as { status?: unknown }).status === 'number' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}
