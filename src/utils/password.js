export const PASSWORD_RULE_TEXT = 'Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.'

export function validatePassword(password) {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
}
