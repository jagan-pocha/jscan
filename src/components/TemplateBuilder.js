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
      setIsValidTemplate(true);
      setTemplateError('');
      setTemplate(parsed);
    } catch (error) {
      setIsValidTemplate(false);
      setTemplateError(error.message);
    }
  };

  const handleTemplateChange = (e) => {
    const value = e.target.value;
    setTemplateText(value);
    validateAndUpdateTemplate(value);
  };

  const loadSampleTemplate = () => {
    const sampleTemplate = {
      "name": { type: "string" },
      "age": { type: "number" },
      "email": { type: "string" },
      "isActive": { type: "boolean" },
      "address": {
        type: "object",
        properties: {
          "street": { type: "string" },
          "city": { type: "string" },
          "zipCode": { type: "string" }
        }
      },
      "hobbies": {
        type: "array",
        items: { type: "string" }
      },
      "skills": {
        type: "array",
        items: {
          type: "object",
          properties: {
            "name": { type: "string" },
            "level": { type: "number" },
            "certified": { type: "boolean" }
          }
        }
      },
      "metadata": {
        type: "object",
        properties: {
          "createdAt": { type: "string" },
          "updatedAt": { type: "string" }
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
          </div>
        )}
        {isValidTemplate && templateText.trim() && (
          <div className="template-valid">
            <strong>Valid Template</strong> ({Object.keys(template).length} properties)
          </div>
        )}
        {!templateText.trim() && (
          <div className="template-empty">
            Paste your JSON template structure here
          </div>
        )}
      </div>

      <div className="template-input-container">
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
  );
};

export default TemplateBuilder;
