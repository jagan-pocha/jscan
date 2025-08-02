import React, { useState } from 'react';
import './TemplateBuilder.css';

const TemplateBuilder = ({ template, setTemplate }) => {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');

  const addField = () => {
    if (newFieldName.trim()) {
      const newTemplate = { ...template };

      if (newFieldType === 'object') {
        newTemplate[newFieldName] = {
          type: 'object',
          properties: {}
        };
      } else if (newFieldType === 'array') {
        newTemplate[newFieldName] = {
          type: 'array',
          items: { type: 'string' }
        };
      } else {
        newTemplate[newFieldName] = { type: newFieldType };
      }

      setTemplate(newTemplate);
      setNewFieldName('');
    }
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
      "hobbies": { type: "array" },
      "metadata": {
        type: "object",
        properties: {
          "createdAt": { type: "string" },
          "updatedAt": { type: "string" }
        }
      }
    };
    setTemplate(sampleTemplate);
  };

  const clearTemplate = () => {
    setTemplate({});
  };

  const removeField = (fieldName) => {
    const newTemplate = { ...template };
    delete newTemplate[fieldName];
    setTemplate(newTemplate);
  };

  const updateFieldType = (fieldName, newType) => {
    const newTemplate = { ...template };
    if (newType === 'object') {
      newTemplate[fieldName] = {
        type: 'object',
        properties: {}
      };
    } else if (newType === 'array') {
      newTemplate[fieldName] = {
        type: 'array',
        items: { type: 'string' }
      };
    } else {
      newTemplate[fieldName] = { type: newType };
    }
    setTemplate(newTemplate);
  };

  const addNestedField = (parentField, childName, childType) => {
    if (childName.trim()) {
      const newTemplate = { ...template };
      if (!newTemplate[parentField].properties) {
        newTemplate[parentField].properties = {};
      }
      
      if (childType === 'object') {
        newTemplate[parentField].properties[childName] = {
          type: 'object',
          properties: {}
        };
      } else {
        newTemplate[parentField].properties[childName] = { type: childType };
      }
      
      setTemplate(newTemplate);
    }
  };

  const renderField = (fieldName, fieldConfig, level = 0, parentPath = '') => {
    const currentPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    
    return (
      <div key={currentPath} className={`field-item level-${level}`}>
        <div className="field-header">
          <span className="field-name">{fieldName}</span>
          <select 
            value={fieldConfig.type}
            onChange={(e) => updateFieldType(fieldName, e.target.value)}
            className="field-type-select"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
          <button 
            onClick={() => removeField(fieldName)}
            className="remove-btn"
          >
            ✕
          </button>
        </div>
        
        {fieldConfig.type === 'object' && (
          <div className="nested-fields">
            {fieldConfig.properties && Object.keys(fieldConfig.properties).map(nestedField =>
              renderField(nestedField, fieldConfig.properties[nestedField], level + 1, currentPath)
            )}
            <NestedFieldAdder 
              onAdd={(name, type) => addNestedField(fieldName, name, type)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="template-builder">
      <div className="template-header">
        <h2>📝 Template Builder</h2>
        <div className="template-actions">
          <button onClick={loadSampleTemplate} className="sample-template-btn">
            📋 Sample
          </button>
          <button onClick={clearTemplate} className="clear-template-btn">
            🗑️ Clear
          </button>
        </div>
      </div>
      
      <div className="add-field-section">
        <div className="add-field-form">
          <input
            type="text"
            placeholder="Field name"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            className="field-name-input"
            onKeyPress={(e) => e.key === 'Enter' && addField()}
          />
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
            className="field-type-select"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
          <button onClick={addField} className="add-btn">
            + Add Field
          </button>
        </div>
      </div>

      <div className="fields-list">
        {Object.keys(template).map(fieldName =>
          renderField(fieldName, template[fieldName])
        )}
      </div>

      <div className="template-preview">
        <h3>📋 Current Template</h3>
        <pre className="json-preview">
          {JSON.stringify(template, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const NestedFieldAdder = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('string');

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name, type);
      setName('');
    }
  };

  return (
    <div className="nested-field-adder">
      <input
        type="text"
        placeholder="Nested field name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="nested-field-input"
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="nested-field-type"
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="object">Object</option>
      </select>
      <button onClick={handleAdd} className="nested-add-btn">
        +
      </button>
    </div>
  );
};

export default TemplateBuilder;
