/**
 * useForm - Hook genérico para gerenciamento de formulários
 * 
 * Simplifica gerenciamento de estado e validação de formulários
 * 
 * @module hooks/useForm
 */

import { useState, useCallback } from 'react';

export default function useForm(initialValues = {}, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Atualiza valor de um campo
   */
  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando for editado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Atualiza múltiplos valores de uma vez
   */
  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  /**
   * Marca campo como tocado (blur)
   */
  const setFieldTouched = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  /**
   * Valida um campo específico
   */
  const validateField = useCallback((field) => {
    if (validators[field]) {
      const error = validators[field](values[field], values);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
        return false;
      }
    }
    return true;
  }, [values, validators]);

  /**
   * Valida todos os campos
   */
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    Object.keys(validators).forEach(field => {
      const error = validators[field](values[field], values);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validators]);

  /**
   * Reset do formulário
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Submete o formulário
   */
  const handleSubmit = useCallback(async (onSubmit) => {
    const isValid = validateForm();
    
    if (!isValid) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFormValues,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    handleSubmit
  };
}
