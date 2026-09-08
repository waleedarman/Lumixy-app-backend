import { useId, useState } from 'react';
import { IconEye, IconEyeOff } from '../icons/AdminIcons';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  error?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  required,
  autoComplete,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div className={`field password-input ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={inputId}>
        {label}
        {required ? <span className="field__required">*</span> : null}
      </label>
      <div className="password-input__control">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          className="password-input__toggle"
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
      {error ? (
        <span className="field-error" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
