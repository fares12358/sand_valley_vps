const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
export const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());

/** Returns the first problem as a friendly message, or null when all fields are present. */
export const missingField = (body, fields) => {
    for (const f of fields) {
        if (!isNonEmptyString(body?.[f])) return `${f} is required`;
    }
    return null;
};
