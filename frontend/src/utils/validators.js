export const isValidEmail = (email) => {
    const emailRegex = /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/
    return emailRegex.test(email)
}

export const hasDangerousChars = (text) => {
    const dangerousChars = /[<>&|\/]/;
    return dangerousChars.test(text);
}

export const escapeHtml = (str = "") => {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const getEmailRules = (required = true) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "El correo es requerido" }] : []),
  { validate: (val) => val && val.length > 254, errorMessage: "El correo es demasiado largo" },
  { validate: (val) => val && hasDangerousChars(val), errorMessage: "El correo contiene caracteres no permitidos" },
  { validate: (val) => val && !isValidEmail(val), errorMessage: "Correo no válido" }
];

export const getPasswordRules = (required = true) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "La contraseña es requerida" }] : []),
  { validate: (val) => val && val.length < 6, errorMessage: "La contraseña debe tener al menos 6 caracteres" },
  { validate: (val) => val && val.length > 128, errorMessage: "La contraseña excede el límite" },
  { validate: (val) => val && hasDangerousChars(val), errorMessage: "La contraseña contiene caracteres no permitidos" }
];

export const getNameRules = (required = true) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "El campo es obligatorio" }] : []),
  { validate: (val) => val && hasDangerousChars(val), errorMessage: "Caracteres no permitidos" }
];

export const getTitleRules = (required = true) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "El título es obligatorio" }] : []),
  { validate: (val) => val && val.length < 3, errorMessage: "El título debe tener al menos 3 caracteres" },
  { validate: (val) => val && val.length > 120, errorMessage: "El título es demasiado largo (máx. 120)" },
];

export const getDescriptionRules = (required = true) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "La descripción es obligatoria" }] : []),
  { validate: (val) => val && val.length > 500, errorMessage: "La descripción es demasiado larga (máx. 500)" },
];

export const getDateRules = (required = false) => [
  ...(required ? [{ validate: (val) => !val, errorMessage: "La fecha es obligatoria" }] : []),
  {
    validate: (val) => {
      if (!val) return false;
      const selected = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected < today;
    },
    errorMessage: "La fecha no puede ser anterior a hoy"
  }
];