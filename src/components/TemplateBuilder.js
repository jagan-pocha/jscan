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

  const updateArrayItemType = (arrayPath, itemType) => {
    const newTemplate = { ...template };
    const pathParts = arrayPath.split('.');
    const fieldName = pathParts.pop();

    // Navigate to parent object
    let current = newTemplate;
    for (const part of pathParts) {
      if (current[part] && current[part].type === 'object') {
        current = current[part].properties;
      }
    }

    // Update array item type
    if (current[fieldName] && current[fieldName].type === 'array') {
      if (itemType === 'object') {
        current[fieldName].items = {
          type: 'object',
          properties: {}
        };
      } else {
        current[fieldName].items = { type: itemType };
      }
    }

    setTemplate(newTemplate);
  };

  const removeField = (fieldPath) => {
    const newTemplate = { ...template };
    const pathParts = fieldPath.split('.');
    const fieldName = pathParts.pop();

    // Navigate to parent object
    let current = newTemplate;
    for (const part of pathParts) {
      if (current[part] && current[part].type === 'object') {
        current = current[part].properties;
      }
    }

    // Remove the field
    delete current[fieldName];
    setTemplate(newTemplate);
  };

  const updateFieldType = (fieldPath, newType) => {
    const newTemplate = { ...template };
    const pathParts = fieldPath.split('.');
    const fieldName = pathParts.pop();

    // Navigate to parent object
    let current = newTemplate;
    for (const part of pathParts) {
      if (current[part] && current[part].type === 'object') {
        current = current[part].properties;
      }
    }

    // Update the field type
    if (newType === 'object') {
      current[fieldName] = {
        type: 'object',
        properties: {}
      };
    } else if (newType === 'array') {
      current[fieldName] = {
        type: 'array',
        items: { type: 'string' }
      };
    } else {
      current[fieldName] = { type: newType };
    }
    setTemplate(newTemplate);
  };

  const addNestedField = (parentPath, childName, childType) => {
    if (childName.trim()) {
      const newTemplate = { ...template };

      // Navigate to the correct nested object
      const pathParts = parentPath.split('.');
      let current = newTemplate;

      for (const part of pathParts) {
        if (!current[part]) return; // Path doesn't exist

        if (part === 'items' && current.type === 'array') {
          // Handle array items
          if (!current.items) {
            current.items = { type: 'object', properties: {} };
          }
          if (!current.items.properties) {
            current.items.properties = {};
          }
          current = current.items.properties;
        } else if (current[part] && current[part].type === 'object') {
          if (!current[part].properties) {
            current[part].properties = {};
          }
          current = current[part].properties;
        } else {
          return; // Not an object type
        }
      }

      // Add the new field
      if (childType === 'object') {
        current[childName] = {
          type: 'object',
          properties: {}
        };
      } else {
        current[childName] = { type: childType };
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
            onChange={(e) => updateFieldType(currentPath, e.target.value)}
            className="field-type-select"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
          <button
            onClick={() => removeField(currentPath)}
            className="remove-btn"
          >
            ✕
          </button>
        </div>
        
        {fieldConfig.type === 'object' && (
          <div className="nested-fields">
            <div className="nested-header">
              <span className="nested-title">Object Properties:</span>
            </div>
            {fieldConfig.properties && Object.keys(fieldConfig.properties).map(nestedField =>
              renderField(nestedField, fieldConfig.properties[nestedField], level + 1, currentPath)
            )}
            <NestedFieldAdder
              onAdd={(name, type) => addNestedField(currentPath, name, type)}
            />
          </div>
        )}

        {fieldConfig.type === 'array' && (
          <div className="nested-fields">
            <div className="nested-header">
              <span className="nested-title">Array Item Type:</span>
              <select
                value={fieldConfig.items?.type || 'string'}
                onChange={(e) => updateArrayItemType(currentPath, e.target.value)}
                className="array-item-type-select"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
              </select>
            </div>

            {fieldConfig.items?.type === 'object' && (
              <div className="array-object-fields">
                <div className="nested-title">Object Structure in Array:</div>
                {fieldConfig.items.properties && Object.keys(fieldConfig.items.properties).map(nestedField =>
                  renderField(nestedField, fieldConfig.items.properties[nestedField], level + 1, `${currentPath}.items`)
                )}
                <NestedFieldAdder
                  onAdd={(name, type) => addNestedField(`${currentPath}.items`, name, type)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="template-builder">
      <div className="template-header">
        <h2>Template Builder</h2>
        <div className="template-actions">
          <button onClick={loadSampleTemplate} className="sample-template-btn">
            Sample
          </button>
          <button onClick={clearTemplate} className="clear-template-btn">
            Clear
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
        <h3>Current Template</h3>
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
