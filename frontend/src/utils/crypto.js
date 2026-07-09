import SHA256 from "crypto-js/sha256";

// SHA256 no es reversible; login compara hashes, no desencripta.
export const hashPassword = (password) => {
  return SHA256(password).toString();
};
