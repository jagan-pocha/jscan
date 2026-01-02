import React, { useState, useEffect } from 'react';
import './TemplateBuilder.css';

const TemplateBuilder = ({ template, setTemplate }) => {
  const [templateText, setTemplateText] = useState('');
  const [isValidTemplate, setIsValidTemplate] = useState(true);
  const [templateError, setTemplateError] = useState('');

  useEffect(() => {
    if (template && Object.keys(template).length > 0) {
      setTemplateText(JSON.stringify(template, null, 2));
    }
  }, [template]);

  const validateAndUpdateTemplate = (input) => {
    if (!input.trim()) {
      setIsValidTemplate(true);
      setTemplateError('');
      setTemplate({});
      return;
    }

    try {
      const parsed = JSON.parse(input);

      // Validate that template is an object (not array, string, number, etc.)
      if (typeof parsed !== 'object' || parsed === null) {
        setIsValidTemplate(false);
        setTemplateError('Template must be a valid JSON object');
        setTemplate({});
        return;
      }

      // If array is provided, take first element (for backwards compatibility)
      const normalized = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;

      // Validate template structure
      const validationError = validateTemplateStructure(normalized);
      if (validationError) {
        setIsValidTemplate(false);
        setTemplateError(validationError);
        setTemplate({});
        return;
      }

      setIsValidTemplate(true);
      setTemplateError('');
      setTemplate(normalized);
    } catch (error) {
      setIsValidTemplate(false);
      setTemplateError(error.message);
      setTemplate({});
    }
  };

  const validateTemplateStructure = (template) => {
    if (typeof template !== 'object' || template === null || Array.isArray(template)) {
      return 'Template must be a JSON object';
    }

    // Check if template has at least one field
    if (Object.keys(template).length === 0) {
      return 'Template cannot be empty';
    }

    // Validate each field has a type
    for (const key in template) {
      const field = template[key];
      if (typeof field !== 'object' || field === null) {
        return `Field "${key}" must have a type definition object`;
      }
      if (!field.type) {
        return `Field "${key}" is missing a "type" property`;
      }

      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validTypes.includes(field.type)) {
        return `Field "${key}" has invalid type "${field.type}". Valid types: ${validTypes.join(', ')}`;
      }

      // Validate object type has properties
      if (field.type === 'object' && !field.properties) {
        return `Field "${key}" with type "object" must have a "properties" definition`;
      }

      // Validate array type has items
      if (field.type === 'array' && !field.items) {
        return `Field "${key}" with type "array" must have an "items" definition`;
      }

      // Recursively validate nested objects
      if (field.type === 'object' && field.properties) {
        const nestedError = validateTemplateStructure(field.properties);
        if (nestedError) {
          return `In "${key}": ${nestedError}`;
        }
      }

      // Validate array items
      if (field.type === 'array' && field.items) {
        if (field.items.type === 'object' && field.items.properties) {
          const nestedError = validateTemplateStructure(field.items.properties);
          if (nestedError) {
            return `In "${key}" items: ${nestedError}`;
          }
        }
      }
    }

    return null; // No errors
  };

  const handleTemplateChange = (e) => {
    const value = e.target.value;
    setTemplateText(value);
    validateAndUpdateTemplate(value);
  };

  const loadSampleTemplate = () => {
    const sampleTemplate = {
      "name": { "type": "string" },
      "age": { "type": "number" },
      "email": { "type": "string" },
      "isActive": { "type": "boolean" },
      "address": {
        "type": "object",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" },
          "zipCode": { "type": "string" }
        }
      },
      "hobbies": {
        "type": "array",
        "items": { "type": "string" }
      },
      "skills": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "level": { "type": "number" },
            "certified": { "type": "boolean" }
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "createdAt": { "type": "string" },
          "updatedAt": { "type": "string" }
        }
      }
    };
    const templateStr = JSON.stringify(sampleTemplate, null, 2);
    setTemplateText(templateStr);
    setTemplate(sampleTemplate);
    setIsValidTemplate(true);
    setTemplateError('');
  };

  const clearTemplate = () => {
    setTemplateText('');
    setTemplate({});
    setIsValidTemplate(true);
    setTemplateError('');
  };

  const formatTemplate = () => {
    if (isValidTemplate && templateText.trim()) {
      try {
        const parsed = JSON.parse(templateText);
        const formatted = JSON.stringify(parsed, null, 2);
        setTemplateText(formatted);
      } catch (error) {
        // Error already handled in validateAndUpdateTemplate
      }
    }
  };


  return (
    <div className="template-builder">
      <div className="template-header">
        <h2>Template Definition</h2>
        <div className="template-actions">
          <button onClick={formatTemplate} className="format-template-btn" disabled={!isValidTemplate}>
            Format
          </button>
          <button onClick={loadSampleTemplate} className="sample-template-btn">
            Sample
          </button>
          <button onClick={clearTemplate} className="clear-template-btn">
            Clear
          </button>
        </div>
      </div>

      <div className="template-status">
        {!isValidTemplate && (
          <div className="template-error">
            <strong>Template Error:</strong> {templateError}
            {templateError.includes('line') && templateError.includes('column') && (
              <div className="error-location">
                💡 Look at the line numbers on the left to find the error location
              </div>
            )}
          </div>
        )}
        {isValidTemplate && templateText.trim() && (
          <div className="template-valid">
            <strong>Valid Template</strong>
          </div>
        )}
        {!templateText.trim() && (
          <div className="template-empty">
            Paste your JSON template structure here
          </div>
        )}
      </div>

      <div className="template-input-container">
        <div className="textarea-with-lines">
          <div className="line-numbers">
            {templateText.split('\n').map((_, index) => (
              <div key={index} className="line-number">
                {index + 1}
              </div>
            ))}
          </div>
          <textarea
            value={templateText}
            onChange={handleTemplateChange}
            placeholder={`Paste your JSON template here...

Example:
{
  "name": { "type": "string" },
  "age": { "type": "number" },
  "isActive": { "type": "boolean" },
  "address": {
    "type": "object",
    "properties": {
      "street": { "type": "string" },
      "city": { "type": "string" }
    }
  },
  "skills": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "level": { "type": "number" }
      }
    }
  }
}`}
            className={`template-textarea ${!isValidTemplate ? 'error' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
