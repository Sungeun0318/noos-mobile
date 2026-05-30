import { describe, expect, it } from 'vitest';

import {
  authErrorMessage,
  hasSignupErrors,
  validateLoginId,
  validatePassword,
  validateSignupInput,
} from '@/screens/auth/authValidation';

describe('auth validation', () => {
  it('validates login id format', () => {
    expect(validateLoginId('user01')).toBe(true);
    expect(validateLoginId('abc')).toBe(false);
    expect(validateLoginId('user_01')).toBe(false);
  });

  it('validates password minimum length', () => {
    expect(validatePassword('dummy-pass')).toBe(true);
    expect(validatePassword('short')).toBe(false);
  });

  it('returns signup field errors without exposing password values', () => {
    const errors = validateSignupInput({
      agreed: false,
      displayName: '',
      loginId: 'bad_id',
      password: 'short',
      passwordConfirm: 'different',
    });

    expect(hasSignupErrors(errors)).toBe(true);
    expect(errors).toMatchObject({
      agreed: '약관에 동의해야 가입할 수 있어요',
      displayName: '표시 이름을 입력해 주세요',
      loginId: '아이디는 4~20자 영숫자로 입력해 주세요',
      password: '비밀번호는 8자 이상이어야 해요',
      passwordConfirm: '비밀번호가 일치하지 않아요',
    });
  });

  it('maps login auth errors to safe messages', () => {
    expect(authErrorMessage({ status: 401, code: 'BAD_CREDENTIALS' }, 'login')).toBe(
      '아이디 또는 비밀번호가 일치하지 않아요',
    );
    expect(authErrorMessage({ status: 0, code: 'NETWORK_ERROR' }, 'login')).toBe(
      '네트워크 연결을 확인하고 다시 시도해주세요',
    );
  });

  it('maps signup auth errors to safe messages', () => {
    expect(authErrorMessage({ status: 409, code: 'LOGIN_ID_TAKEN' }, 'signup')).toBe(
      '이미 사용 중인 아이디예요',
    );
    expect(authErrorMessage({ status: 500, code: 'SERVER_ERROR' }, 'signup')).toBe(
      '잠시 후 다시 시도해주세요',
    );
  });
});
