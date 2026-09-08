import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type BaseFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

type InputFieldProps = BaseFieldProps & {
  as?: 'input';
} & InputHTMLAttributes<HTMLInputElement>;

type TextareaFieldProps = BaseFieldProps & {
  as: 'textarea';
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

type SelectFieldProps = BaseFieldProps & {
  as: 'select';
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, error, hint, required, as = 'input', ...rest } = props;

  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span className="field__label">
        {label}
        {required ? <span className="field__required">*</span> : null}
      </span>
      {as === 'textarea' ? (
        <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : as === 'select' ? (
        <select {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}>
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
