import SHA256 from "crypto-js/sha256";

/**
 * Nota: SHA256 es una función de hash de una vía (one-way). 
 * No se puede "desencriptar". Para validar contraseñas, 
 * hasheamos la entrada del usuario y comparamos los hashes.
 */
export const hashPassword = (password) => {
  return SHA256(password).toString();
};
