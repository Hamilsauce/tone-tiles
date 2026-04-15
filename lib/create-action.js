export const createAction = (type, schema) => {
  return (props = {}) => {
    if (schema) {
      for (const [key, validator] of Object.entries(schema)) {
        const value = props[key];
        
        const isValid =
          typeof validator === 'function' ?
          validator(value) :
          value instanceof validator;
        
        if (!isValid) {
          throw new Error(
            `[Action Validation Failed] ${type}.${key}\n` +
            `Value: ${value}\nExpected: ${validator.name || 'custom validator'}`
          );
        }
      }
    }
    
    return { type, ...props };
  };
};