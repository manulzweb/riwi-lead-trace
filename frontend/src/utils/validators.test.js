import { describe, it, expect } from 'vitest';
import { isValidEmail, hasDangerousChars, escapeHtml } from './validators';

describe('Validators', () => {
  describe('isValidEmail', () => {
    it('debería retornar true para correos válidos', () => {
      expect(isValidEmail('usuario@example.com')).toBe(true);
      expect(isValidEmail('test.123@sub.domain.org')).toBe(true);
    });

    it('debería retornar false para correos inválidos', () => {
      expect(isValidEmail('usuario')).toBe(false);
      expect(isValidEmail('usuario@.com')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('hasDangerousChars', () => {
    it('debería retornar true si hay caracteres peligrosos', () => {
      expect(hasDangerousChars('<script>')).toBe(true);
      expect(hasDangerousChars('DROP TABLE;')).toBe(false);
      expect(hasDangerousChars('alert("xss")')).toBe(true);
    });

    it('debería retornar false si es texto seguro', () => {
      expect(hasDangerousChars('Juan Perez')).toBe(false);
      expect(hasDangerousChars('juan@example.com')).toBe(false);
      expect(hasDangerousChars('Texto normal 123')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('debería escapar caracteres HTML básicos', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
    });

    it('debería manejar strings vacíos', () => {
      expect(escapeHtml('')).toBe('');
      // escapeHtml(str = "") por defecto devuelve "" si pasas undefined
      expect(escapeHtml(undefined)).toBe('');
    });
  });
});
